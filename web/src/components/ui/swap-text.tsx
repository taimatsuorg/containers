import { TextCascade } from "@/components/ui/text-cascade"

export function SwapText({
  text,
  children,
  variant: _variant,
  className,
}: {
  text?: string
  children?: string
  variant?: string
  className?: string
}) {
  return <TextCascade text={text ?? children ?? ""} className={className} />
}
