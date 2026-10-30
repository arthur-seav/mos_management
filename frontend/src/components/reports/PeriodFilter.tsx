import FormField from '@/components/common/FormField'
import {
  matchingQuickRange,
  periodDays,
  QUICK_RANGES,
  quickPeriod,
  type DatePeriod
} from '@/components/reports/period'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * FR-28 (SA 9.3): four quick periods plus hand-picked dates. The inputs
 * carry min/max so a backwards period cannot be picked by mistake.
 */
export default function PeriodFilter({
  period,
  today,
  onChange
}: {
  period: DatePeriod
  today: string
  onChange: (period: DatePeriod) => void
}) {
  const active = matchingQuickRange(period, today)
  const days = periodDays(period)

  return (
    <div className='flex flex-wrap items-end justify-between gap-6'>
      <div className='grid gap-1.5'>
        <span className='text-sm leading-none font-medium'>Period</span>
        <div className='flex flex-wrap gap-2'>
          {QUICK_RANGES.map(range => (
            <Button
              key={range.id}
              size='sm'
              variant={active === range.id ? 'default' : 'outline'}
              aria-pressed={active === range.id}
              onClick={() => onChange(quickPeriod(range.id, today))}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>
      <div className='flex flex-wrap items-start gap-3'>
        <FormField id='from' label='From'>
          <Input
            id='from'
            type='date'
            value={period.from}
            max={period.to}
            onChange={event => event.target.value && onChange({ from: event.target.value, to: period.to })}
          />
        </FormField>
        <FormField id='to' label='To'>
          <Input
            id='to'
            type='date'
            value={period.to}
            min={period.from}
            max={today}
            onChange={event => event.target.value && onChange({ from: period.from, to: event.target.value })}
          />
        </FormField>
      </div>
      <p className='text-muted-foreground text-sm'>
        {days > 0 ? `${days} day${days === 1 ? '' : 's'} of sales.` : 'The start date is later than the end date.'}
      </p>
    </div>
  )
}
