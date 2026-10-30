import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { groupBody } from '@/components/options/optionGroupText'
import FormField from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { api, ApiError, errorMessage } from '@/lib/api'
import type { OptionGroup, SelectionType } from '@/lib/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(50, 'Keep it under 50 characters.'),
  selectionType: z.enum(['single', 'multiple']),
  isRequired: z.boolean(),
  maxSelect: z.coerce.number().int().min(1, 'At least 1.').max(20, '20 at most.'),
  sortOrder: z.coerce.number().int().min(0, 'Use 0 or more.'),
  needsIcedDrink: z.boolean(),
  summaryNoun: z.string().trim().max(20, 'Keep it under 20 characters.')
})

type Form = z.infer<typeof schema>

/** FR-26: add or rename a group of choices and the rules it puts on the customer. */
export default function OptionGroupDialog({ group, onClose }: { group: OptionGroup | null; onClose: () => void }) {
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
      name: group?.name ?? '',
      selectionType: group?.selectionType ?? 'single',
      isRequired: group?.isRequired ?? false,
      maxSelect: group?.maxSelect ?? 1,
      sortOrder: group?.sortOrder ?? 0,
      needsIcedDrink: group?.needsIcedDrink ?? false,
      summaryNoun: group?.summaryNoun ?? ''
    }
  })

  const selectionType = watch('selectionType')

  const save = useMutation({
    mutationFn: (v: Form) =>
      group
        ? api.put<OptionGroup>(`/api/admin/option-groups/${group.id}`, groupBody(v))
        : api.post<OptionGroup>('/api/admin/option-groups', groupBody(v)),
    onSuccess: saved => {
      client.invalidateQueries({ queryKey: ['option-groups'] })
      toast.success(group ? `${saved.name} saved.` : `${saved.name} added.`)
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
          <DialogTitle>{group ? 'Edit group' : 'Add group'}</DialogTitle>
        </DialogHeader>
        <form id='group-form' onSubmit={handleSubmit(v => save.mutate(v))} className='grid gap-4' noValidate>
          <FormField id='group-name' label='Name' error={errors.name?.message}>
            <Input id='group-name' {...register('name')} aria-invalid={!!errors.name} />
          </FormField>
          <div className='grid gap-1.5'>
            <Label>Choice type</Label>
            <RadioGroup
              value={selectionType}
              onValueChange={value => setValue('selectionType', value as SelectionType)}
              className='flex flex-wrap gap-6'
            >
              <Label className='font-normal'>
                <RadioGroupItem value='single' />
                Single
              </Label>
              <Label className='font-normal'>
                <RadioGroupItem value='multiple' />
                Multiple
              </Label>
            </RadioGroup>
            <p className='text-muted-foreground text-xs'>
              Single lets the customer pick one choice; multiple lets them pick several.
            </p>
          </div>
          {selectionType === 'multiple' && (
            <FormField
              id='group-maxSelect'
              label='Max picks'
              error={errors.maxSelect?.message}
              hint='How many options one customer can choose (1 to 20).'
            >
              <Input id='group-maxSelect' type='number' min={1} max={20} {...register('maxSelect')} />
            </FormField>
          )}
          <div className='flex items-center justify-between gap-4'>
            <Label htmlFor='group-isRequired'>Customers must choose</Label>
            <Switch
              id='group-isRequired'
              checked={watch('isRequired')}
              onCheckedChange={v => setValue('isRequired', v)}
            />
          </div>
          <FormField id='group-sortOrder' label='Position' error={errors.sortOrder?.message} hint='Lower numbers come first.'>
            <Input id='group-sortOrder' type='number' min={0} {...register('sortOrder')} />
          </FormField>
          <div className='grid gap-1.5'>
            <div className='flex items-center justify-between gap-4'>
              <Label htmlFor='group-needsIcedDrink'>Only for iced drinks</Label>
              <Switch
                id='group-needsIcedDrink'
                checked={watch('needsIcedDrink')}
                onCheckedChange={v => setValue('needsIcedDrink', v)}
              />
            </div>
            <p className='text-muted-foreground text-xs'>
              Hide this group when the customer picks a hot drink (ice level).
            </p>
          </div>
          <FormField
            id='group-summaryNoun'
            label='Summary noun'
            error={errors.summaryNoun?.message}
            hint='Added after short option names in orders, e.g. Less → Less ice.'
          >
            <Input id='group-summaryNoun' {...register('summaryNoun')} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button type='submit' form='group-form' disabled={save.isPending}>
            {group ? 'Save group' : 'Add group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
