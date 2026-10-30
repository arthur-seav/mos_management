import { useQuery } from '@tanstack/react-query'
import {
  BanknoteIcon,
  ClipboardListIcon,
  CoffeeIcon,
  CupSodaIcon,
  HourglassIcon,
  ListChecksIcon,
  PlusIcon,
  Undo2Icon,
  WifiIcon
} from 'lucide-react'
import { Link } from 'react-router'

import PageTitle from '@/components/common/PageTitle'
import StatCard from '@/components/common/StatCard'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api, errorMessage } from '@/lib/api'
import { date, money } from '@/lib/format'
import type { Overview } from '@/lib/types'

/** Confirmed, preparing and ready are all "being worked on" (SA 6.10). */
export function inProgressCount(overview: Overview): number {
  return overview.confirmed + overview.preparing + overview.ready
}

/** FR-42 / SA 7.4: what the store needs to know the moment the dashboard opens. Polled every 10 s. */
export default function OverviewPage() {
  const { data, error } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.get<Overview>('/api/admin/overview'),
    refetchInterval: 10_000
  })

  return (
    <>
      <PageTitle
        title='Overview'
        description={date(new Date().toISOString())}
        actions={
          <>
            <Link className={buttonVariants({ variant: 'outline' })} to='/orders/queue'>
              <ListChecksIcon />
              Open order queue
            </Link>
            <Link className={buttonVariants()} to='/orders/new'>
              <PlusIcon />
              New walk-in order
            </Link>
          </>
        }
      />
      {error && <p role='alert' className='text-destructive'>Overview could not refresh: {errorMessage(error)}</p>}
      {!data && !error ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className='h-28 w-full' />
          ))}
        </div>
      ) : data ? (
        <div className='grid gap-4'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <StatCard icon={ClipboardListIcon} value={data.ordersToday} label='Orders today' />
            {data.revenueToday !== null && (
              <StatCard icon={BanknoteIcon} value={money(data.revenueToday)} label='Revenue today' />
            )}
            <StatCard
              icon={HourglassIcon}
              value={data.placed}
              label='Waiting'
              note='New orders not confirmed yet'
              tone={data.placed > 0 ? 'attention' : 'default'}
            />
            <StatCard
              icon={Undo2Icon}
              value={data.refundsPending}
              label='Refunds pending'
              note='Money to hand back'
              tone={data.refundsPending > 0 ? 'attention' : 'default'}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <StatCard
              icon={CoffeeIcon}
              value={inProgressCount(data)}
              label='In progress'
              note={`${data.confirmed} confirmed · ${data.preparing} preparing · ${data.ready} ready`}
            />
            <Link to='/menu/products' className='rounded-xl focus-visible:ring-3 focus-visible:outline-none'>
              <StatCard
                icon={CupSodaIcon}
                value={data.soldOut}
                label='Sold-out drinks'
                note='Open the drinks list'
                tone={data.soldOut > 0 ? 'attention' : 'default'}
              />
            </Link>
            <StatCard
              icon={WifiIcon}
              value={data.onlineOrderingOpen ? 'Open' : 'Paused'}
              label='Online ordering'
              note={data.onlineOrderingOpen ? 'Customers can order in the app' : 'The app is not taking orders'}
              tone={data.onlineOrderingOpen ? 'default' : 'attention'}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
