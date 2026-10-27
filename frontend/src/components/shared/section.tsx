import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { InfoTooltip } from '@/components/shared/info-tooltip'

interface SectionProps {
  title: ReactNode
  description?: ReactNode
  /** Optional controls rendered beside the title, above the card. */
  actions?: ReactNode
  children: ReactNode
  contentClassName?: string
}

/**
 * A titled section: the heading sits outside the card (with an info tooltip
 * for the explanation), and the card holds only the content (a chart, a
 * table, a list...).
 */
export function Section({ title, description, actions, children, contentClassName }: SectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-1">
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          {description ? <InfoTooltip label="About this section">{description}</InfoTooltip> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <Card>
        <CardContent className={contentClassName}>{children}</CardContent>
      </Card>
    </section>
  )
}
