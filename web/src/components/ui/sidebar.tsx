import type * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cn } from "@/lib/utils"

export function Sidebar({ className, children, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav className={cn("flex h-full flex-col", className)} {...props}>
      {children}
    </nav>
  )
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex h-14 shrink-0 items-center px-4", className)} {...props} />
}

export function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex-1 space-y-4 overflow-y-auto px-3 py-2", className)} {...props} />
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-auto shrink-0 space-y-2 border-t border-border p-3", className)} {...props} />
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-0.5", className)} {...props} />
}

export function SidebarSection({
  title,
  action,
  open = true,
  onOpenChange,
  className,
  children,
}: {
  title?: React.ReactNode
  action?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {title ? (
        <div className="flex items-center justify-between px-2.5 py-1">
          {onOpenChange ? (
            <button
              type="button"
              onClick={() => onOpenChange(!open)}
              className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
            >
              {title}
            </button>
          ) : (
            <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {title}
            </div>
          )}
          {action}
        </div>
      ) : null}
      {open ? <div className="space-y-0.5">{children}</div> : null}
    </div>
  )
}

export function SidebarMenu({
  icon,
  label,
  badge,
  active,
  defaultOpen: _defaultOpen,
  className,
  children,
  ...props
}: {
  icon?: React.ReactNode
  label?: React.ReactNode
  badge?: React.ReactNode
  active?: boolean
  defaultOpen?: boolean
} & React.ComponentProps<"ul">) {
  return (
    <div className="space-y-0.5">
      {label ? (
        <div
          className={cn(
            "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm",
            active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {icon}
            <span className="truncate">{label}</span>
          </span>
          {badge}
        </div>
      ) : null}
      <ul className={cn("space-y-0.5", label && "ps-4", className)} {...props}>
        {children}
      </ul>
    </div>
  )
}

export function SidebarItem({
  active,
  current,
  tone: _tone,
  icon,
  trailing,
  render,
  className,
  children,
  ...props
}: {
  active?: boolean
  current?: boolean
  tone?: string
  icon?: React.ReactNode
  trailing?: React.ReactNode
} & useRender.ComponentProps<"div">) {
  const isActive = active ?? current
  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(
      {
        className: cn(
          "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-secondary font-medium text-foreground"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
          className,
        ),
        children: (
          <>
            {icon}
            <span className="min-w-0 flex-1 truncate">{children}</span>
            {trailing}
          </>
        ),
      },
      props,
    ),
    state: { active: isActive ? "true" : undefined },
  })
}

export function SidebarSearch({
  label,
  shortcut,
  className,
  children,
  ...props
}: {
  label?: React.ReactNode
  shortcut?: React.ReactNode
} & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "mx-3 mb-2 flex h-8 items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/60",
        className,
      )}
      {...props}
    >
      <span className="truncate">{children ?? label}</span>
      {shortcut ? <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{shortcut}</kbd> : null}
    </button>
  )
}
