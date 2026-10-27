import { AlertTriangleIcon, CalendarClockIcon, RulerIcon, ScaleIcon, TimerIcon } from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { useAccuracy, useDecision } from '@/api/hooks'
import type { DecisionResponse } from '@/api/types'
import { AboutData } from '@/components/shared/about-data'
import { ErrorAlert } from '@/components/shared/error-alert'
import { KpiCard, KpiCardSkeleton } from '@/components/shared/kpi-card'
import { Section } from '@/components/shared/section'
import { SlotsTable } from '@/components/shared/slots-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { buildDayChart } from '@/lib/band'
import { formatDay, formatHour, formatMw, formatSignedMw, formatTime } from '@/lib/format'
import { errorTone } from '@/lib/tone'
import { useControls } from '@/state/controls-context'

const chartConfig = {
  forecast: { label: 'Forecast at cutoff', color: 'var(--chart-1)' },
  actual: { label: 'Actual', color: 'var(--chart-2)' },
  range: { label: 'Planning range (forecast ± P95 miss)', color: 'var(--chart-1)' },
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
  const { meta, decisionDate, cutoffHour } = useControls()
  const query = useDecision(decisionDate, cutoffHour)
  // The planning range uses the whole-month P95 miss. If it fails, the chart simply has no band.
  const month = useAccuracy(meta.first_decision_date, meta.last_decision_date, cutoffHour)

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
  const buffer = month.data?.overall.p95_abs ?? null
  const chart = buildDayChart(data.slots, buffer)

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
        <KpiCard
          icon={CalendarClockIcon}
          title="Forecast used (published)"
          value={published.value}
          hint={published.hint}
        />
        <KpiCard
          icon={TimerIcon}
          title="Decision cutoff"
          value={`${formatHour(data.cutoff_hour)} UTC`}
          hint={`On ${formatDay(data.decision_date)}, the day before delivery.`}
        />
        <KpiCard
          icon={RulerIcon}
          title="Mean absolute error"
          value={formatMw(data.metrics.mae)}
          unit="MW"
          hint={`Over ${data.metrics.n} half-hours that day.`}
        />
        <KpiCard
          icon={ScaleIcon}
          title="Bias (forecast − actual)"
          value={formatSignedMw(data.metrics.bias)}
          unit="MW"
          valueClassName={errorTone(data.metrics.bias)}
          hint={biasHint(data.metrics.bias)}
        />
      </section>

      <Section
        title={`Forecast vs actual wind, ${formatDay(data.delivery_date)}`}
        description={
          <>
            Half-hourly national wind generation in MW, times in UTC. The forecast is the version
            available at the cutoff, not a later one.
            {buffer !== null
              ? ` The shaded band is a planning range: the forecast plus or minus ${formatMw(buffer)} MW, the size of miss that 95% of January half-hours stayed within.`
              : ''}
          </>
        }
      >
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
          <ComposedChart data={chart.points} margin={{ left: 4, right: 12, top: 8 }}>
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
                  {chartConfig[name as keyof typeof chartConfig]?.label}: {formatMw(Number(value))}{' '}
                  MW
                </span>
              )}
            />
            {buffer !== null ? (
              <Area
                dataKey="range"
                type="monotone"
                stroke="none"
                fill="var(--color-range)"
                fillOpacity={0.14}
                tooltipType="none"
                legendType="none"
                isAnimationActive={false}
              />
            ) : null}
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
          </ComposedChart>
        </ChartContainer>
        <ul className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Legend">
          {Object.entries(chartConfig)
            .filter(([key]) => key !== 'range' || buffer !== null)
            .map(([key, item]) => (
              <li key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: item.color, opacity: key === 'range' ? 0.4 : 1 }}
                  aria-hidden
                />
                {item.label}
              </li>
            ))}
        </ul>
        {buffer !== null && chart.compared > 0 ? (
          <p className="mt-3 text-sm">
            The actual stayed inside the planning range in{' '}
            <strong>
              {chart.inside} of {chart.compared}
            </strong>{' '}
            half-hours on this day.
          </p>
        ) : null}
      </Section>

      <Section
        title="All 48 half-hours"
        description={
          <>
            Error = forecast − actual. Positive (amber) means the forecast was too high; negative
            (blue) means too low. Horizon is the time between publication and the start of the
            half-hour. Sort any column, filter by time or forecast presence, and choose which
            columns to show.
          </>
        }
      >
        <SlotsTable slots={data.slots} />
      </Section>

      <AboutData />
    </>
  )
}
