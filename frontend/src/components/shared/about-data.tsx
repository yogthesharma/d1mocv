import { InfoIcon } from 'lucide-react'
import { Section } from '@/components/shared/section'

export function AboutData() {
  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <InfoIcon className="size-4" aria-hidden />
          About the data
        </span>
      }
      description="How the numbers are put together."
    >
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>
          Forecasts are Elexon WINDFOR and actuals are Elexon FUELHH wind, national level. No other
          data is used.
        </li>
        <li>
          For each half-hour, the forecast is the latest version published at or before the cutoff
          on the day before delivery. Anything published later is ignored.
        </li>
        <li>
          WINDFOR is hourly and actuals are half-hourly, so each hourly forecast is used for both
          half-hours of that hour.
        </li>
        <li>
          Error is forecast minus actual. Positive means the forecast was too high, so a buyer
          relying on it would be short.
        </li>
        <li>
          The planning range on the Decision view is the forecast plus or minus the 95th percentile
          error over all of January, so it is measured on the same data it is shown on.
        </li>
        <li>All times are UTC. January is GMT, so this is also UK local time.</li>
      </ul>
    </Section>
  )
}
