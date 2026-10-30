import { useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PauseIcon, PlayIcon } from 'lucide-react'
import { toast } from 'sonner'

import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api, errorMessage } from '@/lib/api'
import type { StoreInfo } from '@/lib/types'

/** FR-41: staff and admins pause or resume online orders. Paused, the app blocks new orders; placed ones carry on (BR-14). */
export default function OnlineOrderingCard({ info }: { info: StoreInfo }) {
  const [confirming, setConfirming] = useState(false)
  const client = useQueryClient()
  const open = info.settings.onlineOrderingOpen

  const setOpen = useMutation({
    mutationFn: (next: boolean) => api.put<StoreInfo>('/api/admin/store/online-ordering', { open: next }),
    // The API answers with the whole store, so there is nothing to re-fetch.
    onSuccess: (saved, next) => {
      client.setQueryData(['store'], saved)
      setConfirming(false)
      toast.success(next ? 'Online ordering resumed.' : 'Online ordering paused.')
    },
    onError: e => toast.error(errorMessage(e))
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Online ordering</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <p className='text-heading'>{open ? 'Open' : 'Paused'}</p>
          <p className='text-muted-foreground text-sm'>
            {open
              ? 'Customers can order in the app.'
              : 'The app shows that ordering is paused and takes no new orders.'}{' '}
            {info.isOpenNow ? 'Open now' : 'Closed now'} by the opening hours.
          </p>
        </div>
        {open ? (
          <Button variant='destructive' disabled={setOpen.isPending} onClick={() => setConfirming(true)}>
            <PauseIcon />
            Pause online orders
          </Button>
        ) : (
          <Button disabled={setOpen.isPending} onClick={() => setOpen.mutate(true)}>
            <PlayIcon />
            Resume online orders
          </Button>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title='Pause online orders?'
        description="Customers can't place orders in the app until you resume. Orders already placed carry on."
        confirmLabel='Pause now'
        destructive
        busy={setOpen.isPending}
        onConfirm={() => setOpen.mutate(false)}
      />
    </Card>
  )
}
