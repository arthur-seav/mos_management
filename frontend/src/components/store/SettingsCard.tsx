import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * One settings card with its own Save button (AdminCN form layout). Staff see the
 * same fields read-only: only admins may change store settings (SA 1.5).
 */
export default function SettingsCard({
  title,
  description,
  formId,
  canEdit,
  busy,
  error,
  children
}: {
  title: string
  description?: string
  formId: string
  canEdit: boolean
  busy?: boolean
  error?: string | null
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      <CardFooter className='border-t'>
        {canEdit ? (
          <div className='flex flex-wrap items-center gap-3'>
            <Button type='submit' form={formId} disabled={busy} aria-label={`Save ${title.toLowerCase()}`}>
              Save
            </Button>
            {error && (
              <p className='text-destructive text-xs' role='alert'>
                {error}
              </p>
            )}
          </div>
        ) : (
          <p className='text-muted-foreground text-xs'>Only admins can change these.</p>
        )}
      </CardFooter>
    </Card>
  )
}
