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
    watch,
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

  const minPrep = Number(watch('minPrepMin'))

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
          hint='SA rule BR-07 says at least 30 minutes.'
        >
          <Input id='minPrepMin' type='number' min={0} max={240} disabled={!canEdit} {...register('minPrepMin')} />
          {Number.isFinite(minPrep) && minPrep < 30 && (
            <p className='text-mocha text-xs' role='status'>
              Under 30 minutes breaks BR-07.
            </p>
          )}
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
          hint='Orders waiting in Ready longer than this are flagged in the queue (BR-12).'
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
