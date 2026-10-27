import { AlertTriangleIcon } from 'lucide-react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { useDecision } from '@/api/hooks'
import type { DecisionResponse } from '@/api/types'
import { ErrorAlert } from '@/components/shared/error-alert'
import { KpiCard, KpiCardSkeleton } from '@/components/shared/kpi-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatDateTime,
  formatDay,
  formatHour,
  formatHours,
  formatMw,
  formatSignedMw,
  formatTime,
} from '@/lib/format'
import { useControls } from '@/state/controls-context'

const chartConfig = {
  forecast: { label: 'Forecast at cutoff', color: 'var(--chart-1)' },
  actual: { label: 'Actual', color: 'var(--chart-2)' },
} satisfies ChartConfig

function publishSummary(data: DecisionResponse): { value: string; hint: string } {
  const times = [...new Set(data.slots.map((slot) => slot.publish_time).filter((t) => t !== null))]
  times.sort()
  if (times.length === 0) {
    return { value: 'None', hint: 'No forecast was published before the cutoff.' }
  }
  const latest = times[times.length - 1]
  return {
    value: `${formatTime(latest)} UTC`,
    hint:
      times.length === 1
        ? `Published ${formatDay(latest.slice(0, 10))}. Every half-hour uses this forecast.`
        : `Latest of ${times.length} versions used across the day (${formatDay(latest.slice(0, 10))}).`,
  }
}

function biasHint(bias: number | null): string {
  if (bias === null) return 'No slots to compare.'
  if (Math.round(bias) === 0) return 'Forecast and actual matched on average.'
  return bias > 0
    ? 'Forecast too high on average: you would have been short.'
    : 'Forecast too low on average: you would have overbought.'
}

export function DecisionView() {
  const { decisionDate, cutoffHour } = useControls()
  const query = useDecision(decisionDate, cutoffHour)

  if (query.isError) return <ErrorAlert error={query.error} onRetry={() => void query.refetch()} />

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const data = query.data
  const published = publishSummary(data)
  const chartData = data.slots.map((slot) => ({
    time: formatTime(slot.start_time),
    forecast: slot.forecast_mw,
    actual: slot.actual_mw,
  }))

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Buying on <strong>{formatDay(data.decision_date)}</strong> for delivery on{' '}
        <strong>{formatDay(data.delivery_date)}</strong>, using the latest forecast published by{' '}
        {formatHour(data.cutoff_hour)} UTC.
      </p>

      {data.dropped_slots > 0 ? (
        <Alert role="status">
          <AlertTriangleIcon />
          <AlertTitle>
            {data.dropped_slots} half-hour{data.dropped_slots === 1 ? '' : 's'} left out
          </AlertTitle>
          <AlertDescription>
            No forecast had been published by this cutoff for those slots, so they are blank below
            and excluded from the error figures. Try a later cutoff.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Forecast used (published)" value={published.value} hint={published.hint} />
        <KpiCard
          title="Decision cutoff"
          value={`${formatHour(data.cutoff_hour)} UTC`}
          hint={`On ${formatDateTime(data.cutoff).split(',')[0]}, the day before delivery.`}
        />
        <KpiCard
          title="Mean absolute error"
          value={formatMw(data.metrics.mae)}
          unit="MW"
          hint={`Over ${data.metrics.n} half-hours that day.`}
        />
        <KpiCard
          title="Bias (forecast − actual)"
          value={formatSignedMw(data.metrics.bias)}
          unit="MW"
          hint={biasHint(data.metrics.bias)}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Forecast vs actual wind, {formatDay(data.delivery_date)}</CardTitle>
          <CardDescription>
            Half-hourly national wind generation in MW, times in UTC. The forecast is the version
            available at the cutoff, not a later one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
            <LineChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} interval={5} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(value: number) => formatMw(value)}
              />
              <ChartTooltip
                content={<ChartTooltipContent indicator="line" />}
                formatter={(value, name) => (
                  <span>
                    {chartConfig[name as keyof typeof chartConfig]?.label}:{' '}
                    {formatMw(Number(value))} MW
                  </span>
                )}
              />
              <Line
                dataKey="forecast"
                type="monotone"
                stroke="var(--color-forecast)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                dataKey="actual"
                type="monotone"
                stroke="var(--color-actual)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
          <ul
            className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground"
            aria-label="Legend"
          >
            {Object.entries(chartConfig).map(([key, item]) => (
              <li key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: item.color }}
                  aria-hidden
                />
                {item.label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All 48 half-hours</CardTitle>
          <CardDescription>
            Error = forecast − actual. Positive means the forecast was too high. Horizon is the time
            between publication and the start of the half-hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[28rem] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Time (UTC)</TableHead>
                  <TableHead className="text-right">Forecast (MW)</TableHead>
                  <TableHead>Published (UTC)</TableHead>
                  <TableHead className="text-right">Horizon (h)</TableHead>
                  <TableHead className="text-right">Actual (MW)</TableHead>
                  <TableHead className="text-right">Error (MW)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slots.map((slot) => (
                  <TableRow key={slot.start_time}>
                    <TableCell className="tabular-nums">{formatTime(slot.start_time)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMw(slot.forecast_mw)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {slot.publish_time ? formatDateTime(slot.publish_time) : '–'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatHours(slot.horizon_hours)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMw(slot.actual_mw)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatSignedMw(slot.error_mw)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
