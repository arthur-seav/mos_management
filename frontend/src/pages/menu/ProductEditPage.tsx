import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import FormField from '@/components/common/FormField'
import PageTitle from '@/components/common/PageTitle'
import ChoiceSelect, { type Choice } from '@/components/menu/ChoiceSelect'
import ProductImageCard from '@/components/menu/ProductImageCard'
import ProductOptionsCard from '@/components/menu/ProductOptionsCard'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError, errorMessage } from '@/lib/api'
import type { Category, Product } from '@/lib/types'
import { cn } from '@/lib/utils'

const schema = z.object({
  categoryId: z.string().regex(/^\d+$/, 'Choose a category.').transform(Number),
  name: z.string().trim().min(1, 'Enter a name.').max(100, 'Use 100 characters or fewer.'),
  description: z.string().trim().max(500, 'Use 500 characters or fewer.'),
  basePrice: z
    .string()
    .trim()
    .min(1, 'Enter a price.')
    .regex(/^\d+(\.\d{1,2})?$/, 'Use a price like 4.50.')
    .transform(Number),
  isActive: z.boolean()
})

type Form = z.output<typeof schema>

/** Fields the server can complain about by name (ApiError.fields). */
const FIELDS = ['categoryId', 'name', 'description', 'basePrice'] as const

/**
 * Add or edit one drink (FR-25): its details and price, its picture (FR-07)
 * and the options it offers (FR-26). Admin only; the API checks again.
 */
export default function ProductEditPage() {
  const { id } = useParams()
  const productId = id ? Number(id) : null

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/admin/categories')
  })
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.get<Product>(`/api/admin/products/${productId}`),
    enabled: productId !== null
  })

  const loading = productId !== null && (isLoading || !product)

  return (
    <>
      <Link
        to='/menu/products'
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-2 -ml-2')}
      >
        <ArrowLeftIcon />
        Drinks
      </Link>
      <PageTitle
        title={productId === null ? 'Add drink' : (product?.name ?? 'Drink')}
        description={
          productId === null ? 'A new drink starts off the menu until you put it on.' : 'Details, picture and options.'
        }
      />
      {error ? <p role='alert' className='text-destructive'>{errorMessage(error)}</p> : loading ? (
        <Card>
          <CardContent className='grid gap-3'>
            <Skeleton className='h-5 w-40' />
            <Skeleton className='h-5 w-64' />
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-6'>
          <DetailsCard key={product?.id ?? 'new'} product={product ?? null} categories={categories} />
          {product && <ProductImageCard product={product} />}
          {product && <ProductOptionsCard productId={product.id} />}
        </div>
      )}
    </>
  )
}

function DetailsCard({ product, categories }: { product: Product | null; categories: Category[] }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors }
  } = useForm<z.input<typeof schema>, unknown, Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: product ? String(product.categoryId) : '',
      name: product?.name ?? '',
      description: product?.description ?? '',
      basePrice: product ? product.basePrice.toFixed(2) : '',
      isActive: product?.isActive ?? false
    }
  })

  const save = useMutation({
    mutationFn: (values: Form) => {
      const body = {
        categoryId: values.categoryId,
        name: values.name,
        description: values.description === '' ? null : values.description,
        // The picture is set by its own upload; keep the one the drink already has.
        imageUrl: product?.imageUrl ?? null,
        basePrice: values.basePrice,
        isActive: values.isActive
      }
      return product
        ? api.put<Product>(`/api/admin/products/${product.id}`, body)
        : api.post<Product>('/api/admin/products', body)
    },
    onSuccess: saved => {
      client.invalidateQueries({ queryKey: ['products'] })
      client.setQueryData(['product', saved.id], saved)
      toast.success(product ? `${saved.name} saved.` : `${saved.name} added.`)
      if (!product) navigate(`/menu/products/${saved.id}`)
    },
    onError: e => {
      if (e instanceof ApiError && e.fields) {
        for (const field of FIELDS) {
          const message = e.fields[field]
          if (message) setError(field, { message })
        }
        return
      }
      toast.error(errorMessage(e))
    }
  })

  const categoryChoices: Choice[] = categories.map(c => ({ value: String(c.id), label: c.name }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
        <CardDescription>Name, category and price. The price is what the drink costs before options.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id='product-form' className='grid gap-4 sm:max-w-lg' noValidate onSubmit={handleSubmit(v => save.mutate(v))}>
          <FormField id='categoryId' label='Category' error={errors.categoryId?.message}>
            <ChoiceSelect
              label='Category'
              value={watch('categoryId')}
              onChange={value => setValue('categoryId', value)}
              choices={categoryChoices}
              placeholder='Choose a category'
              invalid={!!errors.categoryId}
            />
          </FormField>
          <FormField id='name' label='Name' error={errors.name?.message}>
            <Input id='name' {...register('name')} aria-invalid={!!errors.name} />
          </FormField>
          <FormField id='description' label='Description' error={errors.description?.message} hint='One short line.'>
            <Textarea id='description' rows={2} {...register('description')} />
          </FormField>
          <FormField id='basePrice' label='Base price' error={errors.basePrice?.message} hint='In US dollars.'>
            <Input id='basePrice' inputMode='decimal' {...register('basePrice')} aria-invalid={!!errors.basePrice} />
          </FormField>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <Label htmlFor='isActive'>On the menu</Label>
              <p className='text-muted-foreground text-xs'>Off keeps the drink and its options, but hides it.</p>
            </div>
            <Switch
              id='isActive'
              aria-label='On the menu'
              checked={watch('isActive')}
              onCheckedChange={value => setValue('isActive', value)}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className='border-t'>
        <Button type='submit' form='product-form' disabled={save.isPending}>
          {product ? 'Save' : 'Add drink'}
        </Button>
      </CardFooter>
    </Card>
  )
}
