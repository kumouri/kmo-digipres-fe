import { type ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kmosf/crm-components";
import { Skeleton } from "@kmosf/crm-components";
import { cn } from "@kmosf/crm-components";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: ReactNode;
  "data-testid"?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isLoading,
  emptyMessage = "Nothing here yet.",
  ...rest
}: DataTableProps<T>) {
  return (
    <div className="rounded-lg border bg-card" data-testid={rest["data-testid"]}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <TableRow key={`skeleton-${i}`}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    <Skeleton className="h-4 w-full max-w-32" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : !rows || rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
