const PRODUCTS_KEY = ['products'] as const;
const PRODUCT_LISTS_KEY = [...PRODUCTS_KEY, 'list'] as const;
const PRODUCT_DETAILS_KEY = [...PRODUCTS_KEY, 'detail'] as const;

export const productKeys = {
  all: PRODUCTS_KEY,
  lists: PRODUCT_LISTS_KEY,
  list: (search?: string) => [...PRODUCT_LISTS_KEY, { search }] as const,
  details: PRODUCT_DETAILS_KEY,
  detail: (id: string | undefined) => [...PRODUCT_DETAILS_KEY, id] as const,
};
