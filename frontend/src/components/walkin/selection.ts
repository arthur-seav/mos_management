/**
 * The option rules for one drink on the walk-in screen, as plain functions:
 * BR-01 (an ice group only shows for an iced drink), BR-02 (one per required
 * group, add-ons up to the group's limit), BR-03 (base price + chosen options,
 * line total = unit × quantity).
 *
 * This mirrors the server's PricingService and the customer app, so the screen
 * never offers something the server would refuse. The server still recalculates
 * every price (NFR-07); what we show here is only for the staff member.
 */

import { moneySigned } from '@/lib/format'
import type { Customization, CustomizationGroup, CustomizationOption, WalkInRequest } from '@/lib/types'

/** Chosen option ids per group id. A group with no choice keeps an empty list. */
export type Selection = Record<number, number[]>

/** One drink on the order ticket, priced when it was added. */
export type TicketLine = {
  /** Stable key so two identical drinks stay two lines. */
  key: number
  productId: number
  name: string
  /** In group order, the ids the server is sent. */
  optionIds: number[]
  /** "Large", "Iced", "Less ice" — what the ticket shows under the name. */
  labels: string[]
  unitPrice: number
  quantity: number
}

export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 20

/** Money arithmetic on floats: keep cents exact so $3.00 + $0.60 is $3.60, not $3.5999999. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function chosenIds(selection: Selection, group: CustomizationGroup): number[] {
  return selection[group.id] ?? []
}

/** TC-11: every group starts on the default the admin set, when that option is still offered. */
export function defaultSelection(groups: CustomizationGroup[]): Selection {
  const selection: Selection = {}
  for (const group of groups) {
    const fallback = group.options.find(o => o.id === group.defaultOptionId)
    selection[group.id] = fallback ? [fallback.id] : []
  }
  return selection
}

/**
 * BR-01: the drink's temperature is the first group that offers an iced option
 * — iced only while one of those options is chosen. A drink with no such group
 * (a frappé) is always iced, so its ice group shows.
 */
export function isIcedDrink(groups: CustomizationGroup[], selection: Selection): boolean {
  for (const group of groups) {
    const iced = group.options.filter(o => o.isIced)
    if (iced.length === 0) continue
    const picked = chosenIds(selection, group)
    return iced.some(o => picked.includes(o.id))
  }
  return true
}

export function isGroupVisible(
  group: CustomizationGroup,
  groups: CustomizationGroup[],
  selection: Selection
): boolean {
  return !group.needsIcedDrink || isIcedDrink(groups, selection)
}

/** The groups to show, in menu order. Hidden groups keep their choice but it is never sent. */
export function visibleGroups(groups: CustomizationGroup[], selection: Selection): CustomizationGroup[] {
  return groups.filter(group => isGroupVisible(group, groups, selection))
}

/** A multiple group is full once it holds maxSelect options (TC-13). */
export function isGroupFull(group: CustomizationGroup, selection: Selection): boolean {
  return group.selectionType === 'multiple' && chosenIds(selection, group).length >= group.maxSelect
}

/** Why the other add-ons are disabled. */
export function limitHint(group: CustomizationGroup): string {
  return `Up to ${group.maxSelect} — remove one to change`
}

/** An option of a full multiple group can still be tapped to remove it. */
export function isOptionDisabled(group: CustomizationGroup, option: CustomizationOption, selection: Selection): boolean {
  return isGroupFull(group, selection) && !chosenIds(selection, group).includes(option.id)
}

/**
 * Tapping an option. Single: the choice is replaced, and a required group can
 * never end up empty. Multiple: toggles, and refuses to go over maxSelect.
 */
export function toggleOption(group: CustomizationGroup, selection: Selection, optionId: number): Selection {
  const picked = chosenIds(selection, group)
  const has = picked.includes(optionId)
  let next: number[]
  if (group.selectionType === 'single') {
    if (has) next = group.isRequired ? picked : []
    else next = [optionId]
  } else if (has) {
    next = picked.filter(id => id !== optionId)
  } else if (picked.length >= group.maxSelect) {
    next = picked
  } else {
    // Keep the group's own order so the ticket labels read like the menu.
    next = group.options.filter(o => picked.includes(o.id) || o.id === optionId).map(o => o.id)
  }
  return { ...selection, [group.id]: next }
}

/** TC-12: required groups that are shown and still have no choice. */
export function missingGroups(groups: CustomizationGroup[], selection: Selection): CustomizationGroup[] {
  return visibleGroups(groups, selection).filter(g => g.isRequired && chosenIds(selection, g).length === 0)
}

