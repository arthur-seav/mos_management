import { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import DataTable from '@/components/common/DataTable'
import ListCard from '@/components/common/ListCard'
import PageTitle from '@/components/common/PageTitle'
import { FlagBadge } from '@/components/common/StatusBadge'
import ChoiceSelect, { type Choice } from '@/components/menu/ChoiceSelect'
import { filterProducts, PRODUCT_STATUS_CHOICES, type ProductStatusFilter } from '@/components/menu/productFilters'
import ProductThumb from '@/components/menu/ProductThumb'
import { buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { money } from '@/lib/format'
import type { Category, Product } from '@/lib/types'

/**
 * The drinks list (FR-07). Staff mark a drink sold out or back on sale
 * (FR-22); admins also add and edit drinks (FR-25, FR-26).
 */
export default function ProductsPage() {
  const { isAdmin } = useAuth()
  const client = useQueryClient()
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState<ProductStatusFilter>('all')
  const [search, setSearch] = useState('')

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get<Product[]>('/api/admin/products')
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/admin/categories')
  })

  /** FR-22. The row then shows what came back from the server, not what was clicked. */
  const setAvailable = useMutation({
    mutationFn: ({ product, isAvailable }: { product: Product; isAvailable: boolean }) =>
      api.patch<Product>(`/api/admin/products/${product.id}/availability`, { isAvailable }),
    onSuccess: saved => {
      client.setQueryData<Product[]>(['products'], list => list?.map(p => (p.id === saved.id ? saved : p)))
      toast.success(saved.isAvailable ? `${saved.name} is back on sale.` : `${saved.name} is sold out.`)
    },
    onError: e => toast.error(errorMessage(e))
  })

  const categoryChoices: Choice[] = [
    { value: 'all', label: 'All categories' },
    ...categories.map(c => ({ value: String(c.id), label: c.name }))
  ]

  const shown = filterProducts(products, {
    categoryId: category === 'all' ? 'all' : Number(category),
    status,
    search
  })

  const columns: ColumnDef<Product, unknown>[] = [
    {
      id: 'picture',
      header: () => <span className='sr-only'>Picture</span>,
      cell: ({ row }) => <ProductThumb name={row.original.name} imageUrl={row.original.imageUrl} />
    },
    {
      header: 'Drink',
      cell: ({ row }) => (
        <div className='min-w-40'>
          <p className='font-medium'>{row.original.name}</p>
          {row.original.description && (
            <p className='text-muted-foreground truncate text-xs'>{row.original.description}</p>
          )}
        </div>
      )
    },
    { header: 'Category', cell: ({ row }) => row.original.categoryName },
    {
      header: 'Base price',
      cell: ({ row }) => <span className='text-price text-mocha'>{money(row.original.basePrice)}</span>
    },
    {
      header: 'On sale',
      cell: ({ row }) => (
        <Switch
          aria-label={`On sale: ${row.original.name}`}
          checked={row.original.isAvailable}
          disabled={!row.original.isActive || setAvailable.isPending}
          onCheckedChange={isAvailable => setAvailable.mutate({ product: row.original, isAvailable })}
        />
      )
    },
    {
      header: 'Status',
      cell: ({ row }) => <FlagBadge on={row.original.isActive} onLabel='Active' offLabel='Removed' />
    },
    ...(isAdmin
      ? [
          {
            id: 'actions',
            header: () => <span className='sr-only'>Actions</span>,
            cell: ({ row }: { row: { original: Product } }) => (
              <Link
                to={`/menu/products/${row.original.id}`}
                aria-label={`Edit ${row.original.name}`}
                className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
              >
                <PencilIcon />
              </Link>
            )
          } as ColumnDef<Product, unknown>
        ]
      : [])
  ]

  return (
    <>
      <PageTitle title='Drinks' description='Everything on the menu, with its price and whether it is on sale today.' />
      {error && <p role='alert' className='text-destructive'>{errorMessage(error)}</p>}
      <ListCard
        filters={
          <>
            <div className='grid gap-1.5'>
              <Label>Category</Label>
              <ChoiceSelect label='Category' value={category} onChange={setCategory} choices={categoryChoices} />
            </div>
            <div className='grid gap-1.5'>
              <Label>Status</Label>
              <ChoiceSelect
                label='Status'
                value={status}
                onChange={value => setStatus(value as ProductStatusFilter)}
                choices={PRODUCT_STATUS_CHOICES}
              />
            </div>
          </>
        }
        search={{ value: search, onChange: setSearch, placeholder: 'Search drinks' }}
        actions={
          isAdmin && (
            <Link to='/menu/products/new' className={buttonVariants()}>
              <PlusIcon />
              Add drink
            </Link>
          )
        }
      >
        <DataTable columns={columns} data={shown} loading={isLoading} empty='No drinks match these filters.' />
      </ListCard>
    </>
  )
}
