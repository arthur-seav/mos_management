import { useEffect, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { MinusIcon, PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  chosenIds,
  defaultSelection,
  isGroupFull,
  isOptionDisabled,
  limitHint,
  lineTotal,
  MAX_QUANTITY,
  MIN_QUANTITY,
  buildLine,
  canAddToOrder,
  clampQuantity,
  missingGroups,
  priceLabel,
  toggleOption,
  unitPrice,
  visibleGroups,
  type Selection,
  type TicketLine
} from '@/components/walkin/selection'
import { api, errorMessage } from '@/lib/api'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Customization, Product } from '@/lib/types'

/**
 * Taking one drink for a walk-in order: the groups this drink offers today
 * (BR-01), the live line price (BR-03) and the limits on screen rather than
 * as an error afterwards (BR-02, TC-12, TC-13).
 */
export default function DrinkDialog({
  product,
  lineKey,
  onAdd,
  onClose
}: {
  product: Product
  /** Key for the line this dialog creates, so two identical drinks stay apart. */
  lineKey: number
  onAdd: (line: TicketLine) => void
  onClose: () => void
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['customization', product.id],
    queryFn: () => api.get<Customization>(`/api/admin/products/${product.id}/customization`)
  })
  const [selection, setSelection] = useState<Selection | null>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (data) setSelection(defaultSelection(data.groups))
  }, [data])

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>{product.description ?? `Base price ${money(product.basePrice)}`}</DialogDescription>
        </DialogHeader>
        {isLoading && <Skeleton className='h-40 w-full' />}
        {error && <p className='text-destructive'>{errorMessage(error)}</p>}
        {data && selection && (
          <Body
            customization={data}
            selection={selection}
            quantity={quantity}
            onSelection={setSelection}
            onQuantity={setQuantity}
            onAdd={line => {
              onAdd(line)
              onClose()
            }}
            lineKey={lineKey}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Body({
  customization,
  selection,
  quantity,
  lineKey,
  onSelection,
  onQuantity,
  onAdd
}: {
  customization: Customization
  selection: Selection
  quantity: number
  lineKey: number
  onSelection: (selection: Selection) => void
  onQuantity: (quantity: number) => void
  onAdd: (line: TicketLine) => void
}) {
  const { groups, product } = customization
  const unit = unitPrice(product.basePrice, groups, selection)
  const total = lineTotal({ unitPrice: unit, quantity })
  const missing = missingGroups(groups, selection)

  return (
    <>
      <div className='grid max-h-[55vh] gap-5 overflow-y-auto'>
        {visibleGroups(groups, selection).map(group => {
          const picked = chosenIds(selection, group)
          return (
            <fieldset key={group.id} className='grid gap-2'>
              <legend className='mb-2 flex w-full items-center justify-between gap-2'>
                <span className='text-section'>{group.name}</span>
                <span className='text-muted-foreground text-xs'>
                  {group.isRequired
                    ? 'Required'
                    : group.selectionType === 'multiple'
                      ? `Up to ${group.maxSelect}`
                      : 'Optional'}
                </span>
              </legend>
              <div className='flex flex-wrap gap-2'>
                {group.options.map(option => {
                  const on = picked.includes(option.id)
                  const price = priceLabel(group, option, selection)
                  return (
                    <button
                      key={option.id}
                      type='button'
                      aria-pressed={on}
                      disabled={isOptionDisabled(group, option, selection)}
                      onClick={() => onSelection(toggleOption(group, selection, option.id))}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
                        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted',
                        'disabled:cursor-not-allowed disabled:opacity-40'
                      )}
                    >
                      <span>{option.name}</span>
                      {price && (
                        <span className={cn('text-xs', on ? 'text-primary-foreground/80' : 'text-mocha')}>{price}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {isGroupFull(group, selection) && (
                <p className='text-muted-foreground text-xs'>{limitHint(group)}</p>
              )}
            </fieldset>
          )
        })}
      </div>
      <DialogFooter className='items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              size='icon-sm'
              aria-label='Decrease quantity'
              disabled={quantity <= MIN_QUANTITY}
              onClick={() => onQuantity(clampQuantity(quantity - 1))}
            >
              <MinusIcon />
            </Button>
            <span aria-label='Quantity' className='w-8 text-center font-medium'>
              {quantity}
            </span>
            <Button
              variant='outline'
              size='icon-sm'
              aria-label='Increase quantity'
              disabled={quantity >= MAX_QUANTITY}
              onClick={() => onQuantity(clampQuantity(quantity + 1))}
            >
              <PlusIcon />
            </Button>
          </div>
          <p className='text-muted-foreground text-sm'>
            Line total <span className='text-price'>{money(total)}</span>
          </p>
        </div>
        <div className='grid gap-1 sm:justify-items-end'>
          {missing.length > 0 && (
            <p className='text-destructive text-xs'>Choose {missing.map(g => g.name).join(' and ')} first.</p>
          )}
          <Button
            disabled={!canAddToOrder(groups, selection)}
            onClick={() => onAdd(buildLine(customization, selection, quantity, lineKey))}
          >
            Add to order
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}
