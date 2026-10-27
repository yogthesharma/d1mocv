import type { ReactNode } from 'react'
import { InfoIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface InfoTooltipProps {
  /** Screen-reader label for the trigger. */
  label: string
  children: ReactNode
}

/**
 * A small info icon that reveals explanatory text on hover or keyboard focus,
 * keeping the page free of always-visible helper copy.
 */
export function InfoTooltip({ label, children }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className="rounded-sm text-muted-foreground outline-hidden transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <InfoIcon className="size-3.5 shrink-0" aria-hidden />
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-start">{children}</TooltipContent>
    </Tooltip>
  )
}
