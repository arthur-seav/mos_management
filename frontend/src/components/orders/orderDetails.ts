import { time } from '@/lib/format'
import type { Order } from '@/lib/types'

export type TimelineStep = { label: string; at: string }

const STEPS: { label: string; pick: (order: Order) => string | null }[] = [
  { label: 'Created', pick: o => o.createdAt },
  { label: 'Placed', pick: o => o.placedAt },
  { label: 'Confirmed', pick: o => o.confirmedAt },
  { label: 'Preparing', pick: o => o.preparingAt },
  { label: 'Ready', pick: o => o.readyAt },
  { label: 'Completed', pick: o => o.completedAt },
  { label: 'Ended', pick: o => o.endedAt }
]

/** The steps this order actually went through, oldest first; missing timestamps are left out. */
export function orderTimeline(order: Order): TimelineStep[] {
  return STEPS.flatMap(step => {
    const at = step.pick(order)
    return at ? [{ label: step.label, at }] : []
  })
}

/** FR-13: ASAP orders have no pickup time to show. */
export function pickupLabel(order: Order): string {
  if (order.pickupType === 'asap' || !order.pickupTime) return 'ASAP'
  return `Scheduled ${time(order.pickupTime)}`
}

/** The line under a drink: "Large · Iced", or nothing when it has no options. */
export function optionSummary(optionNames: string[]): string {
  return optionNames.join(' · ')
}
