import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className='flex flex-col items-center gap-4 py-24 text-center'>
      <p className='text-title'>Page not found</p>
      <p className='text-muted-foreground'>This page doesn't exist, or you don't have access to it.</p>
      <Button render={<Link to='/' />}>Back to overview</Button>
    </div>
  )
}
