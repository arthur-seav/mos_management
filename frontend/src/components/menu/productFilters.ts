import type { Product } from '@/lib/types'

/** The Status filter on the drinks list. "Removed from menu" = isActive false (FR-25). */
export type ProductStatusFilter = 'all' | 'on_sale' | 'sold_out' | 'removed'

export const PRODUCT_STATUS_CHOICES: { value: ProductStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'on_sale', label: 'On sale' },
  { value: 'sold_out', label: 'Sold out' },
  { value: 'removed', label: 'Removed from menu' }
]

export type ProductFilters = {
  /** 'all' or a category id. */
  categoryId: 'all' | number
  status: ProductStatusFilter
  search: string
}

/** True when the drink matches the Status filter (FR-22 sold out, FR-25 removed). */
function matchesStatus(product: Product, status: ProductStatusFilter): boolean {
  switch (status) {
    case 'on_sale':
      return product.isActive && product.isAvailable
    case 'sold_out':
      return product.isActive && !product.isAvailable
    case 'removed':
      return !product.isActive
    default:
      return true
  }
}

/** Filters the drinks list by category, status and name, keeping the server's order. */
export function filterProducts(products: Product[], { categoryId, status, search }: ProductFilters): Product[] {
  const needle = search.trim().toLowerCase()
  return products.filter(
    p =>
      (categoryId === 'all' || p.categoryId === categoryId) &&
      matchesStatus(p, status) &&
      (needle === '' || p.name.toLowerCase().includes(needle))
  )
}
