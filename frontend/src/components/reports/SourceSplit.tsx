import { Card, CardContent } from '@/components/ui/card'
import { money, SOURCE_LABEL } from '@/lib/format'
import type { OrderSource, SourceSales } from '@/lib/types'

/** Every source the API can report, so a quiet channel still shows as zero. */
const SOURCES: OrderSource[] = ['online', 'walk_in']

const NOTE: Record<OrderSource, string> = {
  online: 'Ordered in the app.',
  walk_in: 'Taken at the counter.'
}

/** FR-28: how the period splits between app orders and the counter. */
export default function SourceSplit({ bySource }: { bySource: SourceSales[] }) {
  return (
    <div className='grid gap-4 sm:grid-cols-2'>
      {SOURCES.map(source => {
        const row = bySource.find(entry => entry.source === source)
        const orders = row?.orders ?? 0
        return (
          <Card key={source} className='shadow-none'>
            <CardContent className='grid gap-1'>
              <p className='text-section'>{SOURCE_LABEL[source]}</p>
              <p className='text-heading'>{money(row?.revenue ?? 0)}</p>
              <p className='text-muted-foreground text-xs'>
                {orders} {orders === 1 ? 'order' : 'orders'} · {NOTE[source]}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
