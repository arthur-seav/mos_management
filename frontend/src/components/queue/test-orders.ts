/**
 * Hand-built queue data for the queue tests, so every expected value in a test
 * can be written out by hand. Only test files import this.
 */

import type { Order, OrderItem, OrderStatus, QueueItem } from '@/lib/types'

/** 10:30 AM in the store's zone (Asia/Phnom_Penh, +07). */
export const SERVER_TIME = '2026-10-30T03:30:00Z'

export function makeLine(fields: Partial<OrderItem> = {}): OrderItem {
  return {
    productId: 1,
    productName: 'Mocha',
    optionIds: [],
    optionNames: [],
    unitPrice: 4.3,
    quantity: 1,
    lineTotal: 4.3,
    ...fields
  }
}

export function makeOrder(fields: Partial<Order> = {}): Order {
  return {
    id: 1,
    pickupCode: 'A001',
    source: 'online',
    status: 'placed',
    pickupType: 'asap',
    pickupTime: null,
    note: null,
    totalAmount: 4.3,
    rejectReason: null,
    createdAt: '2026-10-30T03:20:00Z',
    placedAt: '2026-10-30T03:20:00Z',
    confirmedAt: null,
    preparingAt: null,
    readyAt: null,
    completedAt: null,
    endedAt: null,
    customerId: null,
    customer: null,
    handledBy: null,
    items: [makeLine()],
    payments: [],
    drinkCount: 1,
    ...fields
  }
}

/** The next status the server offers for each queue status (BR-08). */
const NEXT: Record<string, OrderStatus> = {
  placed: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'completed'
}

export function makeItem(order: Order, fields: Partial<Omit<QueueItem, 'order'>> = {}): QueueItem {
  return {
    order,
    nextStatus: NEXT[order.status] ?? null,
    sortTime: order.placedAt ?? order.createdAt,
    overdue: false,
    ...fields
  }
}
