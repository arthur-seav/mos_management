import { useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import FormField from '@/components/common/FormField'
import ProductThumb from '@/components/menu/ProductThumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api, errorMessage } from '@/lib/api'
import type { Product } from '@/lib/types'

/** FR-07: the drink's picture. Uploading replaces it right away (POST /products/{id}/image). */
export default function ProductImageCard({ product }: { product: Product }) {
  const client = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<Product>(`/api/admin/products/${product.id}/image`, form)
    },
    onSuccess: saved => {
      setError(null)
      client.setQueryData(['product', saved.id], saved)
      client.invalidateQueries({ queryKey: ['products'] })
      toast.success('Picture updated.')
    },
    onError: e => setError(errorMessage(e))
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Picture</CardTitle>
        <CardDescription>Shown on the menu. A square photo looks best.</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-wrap items-end gap-6'>
        <ProductThumb name={product.name} imageUrl={product.imageUrl} className='size-24' />
        <div className='w-full max-w-sm'>
          <FormField
            id='picture'
            label='New picture'
            error={error ?? undefined}
            hint={upload.isPending ? 'Uploading…' : 'JPG, PNG or WebP.'}
          >
            <Input
              id='picture'
              type='file'
              accept='image/jpeg,image/png,image/webp'
              disabled={upload.isPending}
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) upload.mutate(file)
              }}
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  )
}
