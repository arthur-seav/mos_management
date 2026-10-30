import { useState, type ComponentProps } from 'react'

import { EyeIcon, EyeOffIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'

/** A password field with AdminCN's show/hide eye button. */
export default function PasswordInput(props: Omit<ComponentProps<'input'>, 'type'>) {
  const [shown, setShown] = useState(false)
  return (
    <div className='relative'>
      <Input {...props} type={shown ? 'text' : 'password'} className='pr-9' />
      <button
        type='button'
        onClick={() => setShown(s => !s)}
        className='text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-9 items-center justify-center'
        aria-label={shown ? 'Hide password' : 'Show password'}
      >
        {shown ? <EyeOffIcon className='size-4' /> : <EyeIcon className='size-4' />}
      </button>
    </div>
  )
}
