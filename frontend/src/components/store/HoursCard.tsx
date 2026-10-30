import { useState, type FormEvent } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { hourRows, hoursPayload, hoursProblems } from '@/components/store/hours'
import SettingsCard from '@/components/store/SettingsCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { api, ApiError, errorMessage } from '@/lib/api'
import { WEEKDAYS } from '@/lib/format'
import type { DayHours, StoreInfo } from '@/lib/types'

/** FR-37: the opening hours of each day, and the days the shop stays closed. */
export default function HoursCard({
  hours,
  timeZone,
  canEdit
}: {
  hours: DayHours[]
  timeZone: string
  canEdit: boolean
}) {
  const client = useQueryClient()
  const [rows, setRows] = useState(() => hourRows(hours))
  const [problems, setProblems] = useState<Record<number, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => api.put<StoreInfo>('/api/admin/store/hours', hoursPayload(rows)),
    onSuccess: saved => {
      client.setQueryData(['store'], saved)
      setServerError(null)
      toast.success('Opening hours saved.')
    },
    onError: e => {
      if (e instanceof ApiError && e.code === 'bad_hours') setServerError(e.message)
      else toast.error(errorMessage(e))
    }
  })

  function update(dayOfWeek: number, patch: { openTime?: string; closeTime?: string; isClosed?: boolean }) {
    setRows(current => current.map(row => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)))
  }

  // Nothing leaves the page until every open day opens before it closes.
  function submit(event: FormEvent) {
    event.preventDefault()
    const found = hoursProblems(rows)
    setProblems(found)
    setServerError(null)
    if (Object.keys(found).length > 0) return
    save.mutate()
  }

  return (
    <SettingsCard
      title='Opening hours'
      description={`Times are in ${timeZone}. The last pickup slot is 60 minutes before closing.`}
      formId='hours-form'
      canEdit={canEdit}
      busy={save.isPending}
      error={serverError}
    >
      <form id='hours-form' onSubmit={submit} className='grid gap-3' noValidate>
        {rows.map(row => {
          const day = WEEKDAYS[row.dayOfWeek]
          const problem = problems[row.dayOfWeek]
          return (
            <div
              key={row.dayOfWeek}
              role='group'
              aria-label={day}
              className='grid gap-1 border-b pb-3 last:border-b-0 last:pb-0'
            >
              <div className='flex flex-wrap items-center gap-3'>
                <span className='w-24 font-medium'>{day}</span>
                <div className='flex items-center gap-2'>
                  <Switch
                    id={`closed-${row.dayOfWeek}`}
                    aria-label={`${day} closed`}
                    disabled={!canEdit}
                    checked={row.isClosed}
                    onCheckedChange={value => update(row.dayOfWeek, { isClosed: value })}
                  />
                  <Label htmlFor={`closed-${row.dayOfWeek}`} className='font-normal'>
                    Closed
                  </Label>
                </div>
                <Input
                  type='time'
                  className='w-32'
                  aria-label={`${day} opening time`}
                  disabled={!canEdit || row.isClosed}
                  value={row.openTime}
                  onChange={event => update(row.dayOfWeek, { openTime: event.target.value })}
                  aria-invalid={!!problem}
                />
                <span className='text-muted-foreground'>to</span>
                <Input
                  type='time'
                  className='w-32'
                  aria-label={`${day} closing time`}
                  disabled={!canEdit || row.isClosed}
                  value={row.closeTime}
                  onChange={event => update(row.dayOfWeek, { closeTime: event.target.value })}
                  aria-invalid={!!problem}
                />
              </div>
              {problem && (
                <p className='text-destructive text-xs' role='alert'>
                  {day}: {problem}
                </p>
              )}
            </div>
          )
        })}
      </form>
    </SettingsCard>
  )
}
