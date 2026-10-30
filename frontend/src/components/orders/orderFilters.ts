import type { OrderSource, OrderStatus, Payment } from '@/lib/types'

/** Rows per page on the records table; the API defaults to the same. */
export const PAGE_SIZE = 20

/** Every status, in the order a day runs, for the filter list. */
export const ORDER_STATUSES: OrderStatus[] = [
  'pending_payment',
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
  'rejected',
  'abandoned'
]

export const ORDER_SOURCES: OrderSource[] = ['online', 'walk_in']

/** 'all' is the sentinel the selects use; it is never sent to the server. */
export type StatusFilter = OrderStatus | 'all'
export type SourceFilter = OrderSource | 'all'

export type OrderFilters = {
  /** Store-local day "YYYY-MM-DD", or '' for "no limit". */
  from: string
  to: string
  status: StatusFilter
  source: SourceFilter
  q: string
  /** 0-based, like the API. */
  page: number
}

export const NO_FILTERS: OrderFilters = { from: '', to: '', status: 'all', source: 'all', q: '', page: 0 }

const DAY = /^\d{4}-\d{2}-\d{2}$/

function readStatus(value: string | null): StatusFilter {
  return ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : 'all'
}

function readSource(value: string | null): SourceFilter {
  return ORDER_SOURCES.includes(value as OrderSource) ? (value as OrderSource) : 'all'
}

/** The URL is the only place filters live, so a reload keeps them. Junk values fall back to "no filter". */
export function readFilters(params: URLSearchParams): OrderFilters {
  const page = Number(params.get('page') ?? '0')
  return {
    from: DAY.test(params.get('from') ?? '') ? params.get('from')! : '',
    to: DAY.test(params.get('to') ?? '') ? params.get('to')! : '',
    status: readStatus(params.get('status')),
    source: readSource(params.get('source')),
    q: params.get('q') ?? '',
    page: Number.isInteger(page) && page > 0 ? page : 0
  }
}

/** Only what is set goes in the address bar. */
export function filtersToParams(filters: OrderFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  if (filters.status !== 'all') params.status = filters.status
  if (filters.source !== 'all') params.source = filters.source
  if (filters.q.trim()) params.q = filters.q.trim()
  if (filters.page > 0) params.page = String(filters.page)
  return params
}

/** What GET /api/admin/orders is asked for. Empty values are dropped by withQuery. */
export function ordersQuery(filters: OrderFilters) {
  return {
    from: filters.from,
    to: filters.to,
    status: filters.status === 'all' ? '' : filters.status,
    source: filters.source === 'all' ? '' : filters.source,
    q: filters.q.trim(),
    page: filters.page,
    size: PAGE_SIZE
  }
}

/** FR-33: the one payment waiting to be handed back, if any. */
export function refundPendingPayment(payments: Payment[]): Payment | undefined {
  return payments.find(p => p.status === 'refund_pending')
}
