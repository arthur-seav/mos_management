/** What an option group and its options read like on screen (FR-26). Pure, so it can be unit tested. */

import { moneySigned } from '@/lib/format'
import type { MenuOption, OptionGroup } from '@/lib/types'

/** "Pick one" for a single-choice group, "Pick up to 3" for a multiple-choice one. */
export function selectionLabel(group: Pick<OptionGroup, 'selectionType' | 'maxSelect'>): string {
  return group.selectionType === 'single' ? 'Pick one' : `Pick up to ${group.maxSelect}`
}

/** The extra charge in the options table: a free option shows a dash, not "+$0.00". */
export function extraPriceLabel(extraPrice: number): string {
  return extraPrice === 0 ? '—' : moneySigned(extraPrice)
}

/** How a short option name reads in an order, e.g. 'Shown as "Less ice"'. Null when the group has no summary noun. */
export function summaryHint(group: Pick<OptionGroup, 'summaryNoun' | 'options'>): string | null {
  const noun = group.summaryNoun?.trim()
  if (!noun) return null
  const first = sortOptions(group.options)[0]
  return first ? `Shown as "${first.name} ${noun}"` : `Shown after the option name: "… ${noun}"`
}

/** The order the customer app shows groups in: sortOrder first, then name so the list never jumps. */
export function sortGroups(groups: OptionGroup[]): OptionGroup[] {
  return [...groups].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export function sortOptions(options: MenuOption[]): MenuOption[] {
  return [...options].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

/** The group body the API wants: a single-choice group can only ever allow one pick, so send 1 (the server forces it too). */
export function groupBody(form: {
  name: string
  selectionType: OptionGroup['selectionType']
  isRequired: boolean
  maxSelect: number
  sortOrder: number
  needsIcedDrink: boolean
  summaryNoun: string
}) {
  return {
    name: form.name,
    selectionType: form.selectionType,
    isRequired: form.isRequired,
    maxSelect: form.selectionType === 'single' ? 1 : form.maxSelect,
    sortOrder: form.sortOrder,
    needsIcedDrink: form.needsIcedDrink,
    summaryNoun: form.summaryNoun.trim() === '' ? null : form.summaryNoun.trim()
  }
}
