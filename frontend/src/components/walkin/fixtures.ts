/**
 * Test data only (imported by the walk-in tests): the small menu from the SA
 * test cases — Latte $3.00 with its own Large +$1.00 (TC-14), add-ons up to
 * three (TC-13), a hot/iced temperature choice (BR-01) and a frappé that has
 * no temperature choice at all.
 */

import type { Category, Customization, CustomizationGroup, Product } from '@/lib/types'

export const COFFEE: Category = { id: 1, name: 'Coffee', sortOrder: 1, active: true, productCount: 3 }
export const FRAPPE: Category = { id: 2, name: 'Frappe', sortOrder: 2, active: true, productCount: 1 }
export const SEASONAL: Category = { id: 3, name: 'Seasonal', sortOrder: 3, active: false, productCount: 1 }

function product(over: Partial<Product> & Pick<Product, 'id' | 'name' | 'basePrice'>): Product {
  return {
    categoryId: COFFEE.id,
    categoryName: COFFEE.name,
    description: null,
    imageUrl: '/uploads/drink.png',
    isAvailable: true,
    isActive: true,
    createdAt: '2026-10-01T00:00:00Z',
    ...over
  }
}

export const LATTE = product({ id: 1, name: 'Latte', basePrice: 3.0, description: 'Espresso with steamed milk' })
export const AMERICANO = product({ id: 2, name: 'Americano', basePrice: 2.5 })
/** BR-05: on the menu but sold out today. */
export const ESPRESSO = product({ id: 3, name: 'Espresso', basePrice: 2.0, isAvailable: false })
export const MATCHA_FRAPPE = product({
  id: 4,
  name: 'Matcha Frappe',
  basePrice: 4.0,
  categoryId: FRAPPE.id,
  categoryName: FRAPPE.name
})
/** Deactivated: never offered. */
export const OLD_MOCHA = product({ id: 5, name: 'Old Mocha', basePrice: 3.6, isActive: false })
/** Its category is hidden, so it is not offered either. */
export const PUMPKIN = product({ id: 6, name: 'Pumpkin Latte', basePrice: 4.2, categoryId: SEASONAL.id, categoryName: SEASONAL.name })

export const ALL_PRODUCTS = [LATTE, AMERICANO, ESPRESSO, MATCHA_FRAPPE, OLD_MOCHA, PUMPKIN]

/** Size for the Latte: Large is +$1.00 for this drink (TC-14). */
export const sizeGroup: CustomizationGroup = {
  id: 10,
  name: 'Size',
  selectionType: 'single',
  isRequired: true,
  maxSelect: 1,
  needsIcedDrink: false,
  summaryNoun: null,
  defaultOptionId: 102,
  options: [
    { id: 101, groupId: 10, name: 'Small', extraPrice: 0, isIced: false },
    { id: 102, groupId: 10, name: 'Medium', extraPrice: 0.5, isIced: false },
    { id: 103, groupId: 10, name: 'Large', extraPrice: 1.0, isIced: false }
  ]
}

export const temperatureGroup: CustomizationGroup = {
  id: 20,
  name: 'Temperature',
  selectionType: 'single',
  isRequired: true,
  maxSelect: 1,
  needsIcedDrink: false,
  summaryNoun: null,
  defaultOptionId: 201,
  options: [
    { id: 201, groupId: 20, name: 'Hot', extraPrice: 0, isIced: false },
    { id: 202, groupId: 20, name: 'Iced', extraPrice: 0, isIced: true }
  ]
}

/** BR-01: only for iced drinks. "Less" reads "Less ice" on the ticket. */
export const iceGroup: CustomizationGroup = {
  id: 30,
  name: 'Ice level',
  selectionType: 'single',
  isRequired: true,
  maxSelect: 1,
  needsIcedDrink: true,
  summaryNoun: 'ice',
  defaultOptionId: 302,
  options: [
    { id: 301, groupId: 30, name: 'Less', extraPrice: 0, isIced: false },
    { id: 302, groupId: 30, name: 'Regular', extraPrice: 0, isIced: false }
  ]
}

export const sweetnessGroup: CustomizationGroup = {
  id: 40,
  name: 'Sweetness',
  selectionType: 'single',
  isRequired: true,
  maxSelect: 1,
  needsIcedDrink: false,
  summaryNoun: 'sugar',
  defaultOptionId: 402,
  options: [
    { id: 401, groupId: 40, name: 'No sugar', extraPrice: 0, isIced: false },
    { id: 402, groupId: 40, name: 'Regular', extraPrice: 0, isIced: false }
  ]
}

/** TC-13: optional, up to three. */
export const addOnsGroup: CustomizationGroup = {
  id: 50,
  name: 'Add-ons',
  selectionType: 'multiple',
  isRequired: false,
  maxSelect: 3,
  needsIcedDrink: false,
  summaryNoun: null,
  defaultOptionId: null,
  options: [
    { id: 501, groupId: 50, name: 'Oat milk', extraPrice: 0.6, isIced: false },
    { id: 502, groupId: 50, name: 'Extra shot', extraPrice: 0.5, isIced: false },
    { id: 503, groupId: 50, name: 'Vanilla syrup', extraPrice: 0.4, isIced: false },
    { id: 504, groupId: 50, name: 'Caramel drizzle', extraPrice: 0.3, isIced: false }
  ]
}

export const latteGroups = [sizeGroup, temperatureGroup, iceGroup, sweetnessGroup, addOnsGroup]

export const latteCustomization: Customization = { product: LATTE, groups: latteGroups, lowestPrice: 3.0 }

/** No temperature choice anywhere, so it counts as iced and shows its ice group. */
export const frappeCustomization: Customization = {
  product: MATCHA_FRAPPE,
  groups: [sizeGroup, iceGroup],
  lowestPrice: 4.0
}
