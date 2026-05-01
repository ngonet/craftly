import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Uuid } from '../../../packages/shared/src/schemas/common.js';
import { loadEnv } from '../src/config/env.js';
import { getPrismaClient } from '../src/infrastructure/prisma/client.js';

type ParsedArgs = {
  filePath: string;
  userId: string;
};

type ImportRow = Record<string, string>;

type ShopifyContext = {
  handle: string;
  title: string;
  imageSrc: string;
  status: string;
};

type ProductSeedInput = {
  name: string;
  costoBase: string;
  priceSale: string;
  stock: number;
  imageUrl: string | null;
};

type ImportStats = {
  totalRows: number;
  transformedRows: number;
  insertedRows: number;
  duplicateRowsInFile: number;
  duplicateRowsInDatabase: number;
  skippedRows: number;
};

const HANDLE_COLUMN = 'Handle';
const TITLE_COLUMN = 'Title';
const OPTION_VALUE_COLUMN = 'Option1 Value';
const IMAGE_SRC_COLUMN = 'Image Src';
const PRICE_COLUMN = 'Variant Price';
const STATUS_COLUMN = 'Status';
const DEFAULT_STOCK = 0;

function parseArgs(argv: readonly string[]): ParsedArgs {
  let filePath: string | null = null;
  let userId: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const currentArg = argv[index];
    if (currentArg === '--file') {
      filePath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (currentArg === '--user-id') {
      userId = argv[index + 1] ?? userId;
      index += 1;
    }
  }

  if (!filePath) {
    throw new Error(
      'missing required argument --file <path>. Example: ' +
        'npm run db:seed --workspace @craftly/api -- --file /tmp/products.tsv ' +
        '--user-id <uuid>',
    );
  }

  if (!userId) {
    throw new Error(
      'missing required argument --user-id <uuid>. Example: ' +
        'npm run db:seed --workspace @craftly/api -- --file /tmp/products.tsv ' +
        '--user-id bedaeb3e-644a-4587-a3d5-891ffde92634',
    );
  }

  const parsedUserId = Uuid.safeParse(userId);
  if (!parsedUserId.success) {
    throw new Error(`invalid user id: ${userId}`);
  }

  return {
    filePath: resolve(filePath),
    userId: parsedUserId.data,
  };
}

function detectDelimiter(source: string): string {
  const firstLine = source.split(/\r?\n/u, 1)[0] ?? '';
  const tabCount = firstLine.split('\t').length;
  const commaCount = firstLine.split(',').length;
  return tabCount >= commaCount ? '\t' : ',';
}

