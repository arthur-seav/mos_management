import { useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import FormField from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { api, errorMessage } from '@/lib/api'
import type { Order } from '@/lib/types'

import { QUEUE_KEY } from './queue-logic'

/** BR-10, FR-38: staff must pick a reason, and the customer is told it. */
const REASONS = ['Sold out', 'Too busy right now', 'Store closing soon', 'Other'] as const

const slug = (reason: string) => `reject-${reason.toLowerCase().replace(/\s+/g, '-')}`

export default function RejectDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const client = useQueryClient()
  const [choice, setChoice] = useState('')
  const [other, setOther] = useState('')
  const code = order.pickupCode ?? `#${order.id}`
  const reason = choice === 'Other' ? other.trim() : choice

  const reject = useMutation({
    mutationFn: () => api.post<Order>(`/api/admin/orders/${order.id}/reject`, { reason }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: QUEUE_KEY })
      toast.success(`${code} rejected.`)
      onClose()
    },
    onError: e => toast.error(errorMessage(e))
  })

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {code}?</DialogTitle>
          <DialogDescription>The customer will see this reason. Paid orders are refunded.</DialogDescription>
        </DialogHeader>
        <RadioGroup aria-label='Reason' value={choice} onValueChange={value => setChoice(String(value))}>
          {REASONS.map(r => (
            <div key={r} className='flex items-center gap-2'>
              <RadioGroupItem id={slug(r)} value={r} aria-label={r} />
              <Label htmlFor={slug(r)}>{r}</Label>
            </div>
          ))}
        </RadioGroup>
        {choice === 'Other' && (
          <FormField id='reject-other-text' label='Other reason' hint='Keep it short and plain.'>
            <Input
              id='reject-other-text'
              value={other}
              maxLength={255}
              onChange={e => setOther(e.target.value)}
              placeholder='Why is this order rejected?'
            />
          </FormField>
        )}
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button variant='destructive' disabled={!reason || reject.isPending} onClick={() => reject.mutate()}>
            Reject order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
