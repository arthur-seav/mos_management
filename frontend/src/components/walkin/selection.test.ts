import {
  buildLine,
  canAddToOrder,
  cashState,
  clampQuantity,
  defaultSelection,
  isGroupFull,
  isIcedDrink,
  isOptionDisabled,
  limitHint,
  lineLabels,
  lineTotal,
  missingGroups,
  optionIdsToSend,
  orderTotal,
  parseCash,
  priceLabel,
  toggleOption,
  unitPrice,
  visibleGroups,
  walkInBody,
  type Selection
} from '@/components/walkin/selection'
import {
  addOnsGroup,
  frappeCustomization,
  iceGroup,
  latteCustomization,
  latteGroups,
  sizeGroup,
  sweetnessGroup,
  temperatureGroup
} from '@/components/walkin/fixtures'
import type { CustomizationGroup } from '@/lib/types'

const names = (groups: CustomizationGroup[]) => groups.map(g => g.name)

/** Latte, hot: Medium + Hot + Regular sugar (the ice group is hidden). */
const hot: Selection = { 10: [102], 20: [201], 30: [302], 40: [402], 50: [] }
const iced: Selection = { ...hot, 20: [202] }

describe('defaults (TC-11)', () => {
  it('starts every group on the admin default', () => {
    expect(defaultSelection(latteGroups)).toEqual({ 10: [102], 20: [201], 30: [302], 40: [402], 50: [] })
  })

  it('leaves a group empty when its default is not offered any more', () => {
    const noDefault = { ...sizeGroup, defaultOptionId: 999 }
    expect(defaultSelection([noDefault])).toEqual({ 10: [] })
  })
})

describe('BR-01 ice level only for iced drinks', () => {
  it('hides the ice group while the drink is hot', () => {
    expect(isIcedDrink(latteGroups, hot)).toBe(false)
    expect(names(visibleGroups(latteGroups, hot))).toEqual(['Size', 'Temperature', 'Sweetness', 'Add-ons'])
  })

  it('shows the ice group once Iced is chosen, and hides it again on Hot', () => {
    expect(isIcedDrink(latteGroups, iced)).toBe(true)
    expect(names(visibleGroups(latteGroups, iced))).toEqual([
      'Size',
      'Temperature',
      'Ice level',
      'Sweetness',
      'Add-ons'
    ])
    const backToHot = toggleOption(temperatureGroup, iced, 201)
    expect(names(visibleGroups(latteGroups, backToHot))).toEqual(['Size', 'Temperature', 'Sweetness', 'Add-ons'])
  })

  it('a drink with no temperature choice counts as iced', () => {
    const selection = defaultSelection(frappeCustomization.groups)
    expect(isIcedDrink(frappeCustomization.groups, selection)).toBe(true)
    expect(names(visibleGroups(frappeCustomization.groups, selection))).toEqual(['Size', 'Ice level'])
  })

  it('never sends the choice of a hidden group', () => {
    expect(optionIdsToSend(latteGroups, hot)).toEqual([102, 201, 402])
    expect(optionIdsToSend(latteGroups, iced)).toEqual([102, 202, 302, 402])
  })

  it('never prices a hidden group', () => {
    const pricedIce = { ...iceGroup, options: iceGroup.options.map(o => ({ ...o, extraPrice: 0.25 })) }
    const groups = [sizeGroup, temperatureGroup, pricedIce, sweetnessGroup]
    expect(unitPrice(3.0, groups, hot)).toBe(3.5)
    expect(unitPrice(3.0, groups, iced)).toBe(3.75)
  })
})

describe('BR-02 required groups and add-on limits', () => {
  it('names the required group that has no choice yet (TC-12)', () => {
    const groups = [{ ...sizeGroup, defaultOptionId: null }, sweetnessGroup]
    const empty = defaultSelection(groups)
    expect(names(missingGroups(groups, empty))).toEqual(['Size'])
    expect(canAddToOrder(groups, empty)).toBe(false)

    const picked = toggleOption(groups[0], empty, 101)
    expect(missingGroups(groups, picked)).toEqual([])
    expect(canAddToOrder(groups, picked)).toBe(true)
  })

  it('a required single group cannot be emptied, an optional one can', () => {
    expect(toggleOption(sizeGroup, hot, 102)[10]).toEqual([102])
    const optional = { ...sizeGroup, isRequired: false }
    expect(toggleOption(optional, hot, 102)[10]).toEqual([])
  })

  it('choosing in a single group replaces the old choice', () => {
    expect(toggleOption(sizeGroup, hot, 103)[10]).toEqual([103])
  })

  it('stops at three add-ons and says why (TC-13)', () => {
    let selection = hot
    for (const id of [501, 502, 503]) selection = toggleOption(addOnsGroup, selection, id)
    expect(selection[50]).toEqual([501, 502, 503])
    expect(isGroupFull(addOnsGroup, selection)).toBe(true)

    const fourth = toggleOption(addOnsGroup, selection, 504)
    expect(fourth[50]).toEqual([501, 502, 503])
    expect(isOptionDisabled(addOnsGroup, addOnsGroup.options[3], selection)).toBe(true)
    expect(isOptionDisabled(addOnsGroup, addOnsGroup.options[0], selection)).toBe(false)
    expect(limitHint(addOnsGroup)).toBe('Up to 3 — remove one to change')

    const freed = toggleOption(addOnsGroup, selection, 501)
    expect(freed[50]).toEqual([502, 503])
    expect(toggleOption(addOnsGroup, freed, 504)[50]).toEqual([502, 503, 504])
  })
})

