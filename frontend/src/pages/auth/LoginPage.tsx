import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'

import FormField from '@/components/common/FormField'
import PasswordInput from '@/components/common/PasswordInput'
import { LogoMark } from '@/components/layout/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'

const schema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or phone number.'),
  password: z.string().min(1, 'Enter your password.')
})

type Form = z.infer<typeof schema>

/** AdminCN's centred sign-in card, for staff and admins (FR-03). */
export default function LoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [failure, setFailure] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Form>({ resolver: zodResolver(schema) })

  if (user) return <Navigate to='/' replace />

  const onSubmit = handleSubmit(async values => {
    setFailure(null)
    try {
      await signIn(values.identifier, values.password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (e) {
      setFailure(errorMessage(e))
    }
  })

  return (
    <div className='flex min-h-full items-center justify-center px-4 py-10'>
      <div className='bg-card w-full max-w-md rounded-xl border p-6 shadow-sm sm:p-8'>
        <div className='mb-6 flex items-center gap-2.5'>
          <LogoMark />
          <span className='font-heading text-xl font-semibold'>MOS</span>
        </div>
        <h1 className='text-heading'>Sign in to the store dashboard</h1>
        <p className='text-muted-foreground mt-1 mb-6'>For MOS staff and admins.</p>

        <form onSubmit={onSubmit} className='grid gap-4' noValidate>
          <FormField id='identifier' label='Email or phone*' error={errors.identifier?.message}>
            <Input
              id='identifier'
              autoComplete='username'
              placeholder='Enter your email or phone number'
              aria-invalid={!!errors.identifier}
              {...register('identifier')}
            />
          </FormField>
          <FormField id='password' label='Password*' error={errors.password?.message}>
            <PasswordInput
              id='password'
              autoComplete='current-password'
              placeholder='Enter your password'
              aria-invalid={!!errors.password}
              {...register('password')}
            />
          </FormField>
          {failure && (
            <p className='bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm' role='alert'>
              {failure}
            </p>
          )}
          <Button type='submit' size='lg' disabled={isSubmitting} className='mt-1 w-full'>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className='text-muted-foreground text-center text-xs'>Forgot your password? Ask the store admin.</p>
        </form>
      </div>
    </div>
  )
}
