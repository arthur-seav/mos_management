/** Decisions behind the order queue board, kept out of the screen so they can be unit tested. */

import { ago, time } from '@/lib/format'
import type { Order, OrderStatus, QueueItem } from '@/lib/types'

/** The query the board polls; mutations invalidate it so the board redraws at once. */
export const QUEUE_KEY = ['order-queue']

/** The four board columns, left to right (FR-19, FR-21). */
export const QUEUE_COLUMNS = [
  { status: 'placed', title: 'New' },
  { status: 'confirmed', title: 'Confirmed' },
  { status: 'preparing', title: 'Preparing' },
  { status: 'ready', title: 'Ready for pickup' }
] as const satisfies readonly { status: OrderStatus; title: string }[]

export type QueueColumnStatus = (typeof QUEUE_COLUMNS)[number]['status']

/**
 * The orders of one column. The server already sorted the queue by order time
 * (pickup time for scheduled orders, BR-11), so filtering keeps that order.
 */
export function itemsFor(items: QueueItem[], status: QueueColumnStatus): QueueItem[] {
  return items.filter(item => item.order.status === status)
}

/** Ids of the online orders still waiting for staff to confirm. */
export function placedOnlineIds(items: QueueItem[]): number[] {
  return items.filter(i => i.order.source === 'online' && i.order.status === 'placed').map(i => i.order.id)
}

/**
 * FR-34: which orders to alert staff about. `seen` is the set from the previous
 * poll, or null on the very first load — the first load alerts for nothing,
 * because those orders were already on screen when staff opened the board.
 * Walk-in orders are typed in by staff themselves, so they never alert.
 */
export function newOnlineOrderIds(seen: ReadonlySet<number> | null, items: QueueItem[]): number[] {
  if (!seen) return []
  return placedOnlineIds(items).filter(id => !seen.has(id))
}

/** BR-12: whole minutes an order has waited in "Ready for pickup", by the server's clock. */
export function minutesWaiting(readyAt: string | null, serverTime: string): number {
  if (!readyAt) return 0
  const min = Math.floor((new Date(serverTime).getTime() - new Date(readyAt).getTime()) / 60000)
  return min > 0 ? min : 0
}

/** "Pickup at 10:40 AM" for a booked slot, "ASAP" otherwise. */
export function pickupLabel(order: Pick<Order, 'pickupType' | 'pickupTime'>): string {
  return order.pickupType === 'scheduled' && order.pickupTime ? `Pickup at ${time(order.pickupTime)}` : 'ASAP'
}

/** "placed 4 min ago", counted from the server's clock so a wrong device clock cannot shift it. */
export function placedLabel(order: Pick<Order, 'placedAt' | 'createdAt'>, serverTime: string): string {
  return `placed ${ago(order.placedAt ?? order.createdAt, serverTime)}`
}
