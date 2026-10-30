import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import DataTable from '@/components/common/DataTable'
import FormField from '@/components/common/FormField'
import ListCard from '@/components/common/ListCard'
import PageTitle from '@/components/common/PageTitle'
import { FlagBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { api, ApiError, errorMessage } from '@/lib/api'
import type { Category } from '@/lib/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(50),
  sortOrder: z.coerce.number().int().min(0, 'Use 0 or more.'),
  active: z.boolean()
})

type Form = z.infer<typeof schema>

/** FR-25: admins add, rename, reorder and deactivate categories. A deactivated category hides its drinks from the app. */
export default function CategoriesPage() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const { data = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/admin/categories')
  })

  const shown = data.filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase()))

  const columns: ColumnDef<Category, unknown>[] = [
    { header: 'Order', cell: ({ row }) => row.original.sortOrder },
    { header: 'Name', cell: ({ row }) => <span className='font-medium'>{row.original.name}</span> },
    { header: 'Drinks', cell: ({ row }) => row.original.productCount },
    {
      header: 'Status',
      cell: ({ row }) => <FlagBadge on={row.original.active} onLabel='Active' offLabel='Hidden' />
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => (
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={`Edit ${row.original.name}`}
          onClick={() => setEditing(row.original)}
        >
          <PencilIcon />
        </Button>
      )
    }
  ]

  return (
    <>
      <PageTitle title='Categories' description='Groups of drinks on the menu, in the order the app shows them.' />
      <ListCard
        search={{ value: search, onChange: setSearch, placeholder: 'Search categories' }}
        actions={
          <Button onClick={() => setEditing('new')}>
            <PlusIcon />
            Add category
          </Button>
        }
      >
        <DataTable columns={columns} data={shown} loading={isLoading} empty='No categories yet.' />
      </ListCard>
      {editing && <CategoryDialog category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function CategoryDialog({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const client = useQueryClient()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors }
  } = useForm<z.input<typeof schema>, unknown, Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: category?.name ?? '', sortOrder: category?.sortOrder ?? 0, active: category?.active ?? true }
  })

  const save = useMutation({
    mutationFn: (v: Form) =>
      category
        ? api.put<Category>(`/api/admin/categories/${category.id}`, v)
        : api.post<Category>('/api/admin/categories', v),
    onSuccess: saved => {
      client.invalidateQueries({ queryKey: ['categories'] })
      toast.success(category ? `${saved.name} saved.` : `${saved.name} added.`)
      onClose()
    },
    onError: e => {
      if (e instanceof ApiError && e.code === 'name_taken') setError('name', { message: e.message })
      else toast.error(errorMessage(e))
    }
  })

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit category' : 'Add category'}</DialogTitle>
        </DialogHeader>
        <form id='category-form' onSubmit={handleSubmit(v => save.mutate(v))} className='grid gap-4' noValidate>
          <FormField id='name' label='Name' error={errors.name?.message}>
            <Input id='name' {...register('name')} aria-invalid={!!errors.name} />
          </FormField>
          <FormField id='sortOrder' label='Position' error={errors.sortOrder?.message} hint='Lower numbers come first.'>
            <Input id='sortOrder' type='number' min={0} {...register('sortOrder')} />
          </FormField>
          <div className='flex items-center justify-between gap-4'>
            <Label htmlFor='active'>Show on the menu</Label>
            <Switch id='active' checked={watch('active')} onCheckedChange={v => setValue('active', v)} />
          </div>
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button type='submit' form='category-form' disabled={save.isPending}>
            {category ? 'Save' : 'Add category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
