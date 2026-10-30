/** What the walk-in picker lists: the categories and drinks a staff member may tap. */

import type { Category, Product } from '@/lib/types'

/** Only categories the app shows, in the admin's order (FR-25). */
export function pickerCategories(categories: Category[]): Category[] {
  return categories.filter(c => c.active).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

/**
 * Drinks to show: never the deactivated ones, narrowed by the chosen category
 * and the search box. Sold-out drinks stay on screen so staff can tell the
 * customer, but they are greyed out and cannot be added (BR-05).
 */
export function pickerProducts(
  products: Product[],
  { categories, categoryId, search }: { categories: Category[]; categoryId: number | null; search: string }
): Product[] {
  const shown = new Set(pickerCategories(categories).map(c => c.id))
  const needle = search.trim().toLowerCase()
  return products
    .filter(p => p.isActive)
    .filter(p => shown.has(p.categoryId))
    .filter(p => categoryId === null || p.categoryId === categoryId)
    .filter(p => needle === '' || p.name.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name))
}
