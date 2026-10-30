import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'

/** Label, control and the error under it. */
export default function FormField({
  id,
  label,
  error,
  hint,
  children
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className='grid gap-1.5'>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className='text-destructive text-xs' role='alert'>
          {error}
        </p>
      ) : (
        hint && <p className='text-muted-foreground text-xs'>{hint}</p>
      )}
    </div>
  )
}
