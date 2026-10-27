import {
  AlertTriangleIcon,
  RulerIcon,
  ScaleIcon,
  SigmaIcon,
  TargetIcon,
  TrendingUpIcon,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useAccuracy } from '@/api/hooks'
import type { Metrics } from '@/api/types'
import { AboutData } from '@/components/shared/about-data'
import { DatePicker } from '@/components/layout/date-picker'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { errorTone } from '@/lib/tone'
import { ErrorAlert } from '@/components/shared/error-alert'
import { KpiCard, KpiCardSkeleton } from '@/components/shared/kpi-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDay, formatHour, formatMw, formatSignedMw } from '@/lib/format'
import { buildTakeaway } from '@/lib/takeaway'
import { useControls } from '@/state/controls-context'

const chartConfig = {
  mae: { label: 'Mean absolute error', color: 'var(--chart-1)' },
  bias: { label: 'Bias (forecast − actual)', color: 'var(--chart-3)' },
} satisfies ChartConfig

function chartRow(label: string, metrics: Metrics) {
  return { label, mae: metrics.mae, bias: metrics.bias, n: metrics.n }
}

function ErrorChart({ data, xLabel }: { data: ReturnType<typeof chartRow>[]; xLabel: string }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          label={{ value: xLabel, position: 'insideBottom', offset: -4 }}
          height={44}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) => formatMw(value)}
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          formatter={(value, name) => (
            <span>
              {chartConfig[name as keyof typeof chartConfig]?.label}:{' '}
              {formatSignedMw(Number(value))} MW
            </span>
          )}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="mae" fill="var(--color-mae)" radius={3} />
        <Bar dataKey="bias" fill="var(--color-bias)" radius={3} />
      </BarChart>
    </ChartContainer>
  )
}

export function AccuracyView() {
  const { meta, cutoffHour, rangeStart, rangeEnd, setRange } = useControls()
  const first = meta.first_decision_date
  const last = meta.last_decision_date
  const query = useAccuracy(rangeStart, rangeEnd, cutoffHour)
  const isWholeMonth = rangeStart === first && rangeEnd === last

  if (query.isError) return <ErrorAlert error={query.error} onRetry={() => void query.refetch()} />

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  const data = query.data
  const m = data.overall
  const hasMetrics = m.mae !== null && m.bias !== null && m.p90_abs !== null && m.p95_abs !== null

  const horizonRows = data.by_horizon.map((b) =>
    chartRow(`${b.from_hours}–${b.to_hours}`, b.metrics),
  )
  const hourRows = data.by_hour.map((b) => chartRow(String(b.hour).padStart(2, '0'), b.metrics))

  return (
    <>
      <section aria-label="Date range" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="range-start">From decision date</Label>
          <div className="w-48">
            <DatePicker
              id="range-start"
              value={rangeStart}
              min={first}
              max={last}
              onChange={(day) => setRange(day, day > rangeEnd ? day : rangeEnd)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="range-end">To decision date</Label>
          <div className="w-48">
            <DatePicker
              id="range-end"
              value={rangeEnd}
              min={first}
              max={last}
              onChange={(day) => setRange(day < rangeStart ? day : rangeStart, day)}
            />
          </div>
        </div>
        <Button variant="ghost" disabled={isWholeMonth} onClick={() => setRange(first, last)}>
          Whole month
        </Button>
      </section>

      <p className="text-sm text-muted-foreground">
        {data.days} decision day{data.days === 1 ? '' : 's'} ({formatDay(data.start)} to{' '}
        {formatDay(data.end)}), using the forecast available at {formatHour(data.cutoff_hour)} UTC.
        Change the cutoff in the sidebar to see how the numbers move. The sidebar decision date
        applies to the Decision view only.
      </p>

      {data.dropped_slots > 0 ? (
        <Alert role="status">
          <AlertTriangleIcon />
          <AlertTitle>{data.dropped_slots} half-hours left out</AlertTitle>
          <AlertDescription>
            No forecast had been published by this cutoff for those slots, so they are not in the
            figures. Try a later cutoff.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-label="Error summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={RulerIcon}
          title="Mean absolute error"
          value={formatMw(m.mae)}
          unit="MW"
          hint="Typical size of a miss."
        />
        <KpiCard
          icon={SigmaIcon}
          title="Root mean square error"
          value={formatMw(m.rmse)}
          unit="MW"
          hint="Punishes big misses more."
        />
        <KpiCard
          icon={ScaleIcon}
          title="Bias (forecast − actual)"
          value={formatSignedMw(m.bias)}
          unit="MW"
          valueClassName={errorTone(m.bias)}
          hint="Positive: forecast too high, buyer short."
        />
        <KpiCard
          icon={TargetIcon}
          title="P90 absolute error"
          value={formatMw(m.p90_abs)}
          unit="MW"
          hint="9 in 10 misses are this small or smaller."
        />
        <KpiCard
          icon={TrendingUpIcon}
          title="P95 absolute error"
          value={formatMw(m.p95_abs)}
          unit="MW"
          hint="19 in 20 misses are this small or smaller."
        />
      </section>

      {hasMetrics ? (
        <Card>
          <CardHeader>
            <CardTitle>What this means for your buffer</CardTitle>
            <CardDescription>Generated from the numbers above.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {buildTakeaway({
                days: data.days,
                cutoffHour: data.cutoff_hour,
                n: m.n,
                mae: m.mae!,
                bias: m.bias!,
                p90: m.p90_abs!,
                p95: m.p95_abs!,
              }).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Error by forecast horizon</CardTitle>
          <CardDescription>
            Every forecast version published for these delivery days, grouped by how many hours
            before the half-hour it was made. This does not depend on the cutoff. Shorter horizons
            are expected to be more accurate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorChart data={horizonRows} xLabel="Hours between publication and delivery" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error by hour of day</CardTitle>
          <CardDescription>
            Forecast available at the cutoff, grouped by the UTC hour being delivered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorChart data={hourRows} xLabel="Delivery hour (UTC)" />
        </CardContent>
      </Card>

      <AboutData />
    </>
  )
}
