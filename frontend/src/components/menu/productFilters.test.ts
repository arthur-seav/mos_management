import { filterProducts } from '@/components/menu/productFilters'
import type { Product } from '@/lib/types'

const base: Product = {
  id: 0,
  categoryId: 1,
  categoryName: 'Coffee',
  name: '',
  description: null,
  imageUrl: '',
  basePrice: 3,
  isAvailable: true,
  isActive: true,
  createdAt: '2026-10-01T00:00:00Z'
}

// Mocha is on sale, Latte is sold out, Matcha Latte (Tea) was removed from the menu.
const mocha: Product = { ...base, id: 4, name: 'Mocha', isAvailable: true, isActive: true }
const latte: Product = { ...base, id: 5, name: 'Latte', isAvailable: false, isActive: true }
const matcha: Product = {
  ...base,
  id: 6,
  categoryId: 2,
  categoryName: 'Tea',
  name: 'Matcha Latte',
  isAvailable: true,
  isActive: false
}
const all = [mocha, latte, matcha]

const ids = (list: Product[]) => list.map(p => p.id)

describe('filterProducts', () => {
  it('keeps everything and the server order when nothing is chosen', () => {
    expect(ids(filterProducts(all, { categoryId: 'all', status: 'all', search: '' }))).toEqual([4, 5, 6])
  })

  it('filters by category', () => {
    expect(ids(filterProducts(all, { categoryId: 1, status: 'all', search: '' }))).toEqual([4, 5])
    expect(ids(filterProducts(all, { categoryId: 2, status: 'all', search: '' }))).toEqual([6])
  })

  it('separates on sale, sold out and removed', () => {
    expect(ids(filterProducts(all, { categoryId: 'all', status: 'on_sale', search: '' }))).toEqual([4])
    expect(ids(filterProducts(all, { categoryId: 'all', status: 'sold_out', search: '' }))).toEqual([5])
    expect(ids(filterProducts(all, { categoryId: 'all', status: 'removed', search: '' }))).toEqual([6])
  })

  it('searches the name, ignoring case and spaces around it', () => {
    expect(ids(filterProducts(all, { categoryId: 'all', status: 'all', search: '  LaTTe ' }))).toEqual([5, 6])
    expect(ids(filterProducts(all, { categoryId: 'all', status: 'all', search: 'pizza' }))).toEqual([])
  })

  it('applies category, status and search together', () => {
    expect(ids(filterProducts(all, { categoryId: 2, status: 'removed', search: 'latte' }))).toEqual([6])
    expect(ids(filterProducts(all, { categoryId: 1, status: 'removed', search: 'latte' }))).toEqual([])
  })
})
