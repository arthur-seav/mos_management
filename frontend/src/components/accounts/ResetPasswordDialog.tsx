import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { MIN_PASSWORD } from '@/components/accounts/staffForm'
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
import { api, ApiError, errorMessage } from '@/lib/api'
import { fullName, type User } from '@/lib/types'

const schema = z
  .object({
    newPassword: z.string().min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters.`),
    confirmPassword: z.string()
  })
  .refine(values => values.newPassword === values.confirmPassword, {
    message: 'The two passwords are different.',
    path: ['confirmPassword']
  })

type Form = z.infer<typeof schema>

/** "Forgot your password? Ask the store admin." — the admin sets a new one here (FR-27). */
export default function ResetPasswordDialog({ staff, onClose }: { staff: User; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors }
  } = useForm<z.input<typeof schema>, unknown, Form>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' }
  })

  const save = useMutation({
    mutationFn: (values: Form) =>
      api.post<User>(`/api/admin/staff/${staff.id}/password`, { newPassword: values.newPassword }),
    onSuccess: () => {
      toast.success(`New password set for ${fullName(staff)}.`)
      onClose()
    },
    onError: error => {
      if (error instanceof ApiError && error.code === 'weak_password') {
        setError('newPassword', { message: error.message })
      } else toast.error(errorMessage(error))
    }
  })

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            {fullName(staff)} signs in with this password from now on. Tell it to them in person.
          </DialogDescription>
        </DialogHeader>
        <form
          id='reset-password-form'
          onSubmit={handleSubmit(values => save.mutate(values))}
          className='grid gap-4'
          noValidate
        >
          <FormField
            id='newPassword'
            label='New password'
            error={errors.newPassword?.message}
            hint={`At least ${MIN_PASSWORD} characters.`}
          >
            <PasswordInput
              id='newPassword'
              autoComplete='new-password'
              {...register('newPassword')}
              aria-invalid={!!errors.newPassword}
            />
          </FormField>
          <FormField id='confirmPassword' label='Type it again' error={errors.confirmPassword?.message}>
            <PasswordInput
              id='confirmPassword'
              autoComplete='new-password'
              {...register('confirmPassword')}
              aria-invalid={!!errors.confirmPassword}
            />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button type='submit' form='reset-password-form' disabled={save.isPending}>
            Set password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
