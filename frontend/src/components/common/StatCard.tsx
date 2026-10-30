import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** AdminCN's top stat card: icon tile and number on one line, label and a small note under it. */
export default function StatCard({
  icon: Icon,
  value,
  label,
  note,
  tone = 'default'
}: {
  icon: LucideIcon
  value: string | number
  label: string
  note?: string
  tone?: 'default' | 'attention'
}) {
  return (
    <Card className='shadow-none'>
      <CardContent className='flex flex-col gap-3'>
        <div className='flex items-center gap-3'>
          <span
            className={cn(
              'flex size-9 items-center justify-center rounded-md',
              tone === 'attention' ? 'bg-caramel/15 text-mocha' : 'bg-muted text-mocha'
            )}
          >
            <Icon className='size-5' />
          </span>
          <span className='text-heading'>{value}</span>
        </div>
        <div>
          <p className='text-section'>{label}</p>
          {note && <p className='text-muted-foreground text-xs'>{note}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