function parseDelimitedText(source: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const currentChar = source[index] ?? '';
    const nextChar = source[index + 1] ?? '';

    if (currentChar === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && currentChar === delimiter) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if (!inQuotes && currentChar === '\n') {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      continue;
    }

    if (!inQuotes && currentChar === '\r') {
      continue;
    }

    currentCell += currentChar;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function normalizeCell(value: string | undefined): string {
  return (value ?? '').trim();
}

function rowsToRecords(rows: string[][]): ImportRow[] {
  const [headerRow, ...dataRows] = rows;
  if (!headerRow || headerRow.length === 0) {
    throw new Error('the input file has no header row');
  }

  const headers = headerRow.map((header) => normalizeCell(header));

  return dataRows
    .filter((row) => row.some((cell) => normalizeCell(cell).length > 0))
    .map((row) => {
      const record: ImportRow = {};
      for (let index = 0; index < headers.length; index += 1) {
        const header = headers[index];
        if (!header) {
          continue;
        }

        record[header] = normalizeCell(row[index]);
      }
      return record;
    });
}

function parsePrice(rawPrice: string): string | null {
  const normalized = rawPrice.replace(/\s+/gu, '').replace(',', '.');
  if (normalized.length === 0) {
    return null;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return numeric.toFixed(2);
}

function parseImageUrl(rawUrl: string): string | null {
  if (rawUrl.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    return parsed.toString();
  } catch (error) {
    console.warn({ rawUrl, error }, 'seed: invalid image URL, using null');
    return null;
  }
}

function buildContext(
  row: ImportRow,
  previousContext: ShopifyContext | null,
): ShopifyContext | null {
  const handle = row[HANDLE_COLUMN] || previousContext?.handle || '';
  if (handle.length === 0) {
    return previousContext;
  }

  return {
    handle,
    title: row[TITLE_COLUMN] || previousContext?.title || '',
    imageSrc: row[IMAGE_SRC_COLUMN] || previousContext?.imageSrc || '',
    status: row[STATUS_COLUMN] || previousContext?.status || '',
  };
}

function transformRows(rows: ImportRow[]): {
  products: ProductSeedInput[];
  stats: Omit<ImportStats, 'insertedRows' | 'duplicateRowsInDatabase'>;
} {
  const products: ProductSeedInput[] = [];
  const seenNames = new Set<string>();
  let previousContext: ShopifyContext | null = null;
  let skippedRows = 0;
  let duplicateRowsInFile = 0;

  for (const row of rows) {
    const context = buildContext(row, previousContext);
    previousContext = context;

    const title = context?.title ?? '';
    const optionValue = row[OPTION_VALUE_COLUMN] || '';
    const variantPrice = parsePrice(row[PRICE_COLUMN] || '');

    if (title.length === 0 || optionValue.length === 0 || !variantPrice) {
      skippedRows += 1;
      continue;
    }

    const name = `${title} - ${optionValue}`;
    if (seenNames.has(name)) {
      duplicateRowsInFile += 1;
      continue;
    }

    seenNames.add(name);
    products.push({
      name,
      costoBase: variantPrice,
      priceSale: variantPrice,
      stock: DEFAULT_STOCK,
      imageUrl: parseImageUrl(row[IMAGE_SRC_COLUMN] || context?.imageSrc || ''),
    });
  }

  return {
    products,
    stats: {
      totalRows: rows.length,
      transformedRows: products.length,
      duplicateRowsInFile,
      skippedRows,
    },
  };
}

async function ensureUserExists(
  prisma: ReturnType<typeof getPrismaClient>,
  userId: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error(
      `user ${userId} does not exist in local users table; authenticate once ` +
        'or seed the user before importing products',
    );
  }
}

async function importProducts(
  prisma: ReturnType<typeof getPrismaClient>,
  userId: string,
  products: ProductSeedInput[],
  baseStats: Omit<ImportStats, 'insertedRows' | 'duplicateRowsInDatabase'>,
): Promise<ImportStats> {
  const existingProducts = await prisma.product.findMany({
    where: { userId },
    select: { name: true },
  });

  const existingNames = new Set(existingProducts.map((product) => product.name));
  const productsToCreate = products.filter((product) => !existingNames.has(product.name));
  const duplicateRowsInDatabase = products.length - productsToCreate.length;

  if (productsToCreate.length > 0) {
    await prisma.product.createMany({
      data: productsToCreate.map((product) => ({
        userId,
        name: product.name,
        costoBase: product.costoBase,
        priceSale: product.priceSale,
        stock: product.stock,
        imageUrl: product.imageUrl,
      })),
    });
  }

  return {
    ...baseStats,
    insertedRows: productsToCreate.length,
    duplicateRowsInDatabase,
  };
}

function printSummary(userId: string, filePath: string, stats: ImportStats): void {
  const summaryLines = [
    '✅ Product import finished',
    `- userId: ${userId}`,
    `- file: ${filePath}`,
    `- rows read: ${stats.totalRows}`,
    `- rows transformed: ${stats.transformedRows}`,
    `- rows inserted: ${stats.insertedRows}`,
    `- duplicates in file: ${stats.duplicateRowsInFile}`,
    `- duplicates in database: ${stats.duplicateRowsInDatabase}`,
    `- rows skipped: ${stats.skippedRows}`,
  ];

  for (const line of summaryLines) {
    console.info(line);
  }
}

async function main(): Promise<void> {
  loadEnv();
  const { filePath, userId } = parseArgs(process.argv.slice(2));
  const fileContents = await readFile(filePath, 'utf8');
  const delimiter = detectDelimiter(fileContents);
  const parsedRows = parseDelimitedText(fileContents, delimiter);
  const records = rowsToRecords(parsedRows);
  const { products, stats: transformStats } = transformRows(records);

  const prisma = getPrismaClient();

  try {
    await ensureUserExists(prisma, userId);
    const finalStats = await importProducts(prisma, userId, products, transformStats);
    printSummary(userId, filePath, finalStats);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(`❌ Product import failed: ${error.message}`);
  } else {
    console.error('❌ Product import failed with an unknown error');
  }
  process.exitCode = 1;
});
