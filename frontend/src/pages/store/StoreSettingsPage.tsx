import { useQuery } from '@tanstack/react-query'

import PageTitle from '@/components/common/PageTitle'
import HoursCard from '@/components/store/HoursCard'
import OnlineOrderingCard from '@/components/store/OnlineOrderingCard'
import PickupRulesCard from '@/components/store/PickupRulesCard'
import StoreInfoCard from '@/components/store/StoreInfoCard'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { StoreInfo } from '@/lib/types'

/**
 * FR-36, FR-37, FR-40: admins set the shop details, the pickup rules and the opening hours.
 * FR-41: staff and admins pause or resume online orders — the only part staff may change.
 */
export default function StoreSettingsPage() {
  const { isAdmin } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get<StoreInfo>('/api/admin/store')
  })

  return (
    <>
      <PageTitle
        title='Store settings'
        description={
          isAdmin
            ? 'Shop details, pickup rules and opening hours.'
            : 'Pause or resume online orders. The rest is for admins.'
        }
      />
      {isLoading || !data ? (
        <Skeleton className='h-40 w-full' />
      ) : (
        <div className='grid gap-6'>
          <OnlineOrderingCard info={data} />
          <StoreInfoCard settings={data.settings} canEdit={isAdmin} />
          <PickupRulesCard settings={data.settings} canEdit={isAdmin} />
          <HoursCard hours={data.hours} timeZone={data.timeZone} canEdit={isAdmin} />
        </div>
      )}
    </>
  )
}
