import PageTitle from '@/components/common/PageTitle'
import { Card, CardContent } from '@/components/ui/card'

export default function OverviewPage() {
  return (
    <>
      <PageTitle title='Overview' description='Today at the store.' />
      <Card>
        <CardContent className='text-muted-foreground py-10 text-center'>The dashboard is being set up.</CardContent>
      </Card>
    </>
  )
}
