import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import FormField from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { api, ApiError, errorMessage } from '@/lib/api'
import type { MenuOption, OptionGroup } from '@/lib/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(50, 'Keep it under 50 characters.'),
  extraPrice: z.coerce.number().min(-50, 'Too low.').max(50, 'Too high.'),
  sortOrder: z.coerce.number().int().min(0, 'Use 0 or more.'),
  isIced: z.boolean(),
  isActive: z.boolean()
})

type Form = z.infer<typeof schema>

/** FR-26: one choice inside a group, with the charge it adds (or takes off) on every drink. */
export default function OptionDialog({
  group,
  option,
  onClose
}: {
  group: OptionGroup
  option: MenuOption | null
  onClose: () => void
}) {
  const client = useQueryClient()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors }
  } = useForm<z.input<typeof schema>, unknown, Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: option?.name ?? '',
      extraPrice: option?.extraPrice ?? 0,
      sortOrder: option?.sortOrder ?? 0,
      isIced: option?.isIced ?? false,
      isActive: option?.isActive ?? true
    }
  })

  const save = useMutation({
    mutationFn: (v: Form) =>
      option
        ? api.put<MenuOption>(`/api/admin/options/${option.id}`, v)
        : api.post<MenuOption>(`/api/admin/option-groups/${group.id}/options`, v),
    onSuccess: saved => {
      client.invalidateQueries({ queryKey: ['option-groups'] })
      toast.success(option ? `${saved.name} saved.` : `${saved.name} added.`)
      onClose()
    },
    onError: e => {
      if (e instanceof ApiError && e.code === 'name_taken') setError('name', { message: e.message })
      else toast.error(errorMessage(e))
    }
  })

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{option ? 'Edit option' : 'Add option'}</DialogTitle>
          <DialogDescription>In {group.name}.</DialogDescription>
        </DialogHeader>
        <form id='option-form' onSubmit={handleSubmit(v => save.mutate(v))} className='grid gap-4' noValidate>
          <FormField id='option-name' label='Name' error={errors.name?.message}>
            <Input id='option-name' {...register('name')} aria-invalid={!!errors.name} />
          </FormField>
          <FormField
            id='option-extraPrice'
            label='Extra price'
            error={errors.extraPrice?.message}
            hint='Added to every drink that offers it. Use 0 for free, or a minus for less, e.g. -0.50 for a single shot.'
          >
            <Input id='option-extraPrice' type='number' step='0.05' {...register('extraPrice')} />
          </FormField>
          <FormField id='option-sortOrder' label='Position' error={errors.sortOrder?.message} hint='Lower numbers come first.'>
            <Input id='option-sortOrder' type='number' min={0} {...register('sortOrder')} />
          </FormField>
          <div className='grid gap-1.5'>
            <div className='flex items-center justify-between gap-4'>
              <Label htmlFor='option-isIced'>This is the iced choice</Label>
              <Switch id='option-isIced' checked={watch('isIced')} onCheckedChange={v => setValue('isIced', v)} />
            </div>
            <p className='text-muted-foreground text-xs'>Mark the Iced option of the temperature group.</p>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <Label htmlFor='option-isActive'>Offer this option</Label>
            <Switch id='option-isActive' checked={watch('isActive')} onCheckedChange={v => setValue('isActive', v)} />
          </div>
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button type='submit' form='option-form' disabled={save.isPending}>
            {option ? 'Save option' : 'Add option'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
