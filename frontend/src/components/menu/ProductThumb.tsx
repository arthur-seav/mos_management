import { CoffeeIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A drink's picture (FR-07). Drinks without one get a Latte-coloured square
 * with a coffee cup, so rows keep the same height.
 */
export default function ProductThumb({
  name,
  imageUrl,
  className
}: {
  name: string
  imageUrl: string | null
  className?: string
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn('size-10 shrink-0 rounded-md object-cover', className)}
        loading='lazy'
      />
    )
  }
  return (
    <div
      role='img'
      aria-label='No picture'
      className={cn('bg-accent text-mocha flex size-10 shrink-0 items-center justify-center rounded-md', className)}
    >
      <CoffeeIcon className='size-5' />
    </div>
  )
}
