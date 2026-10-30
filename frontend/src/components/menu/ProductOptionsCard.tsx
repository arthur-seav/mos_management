import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  draftsFromView,
  optionsProblems,
  optionsRequest,
  type GroupDraft,
  type OptionsProblems
} from '@/components/menu/productOptions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError, errorMessage } from '@/lib/api'
import { moneySigned } from '@/lib/format'
import type { ProductGroupSetting, ProductOptionsView } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Errors the server raises for this body (OptionAdminService.saveProductOptions). */
const SHOWN_CODES = ['empty_group', 'bad_default', 'bad_option', 'bad_group']

/**
 * FR-26: which option groups this drink offers, which options inside them, the
 * default, and the drink's own price for an option (TC-14, TC-15).
 */
export default function ProductOptionsCard({ productId }: { productId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['product-options', productId],
    queryFn: () => api.get<ProductOptionsView>(`/api/admin/products/${productId}/options`)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Options</CardTitle>
        <CardDescription>
          Pick the groups this drink offers. An empty price box means the group's own price.
        </CardDescription>
      </CardHeader>
      {isLoading || !data ? (
        <CardContent className='grid gap-3'>
          <Skeleton className='h-5 w-48' />
          <Skeleton className='h-5 w-64' />
        </CardContent>
      ) : (
        <OptionsEditor key={productId} productId={productId} groups={data.groups} />
      )}
    </Card>
  )
}

function OptionsEditor({ productId, groups }: { productId: number; groups: ProductGroupSetting[] }) {
  const client = useQueryClient()
  const [drafts, setDrafts] = useState<GroupDraft[]>(() => draftsFromView(groups))
  const [errors, setErrors] = useState<string[]>([])

  const warnings: OptionsProblems['warnings'] = optionsProblems(groups, drafts).warnings

  const save = useMutation({
    mutationFn: () => api.put<ProductOptionsView>(`/api/admin/products/${productId}/options`, optionsRequest(drafts)),
    onSuccess: saved => {
      setErrors([])
      setDrafts(draftsFromView(saved.groups))
      client.setQueryData(['product-options', productId], saved)
      toast.success('Options saved.')
    },
    onError: e => {
      if (e instanceof ApiError && SHOWN_CODES.includes(e.code)) setErrors([e.message])
      else toast.error(errorMessage(e))
    }
  })

  function patchGroup(groupId: number, change: Partial<GroupDraft>) {
    setDrafts(list => list.map(g => (g.groupId === groupId ? { ...g, ...change } : g)))
  }

  function patchOption(groupId: number, optionId: number, change: { offered?: boolean; price?: string }) {
    setDrafts(list =>
      list.map(g =>
        g.groupId === groupId
          ? { ...g, options: g.options.map(o => (o.optionId === optionId ? { ...o, ...change } : o)) }
          : g
      )
    )
  }

  function submit() {
    const problems = optionsProblems(groups, drafts)
    setErrors(problems.errors)
    if (problems.errors.length === 0) save.mutate()
  }

  return (
    <>
      <CardContent className='grid gap-6'>
        {groups.map(group => {
          const draft = drafts.find(d => d.groupId === group.groupId)
          if (!draft) return null
          return (
            <section
              key={group.groupId}
              aria-label={`Options: ${group.name}`}
              className='border-border grid gap-3 border-t pt-6 first:border-0 first:pt-0'
            >
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <Label className='gap-2 font-medium'>
                  <Checkbox
                    checked={draft.offered}
                    onCheckedChange={offered => patchGroup(group.groupId, { offered })}
                  />
                  {`Offer ${group.name}`}
                </Label>
                <span className='text-muted-foreground text-xs'>
                  {group.isRequired ? 'Required' : 'Optional'} ·{' '}
                  {group.selectionType === 'single' ? 'Pick one' : `Pick up to ${group.maxSelect}`}
                </span>
              </div>

              {draft.offered && (
                <RadioGroup
                  className='gap-2'
                  value={draft.defaultOptionId === null ? 'none' : String(draft.defaultOptionId)}
                  onValueChange={value =>
                    patchGroup(group.groupId, {
                      defaultOptionId: value === 'none' || value === null ? null : Number(value)
                    })
                  }
                >
                  {group.options.map(option => {
                    const row = draft.options.find(o => o.optionId === option.optionId)
                    if (!row) return null
                    return (
                      <div
                        key={option.optionId}
                        className='grid items-center gap-3 sm:grid-cols-[1fr_auto_8rem_auto]'
                      >
                        <Label className={cn('gap-2', !option.optionActive && 'text-muted-foreground')}>
                          <Checkbox
                            checked={row.offered}
                            onCheckedChange={offered => patchOption(group.groupId, option.optionId, { offered })}
                          />
                          {option.optionActive ? option.name : `${option.name} (inactive)`}
                        </Label>
                        <span className='text-muted-foreground text-xs whitespace-nowrap'>
                          Group price {moneySigned(option.groupPrice)}
                        </span>
                        <Input
                          className='h-8'
                          inputMode='decimal'
                          placeholder='Group price'
                          aria-label={`Price for this drink: ${option.name}`}
                          disabled={!row.offered}
                          value={row.price}
                          onChange={event =>
                            patchOption(group.groupId, option.optionId, { price: event.target.value })
                          }
                        />
                        <div className='flex items-center gap-2'>
                          <RadioGroupItem
                            value={String(option.optionId)}
                            aria-label={`Default: ${option.name}`}
                            disabled={!row.offered}
                          />
                          <span className='text-muted-foreground text-xs'>Default</span>
                        </div>
                      </div>
                    )
                  })}
                  {!group.isRequired && (
                    <div className='flex items-center gap-2'>
                      <RadioGroupItem value='none' aria-label={`No default: ${group.name}`} />
                      <span className='text-muted-foreground text-xs'>No default</span>
                    </div>
                  )}
                </RadioGroup>
              )}
            </section>
          )
        })}

        {errors.length > 0 && (
          <div role='alert' className='text-destructive grid gap-1 text-xs'>
            {errors.map(message => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}
        {warnings.length > 0 && (
          <div className='text-mocha grid gap-1 text-xs'>
            {warnings.map(message => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className='border-t'>
        <Button onClick={submit} disabled={save.isPending}>
          Save options
        </Button>
      </CardFooter>
    </>
  )
}
