import { useMutation, useQuery } from '@tanstack/react-query'
import { BanIcon, CalculatorIcon, CupSodaIcon, DollarSignIcon, DownloadIcon, ReceiptIcon } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

import PageTitle from '@/components/common/PageTitle'
import StatCard from '@/components/common/StatCard'
import BestSellersTable from '@/components/reports/BestSellersTable'
import { downloadBlob, exportFileName } from '@/components/reports/download'
import { periodFromParams, type DatePeriod } from '@/components/reports/period'
import PeriodFilter from '@/components/reports/PeriodFilter'
import RevenueByDayChart from '@/components/reports/RevenueByDayChart'
import SourceSplit from '@/components/reports/SourceSplit'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api, errorMessage } from '@/lib/api'
import { money, storeDate } from '@/lib/format'
import type { BestSeller, SalesReport } from '@/lib/types'

const BEST_SELLER_LIMIT = 10

/**
 * FR-28 sales for a chosen period (SA 9.3), FR-35 best sellers and FR-29
 * the Excel export. The period lives in the URL so a report can be shared.
 */
export default function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const today = storeDate()
  const { from, to } = periodFromParams(params.get('from'), params.get('to'), today)

  const setPeriod = (period: DatePeriod) => setParams({ from: period.from, to: period.to })

  const sales = useQuery({
    queryKey: ['reports', 'sales', from, to],
    queryFn: () => api.get<SalesReport>('/api/admin/reports/sales', { from, to })
  })

  const bestSellers = useQuery({
    queryKey: ['reports', 'best-sellers', from, to],
    queryFn: () => api.get<BestSeller[]>('/api/admin/reports/best-sellers', { from, to, limit: BEST_SELLER_LIMIT })
  })

  const exportToExcel = useMutation({
    mutationFn: () => api.get<Blob>('/api/admin/reports/export', { from, to }),
    onSuccess: file => {
      downloadBlob(file, exportFileName(from, to))
      toast.success('The report is downloading.')
    },
    onError: error => toast.error(errorMessage(error))
  })

  const report = sales.data

  return (
    <>
      <PageTitle
        title='Reports'
        description='Sales for the period you choose. Cancelled and rejected orders are left out of the money.'
        actions={
          <Button
            variant='outline'
            disabled={exportToExcel.isPending || sales.isError}
            onClick={() => exportToExcel.mutate()}
          >
            <DownloadIcon />
            Export to Excel
          </Button>
        }
      />
      <Card className='mb-6 shadow-none'>
        <CardContent>
          <PeriodFilter period={{ from, to }} today={today} onChange={setPeriod} />
        </CardContent>
      </Card>

      {sales.isError && (
        <Alert variant='destructive' className='mb-6'>
          <AlertTitle>No report for this period</AlertTitle>
          <AlertDescription>{errorMessage(sales.error)}</AlertDescription>
        </Alert>
      )}

      {report ? (
        <div className='grid gap-6'>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
            <StatCard icon={DollarSignIcon} value={money(report.revenue)} label='Revenue' note='Non-cancelled orders placed in the period.' />
            <StatCard icon={ReceiptIcon} value={report.orders} label='Orders' note='Orders that reached staff.' />
            <StatCard icon={CupSodaIcon} value={report.drinks} label='Drinks sold' note='Cups across all orders.' />
            <StatCard
              icon={CalculatorIcon}
              value={money(report.averageOrder)}
              label='Average order'
              note='Revenue divided by orders.'
            />
            <StatCard
              icon={BanIcon}
              value={report.cancelledOrRejected}
              label='Cancelled or rejected'
              note='Not counted in revenue.'
              tone='attention'
            />
          </div>
          <RevenueByDayChart byDay={report.byDay} />
          <SourceSplit bySource={report.bySource} />
          {bestSellers.isError ? <p role='alert' className='text-destructive'>{errorMessage(bestSellers.error)}</p> : <BestSellersTable bestSellers={bestSellers.data ?? []} />}
        </div>
      ) : (
        !sales.isError && (
          <div className='grid gap-6'>
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className='h-28 w-full' />
              ))}
            </div>
            <Skeleton className='h-80 w-full' />
          </div>
        )
      )}
    </>
  )
}