export function canAddToOrder(groups: CustomizationGroup[], selection: Selection): boolean {
  return missingGroups(groups, selection).length === 0
}

/** The chosen options of the visible groups, in group order then option order. */
export function chosenPairs(
  groups: CustomizationGroup[],
  selection: Selection
): { group: CustomizationGroup; option: CustomizationOption }[] {
  const pairs: { group: CustomizationGroup; option: CustomizationOption }[] = []
  for (const group of visibleGroups(groups, selection)) {
    const picked = chosenIds(selection, group)
    for (const option of group.options) {
      if (picked.includes(option.id)) pairs.push({ group, option })
    }
  }
  return pairs
}

/** What POST /orders/walk-in gets for this drink: hidden groups are left out. */
export function optionIdsToSend(groups: CustomizationGroup[], selection: Selection): number[] {
  return chosenPairs(groups, selection).map(p => p.option.id)
}

/** "Less" in a group whose noun is "ice" reads "Less ice"; "No sugar" stays as it is. */
export function optionLabel(group: CustomizationGroup, option: CustomizationOption): string {
  const noun = group.summaryNoun?.trim()
  if (!noun || option.name.toLowerCase().includes(noun.toLowerCase())) return option.name
  return `${option.name} ${noun}`
}

export function lineLabels(groups: CustomizationGroup[], selection: Selection): string[] {
  return chosenPairs(groups, selection).map(p => optionLabel(p.group, p.option))
}

/** BR-03: the drink's base price plus the extra of every chosen visible option. */
export function unitPrice(basePrice: number, groups: CustomizationGroup[], selection: Selection): number {
  const extras = chosenPairs(groups, selection).reduce((sum, p) => sum + p.option.extraPrice, 0)
  return round2(Math.max(basePrice + extras, 0))
}

/**
 * What a button shows next to the option name. Single groups compare with the
 * current choice ("-$0.50", "+$0.00", "+$0.50"); add-ons show their own price;
 * a group where every option costs the same (usually free) shows nothing.
 */
export function priceLabel(
  group: CustomizationGroup,
  option: CustomizationOption,
  selection: Selection
): string | null {
  const prices = group.options.map(o => o.extraPrice)
  if (prices.every(p => p === prices[0])) return null
  if (group.selectionType === 'multiple') return moneySigned(option.extraPrice)
  const current = group.options.find(o => chosenIds(selection, group).includes(o.id))
  return moneySigned(round2(option.extraPrice - (current?.extraPrice ?? 0)))
}

export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return MIN_QUANTITY
  return Math.min(Math.max(Math.round(quantity), MIN_QUANTITY), MAX_QUANTITY)
}

/** Prices the drink as chosen right now, ready for the ticket. */
export function buildLine(
  customization: Customization,
  selection: Selection,
  quantity: number,
  key: number
): TicketLine {
  const { product, groups } = customization
  return {
    key,
    productId: product.id,
    name: product.name,
    optionIds: optionIdsToSend(groups, selection),
    labels: lineLabels(groups, selection),
    unitPrice: unitPrice(product.basePrice, groups, selection),
    quantity: clampQuantity(quantity)
  }
}

export function lineTotal(line: Pick<TicketLine, 'unitPrice' | 'quantity'>): number {
  return round2(line.unitPrice * line.quantity)
}

export function orderTotal(lines: Pick<TicketLine, 'unitPrice' | 'quantity'>[]): number {
  return round2(lines.reduce((sum, line) => sum + lineTotal(line), 0))
}

/** The cash box: blank is allowed (the staff member can skip it). */
export function parseCash(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) && value >= 0 ? round2(value) : null
}

/** FR-39: what to show under the cash box. `short` blocks the order like the server does. */
export function cashState(total: number, text: string): { cash: number | null; change: number | null; short: boolean } {
  const cash = parseCash(text)
  if (cash === null) return { cash: null, change: null, short: false }
  return { cash, change: round2(cash - total), short: cash < total }
}

/** The exact body of POST /api/admin/orders/walk-in: empty note and empty cash are left out. */
export function walkInBody(lines: TicketLine[], note: string, cashText: string): WalkInRequest {
  const body: WalkInRequest = {
    lines: lines.map(line => ({ productId: line.productId, optionIds: line.optionIds, quantity: line.quantity }))
  }
  if (note.trim() !== '') body.note = note.trim()
  const cash = parseCash(cashText)
  if (cash !== null) body.cashReceived = cash
  return body
}
