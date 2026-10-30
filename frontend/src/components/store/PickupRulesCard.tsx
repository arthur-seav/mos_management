import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import FormField from '@/components/common/FormField'
import SettingsCard from '@/components/store/SettingsCard'
import { Input } from '@/components/ui/input'
import { api, errorMessage } from '@/lib/api'
import type { StoreInfo, StoreSettings } from '@/lib/types'

const schema = z.object({
  slotIntervalMin: z.coerce.number().int().min(5, 'Slots are at least 5 minutes apart.').max(120, '120 at most.'),
  minPrepMin: z.coerce.number().int().min(0, 'Use 0 or more.').max(240, '240 at most.'),
  asapPrepMin: z.coerce.number().int().min(0, 'Use 0 or more.').max(120, '120 at most.'),
  pickupTimeoutMin: z.coerce.number().int().min(5, 'Use 5 or more.').max(240, '240 at most.')
})

type Form = z.infer<typeof schema>

/** FR-40: the pickup slot interval, prep times and how long an order may wait (BR-07, BR-12). */
export default function PickupRulesCard({ settings, canEdit }: { settings: StoreSettings; canEdit: boolean }) {
  const client = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<z.input<typeof schema>, unknown, Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      slotIntervalMin: settings.slotIntervalMin,
      minPrepMin: settings.minPrepMin,
      asapPrepMin: settings.asapPrepMin,
      pickupTimeoutMin: settings.pickupTimeoutMin
    }
  })

  const save = useMutation({
    // The settings endpoint takes the store information too, so send it back unchanged.
    mutationFn: (v: Form) =>
      api.put<StoreInfo>('/api/admin/store/settings', {
        storeName: settings.storeName,
        address: settings.address,
        phone: settings.phone,
        slotIntervalMin: v.slotIntervalMin,
        minPrepMin: v.minPrepMin,
        pickupTimeoutMin: v.pickupTimeoutMin,
        asapPrepMin: v.asapPrepMin
      }),
    onSuccess: saved => {
      client.setQueryData(['store'], saved)
      toast.success('Pickup rules saved.')
    },
    onError: e => toast.error(errorMessage(e))
  })


  return (
    <SettingsCard
      title='Pickup rules'
      description='How pickup times are offered to customers.'
      formId='pickup-rules-form'
      canEdit={canEdit}
      busy={save.isPending}
    >
      <form
        id='pickup-rules-form'
        onSubmit={handleSubmit(v => save.mutate(v))}
        className='grid gap-4 sm:grid-cols-2'
        noValidate
      >
        <FormField
          id='slotIntervalMin'
          label='Slot interval (minutes)'
          error={errors.slotIntervalMin?.message}
          hint='The gap between pickup times the app offers.'
        >
          <Input
            id='slotIntervalMin'
            type='number'
            min={5}
            max={120}
            disabled={!canEdit}
            {...register('slotIntervalMin')}
          />
        </FormField>
        <FormField
          id='minPrepMin'
          label='Minimum prep time for scheduled pickup (minutes)'
          error={errors.minPrepMin?.message}
          hint='How far ahead a customer must schedule a pickup.'
        >
          <Input id='minPrepMin' type='number' min={0} max={240} disabled={!canEdit} {...register('minPrepMin')} />
        </FormField>
        <FormField
          id='asapPrepMin'
          label='ASAP prep time (minutes)'
          error={errors.asapPrepMin?.message}
          hint='What an "as soon as possible" order promises the customer.'
        >
          <Input id='asapPrepMin' type='number' min={0} max={120} disabled={!canEdit} {...register('asapPrepMin')} />
        </FormField>
        <FormField
          id='pickupTimeoutMin'
          label='Pickup timeout (minutes)'
          error={errors.pickupTimeoutMin?.message}
          hint='Orders waiting in Ready longer than this are flagged in the queue.'
        >
          <Input
            id='pickupTimeoutMin'
            type='number'
            min={5}
            max={240}
            disabled={!canEdit}
            {...register('pickupTimeoutMin')}
          />
        </FormField>
      </form>
    </SettingsCard>
  )
}
