import { draftsFromView, optionsProblems, optionsRequest, type GroupDraft } from '@/components/menu/productOptions'
import type { ProductGroupSetting } from '@/lib/types'

/** Size: required, one pick, Large costs this drink $0.50 instead of the group's $1.00 (TC-15). */
const size: ProductGroupSetting = {
  groupId: 1,
  name: 'Size',
  selectionType: 'single',
  isRequired: true,
  maxSelect: 1,
  offered: true,
  isActive: true,
  defaultOptionId: 11,
  options: [
    { optionId: 11, name: 'Regular', groupPrice: 0, offered: true, priceOverride: null, optionActive: true },
    { optionId: 12, name: 'Large', groupPrice: 1, offered: true, priceOverride: 0.5, optionActive: true }
  ]
}

/** Add-ons: not offered by this drink yet; Espresso shot is switched off menu-wide. */
const addons: ProductGroupSetting = {
  groupId: 2,
  name: 'Add-ons',
  selectionType: 'multiple',
  isRequired: false,
  maxSelect: 3,
  offered: false,
  isActive: true,
  defaultOptionId: null,
  options: [
    { optionId: 21, name: 'Oat milk', groupPrice: 0.6, offered: false, priceOverride: null, optionActive: true },
    { optionId: 22, name: 'Espresso shot', groupPrice: 0.8, offered: false, priceOverride: null, optionActive: false }
  ]
}

const view = [size, addons]

describe('draftsFromView', () => {
  it('puts the drink price in the box and leaves it empty when the group price is used', () => {
    expect(draftsFromView(view)).toEqual([
      {
        groupId: 1,
        offered: true,
        isActive: true,
        defaultOptionId: 11,
        options: [
          { optionId: 11, offered: true, price: '' },
          { optionId: 12, offered: true, price: '0.50' }
        ]
      },
      {
        groupId: 2,
        offered: false,
        isActive: true,
        defaultOptionId: null,
        options: [
          { optionId: 21, offered: false, price: '' },
          { optionId: 22, offered: false, price: '' }
        ]
      }
    ])
  })
})

describe('optionsRequest', () => {
  it('sends only offered groups and offered options, in group order, with numbers', () => {
    const drafts: GroupDraft[] = [
      {
        groupId: 1,
        offered: true,
        isActive: true,
        defaultOptionId: 12,
        options: [
          { optionId: 11, offered: true, price: '' },
          { optionId: 12, offered: true, price: '0.50' }
        ]
      },
      {
        groupId: 2,
        offered: true,
        isActive: false,
        defaultOptionId: null,
        options: [
          { optionId: 21, offered: true, price: '-0.25' },
          { optionId: 22, offered: false, price: '9.99' }
        ]
      }
    ]

    expect(optionsRequest(drafts)).toEqual({
      groups: [
        {
          groupId: 1,
          isActive: true,
          defaultOptionId: 12,
          options: [
            { optionId: 11, priceOverride: null },
            { optionId: 12, priceOverride: 0.5 }
          ]
        },
        { groupId: 2, isActive: false, defaultOptionId: null, options: [{ optionId: 21, priceOverride: -0.25 }] }
      ]
    })
  })

  it('leaves out a group the drink no longer offers', () => {
    const drafts = draftsFromView(view).map(g => (g.groupId === 1 ? { ...g, offered: false } : g))
    expect(optionsRequest(drafts)).toEqual({ groups: [] })
  })
})

describe('optionsProblems', () => {
  it('finds nothing wrong with the drink as the server sent it', () => {
    expect(optionsProblems(view, draftsFromView(view))).toEqual({ errors: [], warnings: [] })
  })

  it('an offered group needs at least one offered option', () => {
    const drafts = draftsFromView(view).map(g =>
      g.groupId === 2 ? { ...g, offered: true } : g
    )
    expect(optionsProblems(view, drafts).errors).toEqual(['Add-ons: offer at least one option.'])
  })

  it('the default must be an offered option', () => {
    const drafts = draftsFromView(view).map(g =>
      g.groupId === 1 ? { ...g, options: g.options.map(o => (o.optionId === 11 ? { ...o, offered: false } : o)) } : g
    )
    expect(optionsProblems(view, drafts).errors).toEqual(['Size: the default must be an offered option.'])
  })

  it('a price box must hold a price', () => {
    const drafts = draftsFromView(view).map(g =>
      g.groupId === 1 ? { ...g, options: g.options.map(o => (o.optionId === 12 ? { ...o, price: 'free' } : o)) } : g
    )
    expect(optionsProblems(view, drafts).errors).toEqual(['Size / Large: use a price like 0.50 or leave it empty.'])
  })

  it('a required group without a default is only a warning', () => {
    const drafts = draftsFromView(view).map(g => (g.groupId === 1 ? { ...g, defaultOptionId: null } : g))
    expect(optionsProblems(view, drafts)).toEqual({
      errors: [],
      warnings: ['Size is required: pick a default so the app shows one chosen.']
    })
  })
})
