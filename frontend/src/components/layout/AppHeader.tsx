import { Fragment, type ReactNode } from 'react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

/** AdminCN's top bar: sidebar toggle, breadcrumb on the left, actions on the right. */
export default function AppHeader({ crumbs, actions }: { crumbs: string[]; actions?: ReactNode }) {
  return (
    <header className='bg-card sticky top-0 z-40 border-b'>
      <div className='mx-auto flex max-w-360 items-center justify-between gap-6 px-4 py-2 sm:px-6'>
        <div className='flex items-center gap-4'>
          <SidebarTrigger className='[&_svg]:size-5!' />
          <Separator orientation='vertical' className='hidden h-4! data-vertical:self-center sm:block' />
          <Breadcrumb className='hidden sm:block'>
            <BreadcrumbList>
              {crumbs.map((label, i) => (
                <Fragment key={label + i}>
                  <BreadcrumbItem>
                    {i === crumbs.length - 1 ? <BreadcrumbPage>{label}</BreadcrumbPage> : <span>{label}</span>}
                  </BreadcrumbItem>
                  {i < crumbs.length - 1 && <BreadcrumbSeparator />}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className='flex items-center gap-1.5'>{actions}</div>
      </div>
    </header>
  )
}
