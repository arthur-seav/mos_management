import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

/** The table inside a ListCard, styled like AdminCN's user table. Sorting and paging are done by the caller. */
export default function DataTable<T>({
  columns,
  data,
  loading,
  empty = 'Nothing here yet.',
  onRowClick
}: {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  loading?: boolean
  empty?: string
  onRowClick?: (row: T) => void
}) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(group => (
          <TableRow key={group.id} className='h-12 border-t'>
            {group.headers.map(header => (
              <TableHead key={header.id} className='text-muted-foreground first:pl-6 last:pr-6'>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 4 }, (_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={columns.length} className='h-14 px-6'>
                <Skeleton className='h-5 w-full' />
              </TableCell>
            </TableRow>
          ))
        ) : table.getRowModel().rows.length ? (
          table.getRowModel().rows.map(row => (
            <TableRow
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} className='h-14 first:pl-6 last:pr-6'>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className='text-muted-foreground h-24 text-center'>
              {empty}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
