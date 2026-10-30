import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { money } from '@/lib/format'
import type { BestSeller } from '@/lib/types'

/**
 * FR-35: the best-selling drinks of the period, in the order the API ranks
 * them (most cups first). The screen never re-sorts them.
 */
export default function BestSellersTable({ bestSellers }: { bestSellers: BestSeller[] }) {
  return (
    <Card className='gap-0 py-0 shadow-none'>
      <CardHeader className='py-6'>
        <CardTitle>Best sellers</CardTitle>
      </CardHeader>
      <CardContent className='px-0'>
        <Table aria-label='Best sellers'>
          <TableHeader>
            <TableRow className='h-12 border-t'>
              <TableHead className='text-muted-foreground w-16 pl-6'>Rank</TableHead>
              <TableHead className='text-muted-foreground'>Drink</TableHead>
              <TableHead className='text-muted-foreground text-right'>Cups</TableHead>
              <TableHead className='text-muted-foreground pr-6 text-right'>Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bestSellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className='text-muted-foreground h-24 text-center'>
                  No drinks were sold in this period.
                </TableCell>
              </TableRow>
            ) : (
              bestSellers.map((drink, index) => (
                <TableRow key={drink.productId}>
                  <TableCell className='text-muted-foreground h-14 pl-6'>{index + 1}</TableCell>
                  <TableCell className='font-medium'>{drink.productName}</TableCell>
                  <TableCell className='text-right'>{drink.quantity}</TableCell>
                  <TableCell className='text-price pr-6 text-right'>{money(drink.revenue)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
