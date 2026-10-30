/** Shapes returned by /api/admin/**, mirroring the Java DTOs (dto/*.java). Money is a JSON number in dollars. */

export type Role = 'customer' | 'staff' | 'admin'
export type AccountStatus = 'active' | 'inactive'

export type User = {
  id: number
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  role: Role
  status: AccountStatus
  dateOfBirth: string | null
  createdAt: string
}

export type SignInResponse = { token: string; user: User }

export type Page<T> = { items: T[]; page: number; size: number; total: number }

// ---- menu (MenuDtos) ----

export type Category = { id: number; name: string; sortOrder: number; active: boolean; productCount: number }

export type Product = {
  id: number
  categoryId: number
  categoryName: string
  name: string
  description: string | null
  imageUrl: string
  basePrice: number
  isAvailable: boolean
  isActive: boolean
  createdAt: string
}

export type SelectionType = 'single' | 'multiple'

export type MenuOption = {
  id: number
  groupId: number
  name: string
  extraPrice: number
  sortOrder: number
  isActive: boolean
  isIced: boolean
}

export type OptionGroup = {
  id: number
  name: string
  selectionType: SelectionType
  isRequired: boolean
  maxSelect: number
  sortOrder: number
  needsIcedDrink: boolean
  summaryNoun: string | null
  options: MenuOption[]
}

/** GET/PUT /api/admin/products/{id}/options */
export type ProductOptionSetting = {
  optionId: number
  name: string
  groupPrice: number
  offered: boolean
  priceOverride: number | null
  optionActive: boolean
}

export type ProductGroupSetting = {
  groupId: number
  name: string
  selectionType: SelectionType
  isRequired: boolean
  maxSelect: number
  offered: boolean
  isActive: boolean
  defaultOptionId: number | null
  options: ProductOptionSetting[]
}

export type ProductOptionsView = { productId: number; productName: string; groups: ProductGroupSetting[] }

export type ProductOptionsRequest = {
  groups: {
    groupId: number
    isActive: boolean
    defaultOptionId: number | null
    options: { optionId: number; priceOverride: number | null }[]
  }[]
}

/** GET /api/admin/products/{id}/customization: what the drink offers today, with its own prices. */
export type CustomizationOption = { id: number; groupId: number; name: string; extraPrice: number; isIced: boolean }

export type CustomizationGroup = {
  id: number
  name: string
  selectionType: SelectionType
  isRequired: boolean
  maxSelect: number
  needsIcedDrink: boolean
  summaryNoun: string | null
  options: CustomizationOption[]
  defaultOptionId: number | null
}

export type Customization = { product: Product; groups: CustomizationGroup[]; lowestPrice: number }

// ---- store (StoreDtos) ----

export type StoreSettings = {
  storeName: string
  address: string
  phone: string
  slotIntervalMin: number
  minPrepMin: number
  pickupTimeoutMin: number
  asapPrepMin: number
  onlineOrderingOpen: boolean
}

/** Times are store-local "HH:mm:ss"; dayOfWeek 0 = Sunday. */
export type DayHours = { dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }

export type StoreInfo = { settings: StoreSettings; hours: DayHours[]; timeZone: string; isOpenNow: boolean }

// ---- orders (OrderDtos, AdminOrderDtos) ----

export type OrderStatus =
  | 'pending_payment'
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'abandoned'

export type OrderSource = 'online' | 'walk_in'
export type PickupType = 'asap' | 'scheduled'
export type PaymentMethod = 'khqr' | 'card' | 'cash'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refund_pending' | 'refunded'

export type Payment = {
  id: number
  orderId: number
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  transactionRef: string | null
  paidAt: string | null
  createdAt: string
  failureReason: string | null
  recordedBy: string | null
}

export type OrderItem = {
  productId: number
  productName: string
  optionIds: number[]
  /** As the customer saw them: "Large", "Iced", "Less ice". */
  optionNames: string[]
  unitPrice: number
  quantity: number
  lineTotal: number
}

export type Person = { id: number; name: string; email: string | null; phone: string | null }

export type Order = {
  id: number
  pickupCode: string | null
  source: OrderSource
  status: OrderStatus
  pickupType: PickupType
  pickupTime: string | null
  note: string | null
  totalAmount: number
  rejectReason: string | null
  createdAt: string
  placedAt: string | null
  confirmedAt: string | null
  preparingAt: string | null
  readyAt: string | null
  completedAt: string | null
  endedAt: string | null
  customerId: number | null
  customer: Person | null
  handledBy: Person | null
  items: OrderItem[]
  payments: Payment[]
  drinkCount: number
}

export type QueueItem = { order: Order; nextStatus: OrderStatus | null; sortTime: string; overdue: boolean }
export type Queue = { orders: QueueItem[]; serverTime: string; onlineOrderingOpen: boolean }

export type OrderLineRequest = { productId: number; optionIds: number[]; quantity: number }
export type WalkInRequest = { lines: OrderLineRequest[]; note?: string; cashReceived?: number }

// ---- reports (ReportDtos) ----

export type DaySales = { date: string; orders: number; revenue: number }
export type SourceSales = { source: OrderSource; orders: number; revenue: number }
export type SalesReport = {
  from: string
  to: string
  orders: number
  drinks: number
  revenue: number
  averageOrder: number
  cancelledOrRejected: number
  byDay: DaySales[]
  bySource: SourceSales[]
}
export type BestSeller = { productId: number; productName: string; quantity: number; revenue: number }

/** revenueToday is null for staff. */
export type Overview = {
  ordersToday: number
  revenueToday: number | null
  placed: number
  confirmed: number
  preparing: number
  ready: number
  refundsPending: number
  soldOut: number
  onlineOrderingOpen: boolean
}

export function fullName(u: Pick<User, 'firstName' | 'lastName'>): string {
  return `${u.firstName} ${u.lastName}`.trim()
}

export function initials(u: Pick<User, 'firstName' | 'lastName'>): string {
  return [u.firstName, u.lastName]
    .filter(Boolean)
    .map(n => n[0]!.toUpperCase())
    .join('')
}
