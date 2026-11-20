import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-control text-ui font-medium transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-secondary data-[pressed]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-border bg-transparent hover:bg-secondary",
      },
      size: {
        default: "h-8 px-2.5",
        sm: "h-7 px-2 text-ui-xs",
        lg: "h-9 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export function Toggle({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}
