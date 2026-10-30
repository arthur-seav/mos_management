import type { ProductGroupSetting, ProductOptionsRequest } from '@/lib/types'

/**
 * What the Options card holds while the admin edits it. `price` is the raw text
 * of the "Price for this drink" box: empty means "use the group price"
 * (priceOverride null). A drink can have its own price for a shared option
 * (TC-14/TC-15: Large is +$1.00 on a Latte but +$0.50 on an Americano).
 */
export type OptionDraft = { optionId: number; offered: boolean; price: string }

export type GroupDraft = {
  groupId: number
  offered: boolean
  /** Kept from the server so saving does not re-activate a group the admin hid. */
  isActive: boolean
  defaultOptionId: number | null
  options: OptionDraft[]
}

/** Turns GET /products/{id}/options into editable drafts, in the server's order. */
export function draftsFromView(groups: ProductGroupSetting[]): GroupDraft[] {
  return groups.map(g => ({
    groupId: g.groupId,
    offered: g.offered,
    isActive: g.isActive,
    defaultOptionId: g.defaultOptionId,
    options: g.options.map(o => ({
      optionId: o.optionId,
      offered: o.offered,
      price: o.priceOverride === null ? '' : o.priceOverride.toFixed(2)
    }))
  }))
}

/** The price box accepts an empty value, or a number with up to 2 decimals, which may be negative. */
export function isPriceText(text: string): boolean {
  return /^-?\d+(\.\d{1,2})?$/.test(text.trim())
}

/**
 * The body of PUT /api/admin/products/{id}/options: only the groups the drink
 * offers, in group order, with their offered options and own prices.
 */
export function optionsRequest(drafts: GroupDraft[]): ProductOptionsRequest {
  return {
    groups: drafts
      .filter(g => g.offered)
      .map(g => ({
        groupId: g.groupId,
        isActive: g.isActive,
        defaultOptionId: g.defaultOptionId,
        options: g.options
          .filter(o => o.offered)
          .map(o => ({ optionId: o.optionId, priceOverride: o.price.trim() === '' ? null : Number(o.price.trim()) }))
      }))
  }
}

export type OptionsProblems = { errors: string[]; warnings: string[] }

/**
 * Checks the screen before saving, with the same rules as the server
 * (empty_group, bad_default). A required group without a default is only a
 * warning: the server allows it, the app then shows nothing pre-picked.
 */
export function optionsProblems(groups: ProductGroupSetting[], drafts: GroupDraft[]): OptionsProblems {
  const errors: string[] = []
  const warnings: string[] = []

  for (const group of groups) {
    const draft = drafts.find(d => d.groupId === group.groupId)
    if (!draft || !draft.offered) continue

    const offered = draft.options.filter(o => o.offered)
    if (offered.length === 0) errors.push(`${group.name}: offer at least one option.`)
    if (draft.defaultOptionId !== null && !offered.some(o => o.optionId === draft.defaultOptionId)) {
      errors.push(`${group.name}: the default must be an offered option.`)
    }
    for (const option of offered) {
      if (option.price.trim() !== '' && !isPriceText(option.price)) {
        const name = group.options.find(o => o.optionId === option.optionId)?.name ?? 'option'
        errors.push(`${group.name} / ${name}: use a price like 0.50 or leave it empty.`)
      }
    }
    if (group.isRequired && draft.defaultOptionId === null && offered.length > 0) {
      warnings.push(`${group.name} is required: pick a default so the app shows one chosen.`)
    }
  }

  return { errors, warnings }
}