describe('BR-03 prices', () => {
  it("uses the drink's own size price plus the add-on (TC-14)", () => {
    let selection = toggleOption(sizeGroup, hot, 103)
    selection = toggleOption(addOnsGroup, selection, 501)
    expect(unitPrice(3.0, latteGroups, selection)).toBe(4.6)
    expect(lineTotal({ unitPrice: 4.6, quantity: 2 })).toBe(9.2)
  })

  it('adds up the ticket', () => {
    expect(orderTotal([{ unitPrice: 4.6, quantity: 2 }, { unitPrice: 2.5, quantity: 1 }])).toBe(11.7)
  })

  it('keeps quantity between 1 and 20', () => {
    expect(clampQuantity(0)).toBe(1)
    expect(clampQuantity(21)).toBe(20)
    expect(clampQuantity(3)).toBe(3)
  })

  it('prices a whole line from the drink and the choices', () => {
    let selection = toggleOption(temperatureGroup, hot, 202)
    selection = toggleOption(sizeGroup, selection, 103)
    selection = toggleOption(addOnsGroup, selection, 501)
    expect(buildLine(latteCustomization, selection, 2, 7)).toEqual({
      key: 7,
      productId: 1,
      name: 'Latte',
      optionIds: [103, 202, 302, 402, 501],
      labels: ['Large', 'Iced', 'Regular ice', 'Regular sugar', 'Oat milk'],
      unitPrice: 4.6,
      quantity: 2
    })
  })
})

describe('labels on the ticket', () => {
  it("adds the group's noun only when the name does not say it already", () => {
    expect(lineLabels(latteGroups, iced)).toEqual(['Medium', 'Iced', 'Regular ice', 'Regular sugar'])
    const noSugar = toggleOption(sweetnessGroup, iced, 401)
    expect(lineLabels(latteGroups, noSugar)).toEqual(['Medium', 'Iced', 'Regular ice', 'No sugar'])
  })
})

describe('prices on the option buttons', () => {
  it('a single group shows the difference from the current choice', () => {
    expect(priceLabel(sizeGroup, sizeGroup.options[0], hot)).toBe('-$0.50')
    expect(priceLabel(sizeGroup, sizeGroup.options[1], hot)).toBe('+$0.00')
    expect(priceLabel(sizeGroup, sizeGroup.options[2], hot)).toBe('+$0.50')

    const large = toggleOption(sizeGroup, hot, 103)
    expect(priceLabel(sizeGroup, sizeGroup.options[0], large)).toBe('-$1.00')
    expect(priceLabel(sizeGroup, sizeGroup.options[2], large)).toBe('+$0.00')
  })

  it('add-ons show their own price', () => {
    expect(priceLabel(addOnsGroup, addOnsGroup.options[0], hot)).toBe('+$0.60')
  })

  it('a group where every option is the same price shows no price', () => {
    expect(priceLabel(temperatureGroup, temperatureGroup.options[1], hot)).toBeNull()
    expect(priceLabel(iceGroup, iceGroup.options[0], iced)).toBeNull()
  })
})

describe('cash at the counter (FR-39, BR-13)', () => {
  it('leaves the change blank while the box is empty', () => {
    expect(parseCash('  ')).toBeNull()
    expect(cashState(9.2, '')).toEqual({ cash: null, change: null, short: false })
  })

  it('works out the change', () => {
    expect(cashState(9.2, '10')).toEqual({ cash: 10, change: 0.8, short: false })
  })

  it('flags cash under the total', () => {
    expect(cashState(9.2, '5')).toEqual({ cash: 5, change: -4.2, short: true })
  })
})

describe('the request body', () => {
  const line = { key: 1, productId: 1, name: 'Latte', optionIds: [103, 202, 302, 402, 501], labels: [], unitPrice: 4.6, quantity: 2 }

  it('sends only the lines when there is no note and no cash', () => {
    expect(walkInBody([line], '  ', '')).toEqual({
      lines: [{ productId: 1, optionIds: [103, 202, 302, 402, 501], quantity: 2 }]
    })
  })

  it('sends the trimmed note and the cash', () => {
    expect(walkInBody([line], '  No straw ', '10')).toEqual({
      lines: [{ productId: 1, optionIds: [103, 202, 302, 402, 501], quantity: 2 }],
      note: 'No straw',
      cashReceived: 10
    })
  })
})
