import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'

import PageTitle from '@/components/common/PageTitle'
import OptionDialog from '@/components/options/OptionDialog'
import OptionGroupCard from '@/components/options/OptionGroupCard'
import OptionGroupDialog from '@/components/options/OptionGroupDialog'
import { sortGroups } from '@/components/options/optionGroupText'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { MenuOption, OptionGroup } from '@/lib/types'

/** FR-26: admins set up the choices customers make on a drink (ice, sugar, size, shots) and what each one costs. */
export default function OptionGroupsPage() {
  const [groupDialog, setGroupDialog] = useState<OptionGroup | 'new' | null>(null)
  const [optionDialog, setOptionDialog] = useState<{ group: OptionGroup; option: MenuOption | null } | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['option-groups'],
    queryFn: () => api.get<OptionGroup[]>('/api/admin/option-groups')
  })

  const groups = sortGroups(data)

  return (
    <>
      <PageTitle
        title='Options'
        description="Choices offered on drinks. Which groups a drink offers, its own prices and its defaults are set on that drink's page."
        actions={
          <Button onClick={() => setGroupDialog('new')}>
            <PlusIcon />
            Add group
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className='text-muted-foreground py-10 text-center'>No option groups yet.</CardContent>
        </Card>
      ) : (
        <div className='grid gap-6'>
          {groups.map(group => (
            <OptionGroupCard
              key={group.id}
              group={group}
              onEditGroup={() => setGroupDialog(group)}
              onAddOption={() => setOptionDialog({ group, option: null })}
              onEditOption={option => setOptionDialog({ group, option })}
            />
          ))}
        </div>
      )}
      {groupDialog && (
        <OptionGroupDialog group={groupDialog === 'new' ? null : groupDialog} onClose={() => setGroupDialog(null)} />
      )}
      {optionDialog && (
        <OptionDialog group={optionDialog.group} option={optionDialog.option} onClose={() => setOptionDialog(null)} />
      )}
    </>
  )
}
