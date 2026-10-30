import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** One column of the board: its name, how many orders are in it, and the cards. */
export default function QueueColumn({
  title,
  count,
  loading,
  empty,
  children
}: {
  title: string
  count: number
  loading?: boolean
  empty: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className='grid content-start gap-3'>
      <div className='flex items-center justify-between gap-2'>
        <h2 className='text-section'>{title}</h2>
        <span className='bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-semibold'>{count}</span>
      </div>
      {loading ? (
        <>
          {[0, 1].map(i => (
            <Card key={i} size='sm'>
              <CardContent className='grid gap-2'>
                <Skeleton className='h-6 w-20' />
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-9 w-full' />
              </CardContent>
            </Card>
          ))}
        </>
      ) : count === 0 ? (
        <p className='text-muted-foreground text-sm'>{empty}</p>
      ) : (
        children
      )}
    </section>
  )
}
