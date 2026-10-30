import { MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  cashState,
  clampQuantity,
  lineTotal,
  MAX_QUANTITY,
  MIN_QUANTITY,
  orderTotal,
  type TicketLine
} from '@/components/walkin/selection'
import { money } from '@/lib/format'

/**
 * The counter ticket (FR-23, FR-39, BR-13): the drinks taken so far, the cash
 * the customer handed over and the change to give back. The total here is for
 * the staff member; the server prices the order again when it is placed (NFR-07).
 */
export default function OrderTicket({
  lines,
  note,
  cash,
  placing,
  error,
  onNote,
  onCash,
  onQuantity,
  onRemove,
  onPlace
}: {
  lines: TicketLine[]
  note: string
  cash: string
  placing: boolean
  error: string | null
  onNote: (note: string) => void
  onCash: (cash: string) => void
  onQuantity: (key: number, quantity: number) => void
  onRemove: (key: number) => void
  onPlace: () => void
}) {
  const total = orderTotal(lines)
  const { change, short } = cashState(total, cash)

  return (
    <Card role='region' aria-label='Order ticket'>
      <CardHeader>
        <CardTitle>Order ticket</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-4'>
        {lines.length === 0 ? (
          <p className='text-muted-foreground py-6 text-center'>No drinks yet. Pick one from the menu.</p>
        ) : (
          <ul className='grid gap-3'>
            {lines.map(line => (
              <li key={line.key} className='grid gap-1 border-b pb-3 last:border-b-0 last:pb-0'>
                <div className='flex items-start justify-between gap-2'>
                  <span className='font-medium'>{line.name}</span>
                  <span className='text-price'>{money(lineTotal(line))}</span>
                </div>
                {line.labels.length > 0 && (
                  <p className='text-muted-foreground text-xs'>{line.labels.join(' · ')}</p>
                )}
                <div className='flex items-center gap-1'>
                  <Button
                    variant='outline'
                    size='icon-xs'
                    aria-label={`Decrease quantity of ${line.name}`}
                    disabled={line.quantity <= MIN_QUANTITY}
                    onClick={() => onQuantity(line.key, clampQuantity(line.quantity - 1))}
                  >
                    <MinusIcon />
                  </Button>
                  <span aria-label={`Quantity of ${line.name}`} className='w-7 text-center text-sm'>
                    {line.quantity}
                  </span>
                  <Button
                    variant='outline'
                    size='icon-xs'
                    aria-label={`Increase quantity of ${line.name}`}
                    disabled={line.quantity >= MAX_QUANTITY}
                    onClick={() => onQuantity(line.key, clampQuantity(line.quantity + 1))}
                  >
                    <PlusIcon />
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon-xs'
                    className='ml-auto'
                    aria-label={`Remove ${line.name}`}
                    onClick={() => onRemove(line.key)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className='grid gap-1.5'>
          <Label htmlFor='walkin-note'>Note</Label>
          <Textarea
            id='walkin-note'
            value={note}
            onChange={e => onNote(e.target.value)}
            placeholder='Anything the barista should know'
            className='min-h-14'
          />
        </div>

        <div className='flex items-center justify-between border-t pt-3'>
          <span className='text-section'>Total</span>
          <span className='text-price text-lg'>{money(total)}</span>
        </div>

        <div className='grid gap-1.5'>
          <Label htmlFor='walkin-cash'>Cash received</Label>
          <Input
            id='walkin-cash'
            type='number'
            min='0'
            step='0.01'
            inputMode='decimal'
            value={cash}
            onChange={e => onCash(e.target.value)}
            placeholder='Leave empty if not counted'
            aria-invalid={short}
          />
          {short && <p className='text-destructive text-sm'>Not enough — the total is {money(total)}.</p>}
          {!short && change !== null && <p className='text-success text-sm'>Change {money(change)}</p>}
        </div>

        {error && <p className='text-destructive text-sm'>{error}</p>}
      </CardContent>
      <CardFooter className='border-t'>
        <Button className='w-full' disabled={lines.length === 0 || short || placing} onClick={onPlace}>
          {placing ? 'Placing…' : 'Place order'}
        </Button>
      </CardFooter>
    </Card>
  )
}
