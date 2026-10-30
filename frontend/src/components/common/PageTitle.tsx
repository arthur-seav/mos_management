import type { ReactNode } from 'react'

/** DG-F01 page title with an optional line under it and actions on the right. */
export default function PageTitle({
  title,
  description,
  actions
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className='mb-6 flex flex-wrap items-end justify-between gap-4'>
      <div>
        <h1 className='text-title'>{title}</h1>
        {description && <p className='text-muted-foreground mt-1'>{description}</p>}
      </div>
      {actions && <div className='flex items-center gap-2'>{actions}</div>}
    </div>
  )
}
