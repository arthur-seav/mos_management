import type { ReactNode } from 'react'

import { SearchIcon } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'

/**
 * AdminCN's list page (apps/users/list): one card with a filter row on
 * top, a toolbar (search on the left, actions on the right), the table,
 * and the pagination footer.
 */
export default function ListCard({
  filters,
  search,
  actions,
  children,
  footer
}: {
  filters?: ReactNode
  search?: { value: string; onChange: (value: string) => void; placeholder: string }
  actions?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Card className='gap-0 py-0 shadow-none'>
      <div className='border-b'>
        {filters && <div className='grid gap-4 border-b p-6 sm:grid-cols-2 lg:grid-cols-4'>{filters}</div>}
        {(search || actions) && (
          <div className='flex gap-4 p-6 max-sm:flex-col sm:items-center sm:justify-between'>
            {search ? (
              <div className='w-full max-w-xs'>
                <Label htmlFor='list-search' className='sr-only'>
                  {search.placeholder}
                </Label>
                <InputGroup>
                  <InputGroupAddon>
                    <SearchIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    id='list-search'
                    value={search.value}
                    onChange={e => search.onChange(e.target.value)}
                    placeholder={search.placeholder}
                  />
                </InputGroup>
              </div>
            ) : (
              <div />
            )}
            {actions && <div className='flex flex-wrap items-center gap-2'>{actions}</div>}
          </div>
        )}
        {children}
      </div>
      {footer}
    </Card>
  )
}
