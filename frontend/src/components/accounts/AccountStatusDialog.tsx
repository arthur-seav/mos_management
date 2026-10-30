import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import ConfirmDialog from '@/components/common/ConfirmDialog'
import { api, errorMessage } from '@/lib/api'
import { fullName, type AccountStatus, type User } from '@/lib/types'

/** Which list the account belongs to: it decides the URL and the cache key. */
export type AccountGroup = 'staff' | 'customers'

/**
 * FR-27 / FR-31: deactivate or reactivate an account. Deactivating ends
 * the person's session at once, so it asks first.
 */
export default function AccountStatusDialog({
  account,
  group,
  onClose
}: {
  account: User
  group: AccountGroup
  onClose: () => void
}) {
  const client = useQueryClient()
  const next: AccountStatus = account.status === 'active' ? 'inactive' : 'active'
  const name = fullName(account)

  const change = useMutation({
    mutationFn: () => api.patch<User>(`/api/admin/${group}/${account.id}/status`, { status: next }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [group] })
      toast.success(next === 'inactive' ? `${name} is deactivated.` : `${name} can sign in again.`)
      onClose()
    },
    onError: error => toast.error(errorMessage(error))
  })

  return (
    <ConfirmDialog
      open
      onOpenChange={open => !open && onClose()}
      title={next === 'inactive' ? `Deactivate ${name}?` : `Reactivate ${name}?`}
      description={
        next === 'inactive'
          ? "They are signed out at once and can't sign in until reactivated."
          : 'They can sign in again straight away.'
      }
      confirmLabel={next === 'inactive' ? 'Deactivate' : 'Reactivate'}
      destructive={next === 'inactive'}
      busy={change.isPending}
      onConfirm={() => change.mutate()}
    />
  )
}
