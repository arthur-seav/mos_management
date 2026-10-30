import { PencilIcon, PlusIcon, SnowflakeIcon } from 'lucide-react'

import { extraPriceLabel, selectionLabel, sortOptions, summaryHint } from '@/components/options/optionGroupText'
import { FlagBadge } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { MenuOption, OptionGroup } from '@/lib/types'

/** FR-26: one option group with its options, the rules it puts on the customer, and the edit buttons. */
export default function OptionGroupCard({
  group,
  onEditGroup,
  onAddOption,
  onEditOption
}: {
  group: OptionGroup
  onEditGroup: () => void
  onAddOption: () => void
  onEditOption: (option: MenuOption) => void
}) {
  const hint = summaryHint(group)
  const options = sortOptions(group.options)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{group.name}</CardTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant={group.isRequired ? 'default' : 'secondary'}>{group.isRequired ? 'Required' : 'Optional'}</Badge>
          <Badge variant='outline'>{selectionLabel(group)}</Badge>
          {group.needsIcedDrink && (
            <Badge variant='outline' className='text-mocha'>
              <SnowflakeIcon />
              Only for iced drinks
            </Badge>
          )}
        </div>
        {hint && <p className='text-muted-foreground text-xs'>{hint}</p>}
        <CardAction>
          <Button variant='outline' size='sm' aria-label={`Edit group ${group.name}`} onClick={onEditGroup}>
            <PencilIcon />
            Edit group
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <p className='text-muted-foreground'>No options yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Option</TableHead>
                <TableHead>Extra price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options.map(option => (
                <TableRow key={option.id}>
                  <TableCell className='font-medium'>
                    {option.name}
                    {option.isIced && (
                      <Badge variant='outline' className='text-mocha ml-2'>
                        Iced
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className='text-mocha'>{extraPriceLabel(option.extraPrice)}</TableCell>
                  <TableCell>
                    <FlagBadge on={option.isActive} onLabel='Active' offLabel='Inactive' />
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      aria-label={`Edit ${option.name} in ${group.name}`}
                      onClick={() => onEditOption(option)}
                    >
                      <PencilIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter>
        <Button variant='outline' size='sm' aria-label={`Add option to ${group.name}`} onClick={onAddOption}>
          <PlusIcon />
          Add option
        </Button>
      </CardFooter>
    </Card>
  )
}
