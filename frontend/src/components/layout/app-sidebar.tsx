import { BarChart3Icon, ClockIcon, WindIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatHour } from '@/lib/format'
import { useControls } from '@/state/controls-context'
import { DatePicker } from './date-picker'

const HOURS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${formatHour(hour)} UTC`,
}))

const NAV = [
  { to: '/decision', label: 'Decision view', icon: ClockIcon },
  { to: '/accuracy', label: 'Accuracy', icon: BarChart3Icon },
]

export function AppSidebar() {
  const { meta, decisionDate, cutoffHour, setDecisionDate, setCutoffHour } = useControls()
  const { pathname, search } = useLocation()

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      role="complementary"
      aria-label="Decision settings and navigation"
    >
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <WindIcon className="size-5 shrink-0" aria-hidden />
          <span className="font-semibold group-data-[collapsible=icon]:hidden">
            Wind forecast desk
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Decision settings</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-4 px-2 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="decision-date">Decision date (D-1)</Label>
              <DatePicker
                id="decision-date"
                value={decisionDate}
                min={meta.first_decision_date}
                max={meta.last_decision_date}
                onChange={setDecisionDate}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cutoff-hour">Cutoff time</Label>
              <Select
                items={HOURS}
                value={String(cutoffHour)}
                onValueChange={(value) => value !== null && setCutoffHour(Number(value))}
              >
                <SelectTrigger id="cutoff-hour" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Views</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={pathname === item.to}
                    tooltip={item.label}
                    render={<NavLink to={{ pathname: item.to, search }} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        <p className="px-2 pb-2">
          All times UTC. Error = forecast − actual, in MW. Elexon national wind data, January 2026.
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
