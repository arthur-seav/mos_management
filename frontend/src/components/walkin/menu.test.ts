import { pickerCategories, pickerProducts } from '@/components/walkin/menu'
import { ALL_PRODUCTS, COFFEE, FRAPPE, SEASONAL } from '@/components/walkin/fixtures'

const categories = [FRAPPE, COFFEE, SEASONAL]
const names = (products: { name: string }[]) => products.map(p => p.name)

describe('the walk-in picker menu', () => {
  it('lists the shown categories in the admin order', () => {
    expect(pickerCategories(categories).map(c => c.name)).toEqual(['Coffee', 'Frappe'])
  })

  it('leaves out deactivated drinks and drinks of a hidden category', () => {
    const shown = pickerProducts(ALL_PRODUCTS, { categories, categoryId: null, search: '' })
    expect(names(shown)).toEqual(['Americano', 'Espresso', 'Latte', 'Matcha Frappe'])
  })

  it('keeps a sold-out drink on screen so staff can see it (BR-05)', () => {
    const shown = pickerProducts(ALL_PRODUCTS, { categories, categoryId: null, search: '' })
    expect(shown.find(p => p.name === 'Espresso')!.isAvailable).toBe(false)
  })

  it('narrows by category', () => {
    const shown = pickerProducts(ALL_PRODUCTS, { categories, categoryId: FRAPPE.id, search: '' })
    expect(names(shown)).toEqual(['Matcha Frappe'])
  })

  it('searches by name, ignoring case and spaces', () => {
    const shown = pickerProducts(ALL_PRODUCTS, { categories, categoryId: null, search: '  LAT ' })
    expect(names(shown)).toEqual(['Latte'])
  })
})
