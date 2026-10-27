import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fromIsoDay, toIsoDay } from '@/lib/dates'
import { formatDay } from '@/lib/format'

interface DatePickerProps {
  id: string
  value: string
  min: string
  max: string
  onChange: (day: string) => void
  /** Overrides the default "Decision date (D-1)" screen-reader label. */
  ariaLabel?: string
}

export function DatePicker({ id, value, min, max, onChange, ariaLabel }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = fromIsoDay(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            aria-label={ariaLabel ?? `Decision date (D-1): ${formatDay(value)}`}
            variant="outline"
            className="justify-start font-normal"
          >
            <CalendarIcon />
            {formatDay(value)}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={{ before: fromIsoDay(min), after: fromIsoDay(max) }}
          onSelect={(date) => {
            if (date) {
              onChange(toIsoDay(date))
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
