import { extraPriceLabel, groupBody, selectionLabel, sortGroups, sortOptions, summaryHint } from '@/components/options/optionGroupText'
import type { MenuOption, OptionGroup } from '@/lib/types'

function option(over: Partial<MenuOption> = {}): MenuOption {
  return { id: 1, groupId: 1, name: 'Less', extraPrice: 0, sortOrder: 1, isActive: true, isIced: false, ...over }
}

function group(over: Partial<OptionGroup> = {}): OptionGroup {
  return {
    id: 1,
    name: 'Ice level',
    selectionType: 'single',
    isRequired: true,
    maxSelect: 1,
    sortOrder: 1,
    needsIcedDrink: true,
    summaryNoun: null,
    options: [],
    ...over
  }
}

describe('selectionLabel', () => {
  it('says "Pick one" for a single-choice group whatever maxSelect holds', () => {
    expect(selectionLabel({ selectionType: 'single', maxSelect: 1 })).toBe('Pick one')
  })

  it('says how many a multiple-choice group allows', () => {
    expect(selectionLabel({ selectionType: 'multiple', maxSelect: 3 })).toBe('Pick up to 3')
  })
})

describe('extraPriceLabel', () => {
  it('shows a dash for a free option', () => {
    expect(extraPriceLabel(0)).toBe('—')
  })

  it('keeps the sign on a surcharge and a discount', () => {
    expect(extraPriceLabel(0.5)).toBe('+$0.50')
    expect(extraPriceLabel(-0.5)).toBe('-$0.50')
  })
})

describe('summaryHint', () => {
  it('is null without a summary noun', () => {
    expect(summaryHint({ summaryNoun: null, options: [option()] })).toBeNull()
    expect(summaryHint({ summaryNoun: '  ', options: [option()] })).toBeNull()
  })

  it('reads the noun after the first option, in option order', () => {
    const options = [option({ id: 2, name: 'Normal', sortOrder: 2 }), option({ id: 1, name: 'Less', sortOrder: 1 })]
    expect(summaryHint({ summaryNoun: 'ice', options })).toBe('Shown as "Less ice"')
  })

  it('falls back when the group has no options yet', () => {
    expect(summaryHint({ summaryNoun: 'ice', options: [] })).toBe('Shown after the option name: "… ice"')
  })
})

describe('sortGroups / sortOptions', () => {
  it('orders by sortOrder, then by name', () => {
    const groups = [
      group({ id: 3, name: 'Sugar', sortOrder: 2 }),
      group({ id: 1, name: 'Shots', sortOrder: 2 }),
      group({ id: 2, name: 'Ice level', sortOrder: 1 })
    ]
    expect(sortGroups(groups).map(g => g.name)).toEqual(['Ice level', 'Shots', 'Sugar'])
  })

  it('leaves the input array untouched', () => {
    const options = [option({ id: 2, name: 'Normal', sortOrder: 2 }), option({ id: 1, name: 'Less', sortOrder: 1 })]
    sortOptions(options)
    expect(options.map(o => o.id)).toEqual([2, 1])
  })
})

describe('groupBody', () => {
  const typed = {
    name: 'Ice level',
    selectionType: 'single' as const,
    isRequired: true,
    maxSelect: 7,
    sortOrder: 2,
    needsIcedDrink: true,
    summaryNoun: ' ice '
  }

  it('forces maxSelect to 1 for a single-choice group and trims the noun', () => {
    expect(groupBody(typed)).toEqual({
      name: 'Ice level',
      selectionType: 'single',
      isRequired: true,
      maxSelect: 1,
      sortOrder: 2,
      needsIcedDrink: true,
      summaryNoun: 'ice'
    })
  })

  it('keeps maxSelect for a multiple-choice group and sends null for an empty noun', () => {
    const body = groupBody({ ...typed, selectionType: 'multiple', maxSelect: 3, summaryNoun: '' })
    expect(body.maxSelect).toBe(3)
    expect(body.summaryNoun).toBeNull()
  })
})
