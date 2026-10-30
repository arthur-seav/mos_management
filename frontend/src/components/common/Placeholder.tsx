import PageTitle from '@/components/common/PageTitle'
import { Card, CardContent } from '@/components/ui/card'

/** Stands in for a page until it is built. */
export default function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageTitle title={title} />
      <Card>
        <CardContent className='text-muted-foreground py-10 text-center'>Coming soon.</CardContent>
      </Card>
    </>
  )
}
