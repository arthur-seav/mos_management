import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { money } from '@/lib/format'
import type { DaySales } from '@/lib/types'

/** SA colours: Espresso bars, Caramel for the bar under the pointer (index.css). */
const config = {
  revenue: { label: 'Revenue', color: 'var(--chart-1)' },
  hover: { label: 'Revenue', color: 'var(--chart-2)' }
} satisfies ChartConfig

const tickFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })

/** "Oct 29" under a bar, from the API's store-local "YYYY-MM-DD". */
export function dayTick(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  return tickFmt.format(new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1)))
}

/** FR-28: the money taken on each day of the period. */
export default function RevenueByDayChart({ byDay }: { byDay: DaySales[] }) {
  return (
    <Card className='shadow-none'>
      <CardHeader>
        <CardTitle>Revenue by day</CardTitle>
      </CardHeader>
      <CardContent>
        {byDay.length === 0 ? (
          <p className='text-muted-foreground py-10 text-center text-sm'>No sales in this period.</p>
        ) : (
          <ChartContainer config={config} className='h-64 w-full'>
            <BarChart data={byDay} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis dataKey='date' tickFormatter={dayTick} tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickFormatter={value => money(Number(value))} tickLine={false} axisLine={false} width={72} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={label => dayTick(String(label))} />} />
              <Bar
                dataKey='revenue'
                fill='var(--color-revenue)'
                activeBar={{ fill: 'var(--color-hover)' }}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
