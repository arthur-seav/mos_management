import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

/** AdminCN's footer: "Showing 1 to 10 of 42 entries" and Previous / Next. `page` is 0-based like the API. */
export default function TablePagination({
  page,
  size,
  total,
  onPageChange
}: {
  page: number
  size: number
  total: number
  onPageChange: (page: number) => void
}) {
  const from = total === 0 ? 0 : page * size + 1
  const to = Math.min(total, (page + 1) * size)
  const last = Math.max(0, Math.ceil(total / size) - 1)
  return (
    <div className='flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col'>
      <p className='text-muted-foreground text-sm whitespace-nowrap' aria-live='polite'>
        Showing {from} to {to} of {total} entries
      </p>
      <div className='flex items-center gap-1'>
        <Button variant='ghost' onClick={() => onPageChange(page - 1)} disabled={page <= 0} aria-label='Previous page'>
          <ChevronLeftIcon />
          <span className='max-sm:hidden'>Previous</span>
        </Button>
        <span className='text-muted-foreground px-2 text-sm'>
          Page {page + 1} of {last + 1}
        </span>
        <Button variant='ghost' onClick={() => onPageChange(page + 1)} disabled={page >= last} aria-label='Next page'>
          <span className='max-sm:hidden'>Next</span>
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  )
}
