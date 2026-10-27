import { Fragment, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, SlidersHorizontalIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime, formatHours, formatMw, formatSignedMw, formatTime } from '@/lib/format'
import { errorTone } from '@/lib/tone'
import {
  DEFAULT_SORT,
  PRESENCE_OPTIONS,
  type PresenceFilter,
  type SlotColumnId,
  type SlotRow,
  type SlotSort,
  filterSlots,
  sortSlots,
} from '@/lib/slots-table'

const RIGHT = 'text-right'

interface SlotColumn {
  id: SlotColumnId
  label: string
  align?: 'right'
  hideable: boolean
  render: (slot: SlotRow) => ReactNode
}

const COLUMNS: SlotColumn[] = [
  {
    id: 'start_time',
    label: 'Time (UTC)',
    hideable: false,
    render: (slot) => <span className="tabular-nums">{formatTime(slot.start_time)}</span>,
  },
  {
    id: 'forecast_mw',
    label: 'Forecast (MW)',
    align: 'right',
    hideable: true,
    render: (slot) => <span className="tabular-nums">{formatMw(slot.forecast_mw)}</span>,
  },
  {
    id: 'publish_time',
    label: 'Published (UTC)',
    hideable: true,
    render: (slot) =>
      slot.publish_time ? (
        <span className="tabular-nums">{formatDateTime(slot.publish_time)}</span>
      ) : (
        '-'
      ),
  },
  {
    id: 'horizon_hours',
    label: 'Horizon (h)',
    align: 'right',
    hideable: true,
    render: (slot) => <span className="tabular-nums">{formatHours(slot.horizon_hours)}</span>,
  },
  {
    id: 'actual_mw',
    label: 'Actual (MW)',
    align: 'right',
    hideable: true,
    render: (slot) => <span className="tabular-nums">{formatMw(slot.actual_mw)}</span>,
  },
  {
    id: 'error_mw',
    label: 'Error (MW)',
    align: 'right',
    hideable: true,
    render: (slot) => (
      <span className={`font-medium tabular-nums ${errorTone(slot.error_mw)}`}>
        {formatSignedMw(slot.error_mw)}
      </span>
    ),
  },
]

/** Click cycle: ascending, descending, back to the default time order. */
function nextSort(current: SlotSort, id: SlotColumnId): SlotSort {
  if (current.id !== id) return { id, desc: false }
  if (!current.desc) return { id, desc: true }
  return DEFAULT_SORT
}

export function SlotsTable({ slots }: { slots: SlotRow[] }) {
  const [sort, setSort] = useState<SlotSort>(DEFAULT_SORT)
  const [query, setQuery] = useState('')
  const [presence, setPresence] = useState<PresenceFilter>('all')
  const [hidden, setHidden] = useState<ReadonlySet<SlotColumnId>>(new Set())

  const visibleColumns = COLUMNS.filter((column) => !hidden.has(column.id))
  const rows = sortSlots(filterSlots(slots, query, presence), sort)

  const ariaSort = (id: SlotColumnId): 'ascending' | 'descending' | 'none' =>
    sort.id === id ? (sort.desc ? 'descending' : 'ascending') : 'none'

  const sortIcon = (id: SlotColumnId): ReactNode => {
    if (sort.id !== id)
      return <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-40" aria-hidden />
    return sort.desc ? (
      <ArrowDownIcon className="size-3.5 shrink-0" aria-hidden />
    ) : (
      <ArrowUpIcon className="size-3.5 shrink-0" aria-hidden />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by time, e.g. 09:30"
          aria-label="Filter half-hours by time"
          className="h-8 w-56"
        />
        <Select
          items={PRESENCE_OPTIONS}
          value={presence}
          onValueChange={(value) => setPresence((value ?? 'all') as PresenceFilter)}
        >
          <SelectTrigger className="h-8 w-40" aria-label="Filter slots by forecast presence">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESENCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <SlidersHorizontalIcon aria-hidden />
                Columns
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              {COLUMNS.filter((column) => column.hideable).map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={!hidden.has(column.id)}
                  onCheckedChange={(checked) => {
                    const next = new Set(hidden)
                    if (checked === true) {
                      next.delete(column.id)
                    } else {
                      next.add(column.id)
                    }
                    setHidden(next)
                  }}
                  closeOnClick={false}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <p className="ml-auto text-xs text-muted-foreground" role="status">
          Showing {rows.length} of {slots.length} half-hours
        </p>
      </div>

      <div
        className="max-h-[28rem] overflow-auto rounded-md border"
        tabIndex={0}
        role="region"
        aria-label="Half-hourly forecast table"
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead
                  key={column.id}
                  aria-sort={ariaSort(column.id)}
                  className={column.align === 'right' ? RIGHT : undefined}
                >
                  <button
                    type="button"
                    onClick={() => setSort(nextSort(sort, column.id))}
                    className={`flex w-full items-center gap-1 rounded-sm outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 ${
                      column.align === 'right' ? 'justify-end text-right' : 'text-left'
                    }`}
                  >
                    <span>{column.label}</span>
                    {sortIcon(column.id)}
                    <span className="sr-only">
                      {ariaSort(column.id) === 'ascending'
                        ? 'Sorted ascending, activate to sort descending'
                        : ariaSort(column.id) === 'descending'
                          ? 'Sorted descending, activate to restore the default time order'
                          : `Sort by ${column.label}`}
                    </span>
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No half-hours match the filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((slot) => (
                <TableRow key={slot.start_time}>
                  {visibleColumns.map((column) => (
                    <Fragment key={column.id}>
                      <TableCell className={column.align === 'right' ? RIGHT : undefined}>
                        {column.render(slot)}
                      </TableCell>
                    </Fragment>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
