import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: ReactNode
  unit?: string
  hint?: ReactNode
  icon?: LucideIcon
  /** Extra classes for the headline value, for example a colour. */
  valueClassName?: string
}

export function KpiCard({ title, value, unit, hint, icon: Icon, valueClassName }: KpiCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
          {title}
        </CardDescription>
        <CardTitle>
          <span className={cn('text-2xl font-semibold tabular-nums', valueClassName)}>{value}</span>
          {unit ? (
            <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      {hint ? <CardContent className="text-xs text-muted-foreground">{hint}</CardContent> : null}
    </Card>
  )
}

export function KpiCardSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-8 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  )
}
