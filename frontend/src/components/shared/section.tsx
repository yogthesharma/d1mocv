import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface SectionProps {
  title: ReactNode
  description?: ReactNode
  /** Optional controls rendered beside the title, above the card. */
  actions?: ReactNode
  children: ReactNode
  contentClassName?: string
}

/**
 * A titled section: the heading and description sit outside the card, and the
 * card holds only the content (a chart, a table, a list...).
 */
export function Section({ title, description, actions, children, contentClassName }: SectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex max-w-3xl flex-col gap-1">
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <Card>
        <CardContent className={contentClassName}>{children}</CardContent>
      </Card>
    </section>
  )
}
