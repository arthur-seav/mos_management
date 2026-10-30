import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  defaultStaffValues,
  MIN_PASSWORD,
  ROLE_LABEL,
  STAFF_FIELD_FOR_CODE,
  staffBody,
  staffCreateBody,
  staffSchema,
  type StaffFormInput,
  type StaffFormValues
} from '@/components/accounts/staffForm'
import FormField from '@/components/common/FormField'
import PasswordInput from '@/components/common/PasswordInput'
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
import { api, ApiError, errorMessage } from '@/lib/api'
import { fullName, type User } from '@/lib/types'

/**
 * FR-27: add a staff account or edit one. An admin editing their own row
 * cannot change their role (the server answers self_lockout anyway).
 */
export default function StaffDialog({
  staff,
  isSelf,
  onClose
}: {
  staff: User | null
  isSelf: boolean
  onClose: () => void
}) {
  const client = useQueryClient()
  const isNew = staff === null
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors }
  } = useForm<StaffFormInput, unknown, StaffFormValues>({
    resolver: zodResolver(staffSchema(isNew)),
    defaultValues: defaultStaffValues(staff)
  })

  const save = useMutation({
    mutationFn: (values: StaffFormValues) =>
      staff
        ? api.put<User>(`/api/admin/staff/${staff.id}`, staffBody(values))
        : api.post<User>('/api/admin/staff', staffCreateBody(values)),
    onSuccess: saved => {
      client.invalidateQueries({ queryKey: ['staff'] })
      toast.success(isNew ? `${fullName(saved)} can now sign in.` : `${fullName(saved)} saved.`)
      onClose()
    },
    onError: error => {
      const field = error instanceof ApiError ? STAFF_FIELD_FOR_CODE[error.code] : undefined
      if (field) setError(field, { message: errorMessage(error) })
      else toast.error(errorMessage(error))
    }
  })

  const role = watch('role')

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{staff ? `Edit ${fullName(staff)}` : 'Add staff'}</DialogTitle>
          <DialogDescription>
            {isNew
              ? 'They sign in to the dashboard with this email or phone number.'
              : 'Changes apply the next time they load a page.'}
          </DialogDescription>
        </DialogHeader>
        <form id='staff-form' onSubmit={handleSubmit(values => save.mutate(values))} className='grid gap-4' noValidate>
          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField id='firstName' label='First name' error={errors.firstName?.message}>
              <Input id='firstName' autoComplete='off' {...register('firstName')} aria-invalid={!!errors.firstName} />
            </FormField>
            <FormField id='lastName' label='Last name' error={errors.lastName?.message}>
              <Input id='lastName' autoComplete='off' {...register('lastName')} aria-invalid={!!errors.lastName} />
            </FormField>
          </div>
          <FormField
            id='email'
            label='Email'
            error={errors.email?.message}
            hint='An email or a phone number is enough.'
          >
            <Input id='email' type='email' autoComplete='off' {...register('email')} aria-invalid={!!errors.email} />
          </FormField>
          <FormField id='phone' label='Phone' error={errors.phone?.message}>
            <Input id='phone' autoComplete='off' {...register('phone')} aria-invalid={!!errors.phone} />
          </FormField>
          <div className='grid gap-1.5'>
            <span className='text-sm leading-none font-medium'>Role</span>
            {isSelf ? (
              <p className='text-muted-foreground text-xs'>
                {ROLE_LABEL[role]} — you cannot change your own role.
              </p>
            ) : (
              <>
                <RadioGroup
                  value={role}
                  onValueChange={value => setValue('role', value === 'admin' ? 'admin' : 'staff')}
                  className='flex flex-wrap gap-6 pt-1'
                >
                  <Label className='gap-2 font-normal'>
                    <RadioGroupItem value='staff' aria-labelledby='role-staff-label' />
                    <span id='role-staff-label'>Staff</span>
                  </Label>
                  <Label className='gap-2 font-normal'>
                    <RadioGroupItem value='admin' aria-labelledby='role-admin-label' />
                    <span id='role-admin-label'>Admin</span>
                  </Label>
                </RadioGroup>
                <p className='text-muted-foreground text-xs'>
                  Staff do the daily order work. Admins also manage the menu, accounts and reports.
                </p>
              </>
            )}
          </div>
          {isNew && (
            <FormField
              id='password'
              label='Password'
              error={errors.password?.message}
              hint={`At least ${MIN_PASSWORD} characters. They can change it after signing in.`}
            >
              <PasswordInput
                id='password'
                autoComplete='new-password'
                {...register('password')}
                aria-invalid={!!errors.password}
              />
            </FormField>
          )}
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button type='submit' form='staff-form' disabled={save.isPending}>
            {isNew ? 'Add staff' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
