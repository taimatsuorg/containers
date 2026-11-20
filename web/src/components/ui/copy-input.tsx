import { CommandCopy } from "@/components/ui/command-copy"
import { cn } from "@/lib/utils"

export function CopyInput({
  value,
  copyLabel,
  className,
}: {
  value: string
  copyLabel?: string
  className?: string
}) {
  return <CommandCopy command={value} label={copyLabel} className={cn("w-full", className)} />
}
