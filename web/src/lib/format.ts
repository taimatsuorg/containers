export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / Math.pow(1024, exp)
  return `${val >= 10 || exp === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[exp]}`
}

export function formatUnixDate(unixSec: number): string {
  if (!unixSec) return "—"
  return new Date(unixSec * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function stateBadgeVariant(state: string): "success" | "warning" | "destructive" | "chip" {
  switch (state.toLowerCase()) {
    case "running":
      return "success"
    case "restarting":
    case "created":
    case "paused":
      return "warning"
    case "exited":
    case "dead":
      return "destructive"
    default:
      return "chip"
  }
}
