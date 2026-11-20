import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * `variant="inset"` is the two-layer card: a quiet tinted frame (4px padding)
 * that holds a raised CardPanel. Use it to present something (a demo, image,
 * code, a featured plan); keep dense dashboard cards on the default variant.
 * Radii stay concentric at every --radius: the inset frame publishes radius − 4px and the panel takes it (rounded-inner).
 * `outline` is a hairline with no fill or shadow (cards on a card), `ghost` is
 * spacing only (groups that need the card rhythm without a surface).
 * `size` sets the shared spacing (sm 12px, default 16px, lg 24px) that every part reads.
 * `interactive` is for a card that is one link or button as a whole (pass `render={<a href="…" />}`):
 * the shadow steps up on hover and keyboard focus shows the ring.
 */
const cardVariants = cva(
  "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-ui text-card-foreground",
  {
    variants: {
      variant: {
        default: "bg-card shadow-raised",
        list: "bg-card shadow-raised divide-y divide-border gap-0 py-0",
        outline: "bg-transparent shadow-[inset_0_0_0_1px_var(--border)]",
        ghost: "bg-transparent",
        inset: "frame-2xl frame-inset-1 gap-0 rounded-2xl bg-muted p-1 shadow-raised dark:bg-background",
      },
      size: {
        sm: "[--card-spacing:--spacing(3)]",
        default: "[--card-spacing:--spacing(4)]",
        lg: "[--card-spacing:--spacing(6)]",
      },
      interactive: {
        true: "cursor-pointer outline-none transition-[box-shadow,background-color] duration-150 hover:shadow-raised-hover focus-visible:ring-2 focus-visible:ring-ring",
        false: "",
      },
    },
    defaultVariants: { variant: "default", size: "default", interactive: false },
  }
)

type CardProps = useRender.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & {
    tone?: string
  }

function Card({ className, size = "default", variant = "default", interactive = false, tone: _tone, render, ...props }: CardProps) {
  return useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(
      {
        "data-size": size ?? undefined,
        "data-variant": variant ?? undefined,
        className: cn(cardVariants({ size, variant, interactive }), className),
      } as React.ComponentProps<"div">,
      props
    ),
    state: { slot: "card" },
  })
}

/** The raised inner surface of an inset Card. */
function CardPanel({
  className,
  tone: _tone,
  variant: _variant,
  ...props
}: React.ComponentProps<"div"> & { tone?: string; variant?: string }) {
  return (
    <div
      data-slot="card-panel"
      className={cn(
        "flex flex-col gap-(--card-spacing) overflow-hidden rounded-inner bg-card py-(--card-spacing) shadow-raised",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({
  className,
  title,
  titleAction,
  variant: _variant,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  title?: React.ReactNode
  titleAction?: React.ReactNode
  variant?: string
}) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1.5 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    >
      {title ? (
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          {titleAction}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-heading text-ui-lg leading-snug font-semibold icon-bold group-data-[size=sm]/card:text-ui", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-ui leading-relaxed text-pretty text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

type CardContentProps = React.ComponentProps<"div"> & {
  /** Turns prose styles back on for this content inside a `typeset` container (or names a preset when used on its own). */
  typeset?: boolean | "docs" | "reading" | "chat"
  tone?: string
  variant?: string
}

function CardContent({ className, typeset, tone: _tone, variant: _variant, ...props }: CardContentProps) {
  return (
    <div
      data-slot="card-content"
      data-typeset={typeset === true ? "" : typeset || undefined}
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-2 px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardRow({
  className,
  label,
  description,
  align: _align,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  label?: React.ReactNode
  description?: React.ReactNode
  align?: string
}) {
  return (
    <div
      data-slot="card-row"
      className={cn("flex items-center justify-between gap-3 px-4 py-3", className)}
      {...props}
    >
      {label !== undefined || description !== undefined ? (
        <div className="min-w-0 space-y-0.5">
          {label ? <div className="text-sm font-medium text-foreground">{label}</div> : null}
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function SectionLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-label"
      className={cn("text-xs font-medium tracking-wide text-muted-foreground uppercase", className)}
      {...props}
    />
  )
}

export { Card, CardPanel, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, CardRow, SectionLabel, cardVariants }
export type { CardProps, CardContentProps }
