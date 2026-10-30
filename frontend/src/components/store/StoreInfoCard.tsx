import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import FormField from '@/components/common/FormField'
import SettingsCard from '@/components/store/SettingsCard'
import { Input } from '@/components/ui/input'
import { api, ApiError, errorMessage } from '@/lib/api'
import type { StoreInfo, StoreSettings } from '@/lib/types'

const schema = z.object({
  storeName: z.string().trim().min(1, 'Enter the store name.').max(100, 'Keep it under 100 characters.'),
  address: z.string().trim().min(1, 'Enter the address.').max(255, 'Keep it under 255 characters.'),
  phone: z.string().trim().min(1, 'Enter the phone number.').max(20, 'Keep it under 20 characters.')
})

type Form = z.infer<typeof schema>

/** FR-36: the shop's name, address and phone, as the app and receipts show them. */
export default function StoreInfoCard({ settings, canEdit }: { settings: StoreSettings; canEdit: boolean }) {
  const client = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { storeName: settings.storeName, address: settings.address, phone: settings.phone }
  })

  const save = useMutation({
    // The settings endpoint takes the pickup rules too, so send them back unchanged.
    mutationFn: (v: Form) =>
      api.put<StoreInfo>('/api/admin/store/settings', {
        storeName: v.storeName,
        address: v.address,
        phone: v.phone,
        slotIntervalMin: settings.slotIntervalMin,
        minPrepMin: settings.minPrepMin,
        pickupTimeoutMin: settings.pickupTimeoutMin,
        asapPrepMin: settings.asapPrepMin
      }),
    onSuccess: saved => {
      client.setQueryData(['store'], saved)
      toast.success('Store information saved.')
    },
    onError: e => {
      if (e instanceof ApiError && e.fields) {
        for (const [field, message] of Object.entries(e.fields)) {
          if (field === 'storeName' || field === 'address' || field === 'phone') setError(field, { message })
        }
      } else toast.error(errorMessage(e))
    }
  })

  return (
    <SettingsCard title='Store information' formId='store-info-form' canEdit={canEdit} busy={save.isPending}>
      <form
        id='store-info-form'
        onSubmit={handleSubmit(v => save.mutate(v))}
        className='grid gap-4 sm:grid-cols-2'
        noValidate
      >
        <FormField id='storeName' label='Store name' error={errors.storeName?.message}>
          <Input id='storeName' disabled={!canEdit} {...register('storeName')} aria-invalid={!!errors.storeName} />
        </FormField>
        <FormField id='phone' label='Phone' error={errors.phone?.message}>
          <Input id='phone' disabled={!canEdit} {...register('phone')} aria-invalid={!!errors.phone} />
        </FormField>
        <FormField
          id='address'
          label='Address'
          error={errors.address?.message}
          hint='Shown in the app for pickup.'
        >
          <Input id='address' disabled={!canEdit} {...register('address')} aria-invalid={!!errors.address} />
        </FormField>
      </form>
    </SettingsCard>
  )
}
