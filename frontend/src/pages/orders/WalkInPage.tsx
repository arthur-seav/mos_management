import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SearchIcon } from 'lucide-react'
import { toast } from 'sonner'

import PageTitle from '@/components/common/PageTitle'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import DrinkDialog from '@/components/walkin/DrinkDialog'
import OrderTicket from '@/components/walkin/OrderTicket'
import PlacedOrderPanel from '@/components/walkin/PlacedOrderPanel'
import { pickerCategories, pickerProducts } from '@/components/walkin/menu'
import { clampQuantity, walkInBody, type TicketLine } from '@/components/walkin/selection'
import { api, ApiError, errorMessage } from '@/lib/api'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Category, Order, Product } from '@/lib/types'

/**
 * FR-23, FR-39: a staff member takes an order at the counter and records the
 * cash payment. The order is created already Confirmed and paid (BR-08, BR-13).
 * Sold-out drinks cannot be added (BR-05); the option rules and prices follow
 * BR-01..BR-03 and are checked again by the server (NFR-07).
 */
export default function WalkInPage() {
  const client = useQueryClient()
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [opened, setOpened] = useState<Product | null>(null)
  const [lines, setLines] = useState<TicketLine[]>([])
  const [nextKey, setNextKey] = useState(1)
  const [note, setNote] = useState('')
  const [cash, setCash] = useState('')
  const [placed, setPlaced] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/admin/categories')
  })
  const products = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<Product[]>('/api/admin/products')
  })

  const place = useMutation({
    mutationFn: () => api.post<Order>('/api/admin/orders/walk-in', walkInBody(lines, note, cash)),
    onSuccess: order => {
      setPlaced(order)
      setError(null)
      setLines([])
      setNote('')
      setCash('')
      toast.success(`Order ${order.pickupCode ?? ''} placed.`)
    },
    onError: e => {
      setError(errorMessage(e))
      toast.error(errorMessage(e))
      // BR-05: the drink sold out while the order was being taken — reload the menu.
      if (e instanceof ApiError && e.code === 'drink_unavailable') {
        client.invalidateQueries({ queryKey: ['products'] })
      }
    }
  })

  const shownCategories = pickerCategories(categories.data ?? [])
  const shownProducts = pickerProducts(products.data ?? [], {
    categories: categories.data ?? [],
    categoryId,
    search
  })

  function addLine(line: TicketLine) {
    setLines(current => [...current, line])
    setNextKey(key => key + 1)
    setPlaced(null)
    setError(null)
  }

  return (
    <>
      <PageTitle title='Walk-in order' description='Take an order at the counter and record the cash payment.' />
      <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]'>
        <div className='grid gap-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <CategoryChip label='All' on={categoryId === null} onClick={() => setCategoryId(null)} />
            {shownCategories.map(category => (
              <CategoryChip
                key={category.id}
                label={category.name}
                on={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
              />
            ))}
          </div>
          <InputGroup className='max-w-sm'>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder='Search drinks'
              aria-label='Search drinks'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </InputGroup>
          {products.isLoading || categories.isLoading ? (
            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
              {[0, 1, 2, 3].map(i => (
                <Skeleton key={i} className='h-20 w-full' />
              ))}
            </div>
          ) : shownProducts.length === 0 ? (
            <Card>
              <CardContent className='text-muted-foreground py-10 text-center'>No drinks found.</CardContent>
            </Card>
          ) : (
            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
              {shownProducts.map(product => (
                <DrinkCard key={product.id} product={product} onOpen={() => setOpened(product)} />
              ))}
            </div>
          )}
        </div>
        {placed ? (
          <PlacedOrderPanel order={placed} onNew={() => setPlaced(null)} />
        ) : (
          <OrderTicket
            lines={lines}
            note={note}
            cash={cash}
            placing={place.isPending}
            error={error}
            onNote={setNote}
            onCash={setCash}
            onQuantity={(key, quantity) =>
              setLines(current =>
                current.map(line => (line.key === key ? { ...line, quantity: clampQuantity(quantity) } : line))
              )
            }
            onRemove={key => setLines(current => current.filter(line => line.key !== key))}
            onPlace={() => place.mutate()}
          />
        )}
      </div>
      {opened && <DrinkDialog product={opened} lineKey={nextKey} onAdd={addLine} onClose={() => setOpened(null)} />}
    </>
  )
}

function CategoryChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type='button'
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'rounded-4xl border px-3 py-1 text-sm transition-colors',
        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
      )}
    >
      {label}
    </button>
  )
}

/** BR-05: a sold-out drink stays on the menu but cannot be opened or added. */
function DrinkCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const soldOut = !product.isAvailable
  return (
    <button
      type='button'
      disabled={soldOut}
      onClick={onOpen}
      className={cn(
        'ring-foreground/10 bg-card grid gap-1 rounded-xl p-3 text-left shadow-xs ring-1 transition-colors',
        soldOut ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted'
      )}
    >
      <span className='flex items-center justify-between gap-2'>
        <span className='font-medium'>{product.name}</span>
        {soldOut && <Badge variant='destructive'>Sold out</Badge>}
      </span>
      <span className='text-muted-foreground text-xs'>{product.categoryName}</span>
      <span className='text-price'>from {money(product.basePrice)}</span>
    </button>
  )
}
