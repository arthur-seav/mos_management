import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import FormField from '@/components/common/FormField'
import PageTitle from '@/components/common/PageTitle'
import PasswordInput from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { api, ApiError } from '@/lib/api'

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().min(8, 'Use at least 8 characters.'),
    confirm: z.string()
  })
  .refine(v => v.newPassword === v.confirm, { path: ['confirm'], message: "The passwords don't match." })

type Form = z.infer<typeof schema>

/** FR-30: current password first, then the new one twice. */
export default function ChangePasswordPage() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async v => {
    try {
      await api.post('/api/admin/me/password', { currentPassword: v.currentPassword, newPassword: v.newPassword })
      reset()
      toast.success('Password changed.')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'wrong_password') setError('currentPassword', { message: e.message })
      else setError('newPassword', { message: e instanceof ApiError ? e.message : 'Try again.' })
    }
  })

  return (
    <>
      <PageTitle title='Change password' />
      <Card className='max-w-lg'>
        <CardContent>
          <form onSubmit={onSubmit} className='grid gap-4' noValidate>
            <FormField id='currentPassword' label='Current password' error={errors.currentPassword?.message}>
              <PasswordInput id='currentPassword' autoComplete='current-password' {...register('currentPassword')} />
            </FormField>
            <FormField id='newPassword' label='New password' error={errors.newPassword?.message} hint='At least 8 characters.'>
              <PasswordInput id='newPassword' autoComplete='new-password' {...register('newPassword')} />
            </FormField>
            <FormField id='confirm' label='Type the new password again' error={errors.confirm?.message}>
              <PasswordInput id='confirm' autoComplete='new-password' {...register('confirm')} />
            </FormField>
            <div>
              <Button type='submit' disabled={isSubmitting}>
                Change password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
