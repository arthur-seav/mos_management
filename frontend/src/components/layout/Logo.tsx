import { cn } from '@/lib/utils'

/** The MOS cup mark: Espresso square, On-Brand cup, Caramel steam. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 32 32' className={cn('size-8 shrink-0', className)} aria-hidden='true'>
      <rect width='32' height='32' rx='8' fill='#3B2418' />
      <path d='M9 12h12v5a6 6 0 0 1-12 0z' fill='#FFF8F1' />
      <path d='M21 13h1.5a2.5 2.5 0 0 1 0 5H21' fill='none' stroke='#FFF8F1' strokeWidth='1.6' />
      <path
        d='M12 8c0 1 1 1 1 2M16 8c0 1 1 1 1 2'
        stroke='#C8834A'
        strokeWidth='1.4'
        fill='none'
        strokeLinecap='round'
      />
    </svg>
  )
}
