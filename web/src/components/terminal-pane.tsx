import { FitAddon } from "@xterm/addon-fit"
import { Terminal } from "@xterm/xterm"
import "@xterm/xterm/css/xterm.css"
import { RotateCw } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ConnState = "connecting" | "connected" | "exited" | "error"

export function TerminalPane({ containerId }: { containerId: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [shell, setShell] = useState("/bin/sh")
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<ConnState>("connecting")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    setStatus("connecting")
    setMessage("")

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      theme: {
        background: "#09090b",
        foreground: "#f4f4f5",
      },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(el)
    fit.fit()

    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:"
    const url = `${scheme}//${window.location.host}/api/containers/${encodeURIComponent(containerId)}/exec?cmd=${encodeURIComponent(shell)}`
    const ws = new WebSocket(url)
    ws.binaryType = "arraybuffer"

    const sendResize = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }))
      }
    }

    ws.onopen = () => {
      fit.fit()
      sendResize()
    }

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(event.data))
        return
      }
      if (typeof event.data === "string") {
        try {
          const frame = JSON.parse(event.data) as { type: string; code?: number; message?: string }
          if (frame.type === "ready") {
            setStatus("connected")
            fit.fit()
            sendResize()
            term.focus()
          } else if (frame.type === "exit") {
            setStatus("exited")
            setMessage(frame.code !== undefined ? `Exited (${frame.code})` : frame.message || "Exited")
            term.writeln(`\r\n[session exited${frame.code !== undefined ? `: ${frame.code}` : ""}]`)
          } else if (frame.type === "error") {
            setStatus("error")
            setMessage(frame.message || "Terminal error")
            term.writeln(`\r\n[error: ${frame.message || "unknown"}]`)
          }
        } catch {
          term.write(event.data)
        }
      }
    }

    ws.onerror = () => {
      setStatus("error")
      setMessage("WebSocket connection failed")
    }

    ws.onclose = () => {
      setStatus((prev) => (prev === "connected" || prev === "connecting" ? "exited" : prev))
    }

    const onData = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })

    const ro = new ResizeObserver(() => {
      fit.fit()
      sendResize()
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      onData.dispose()
      ws.close()
      term.dispose()
    }
  }, [containerId, shell, attempt])

  const badgeVariant =
    status === "connected" ? "success" : status === "error" ? "destructive" : status === "exited" ? "chip" : "warning"

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant}>{status === "connected" ? "Connected" : message || status}</Badge>
          <Select value={shell} onValueChange={(v) => v && setShell(v)}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="/bin/sh">/bin/sh</SelectItem>
              <SelectItem value="/bin/bash">/bin/bash</SelectItem>
              <SelectItem value="/bin/ash">/bin/ash</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAttempt((n) => n + 1)}>
          <RotateCw data-icon="inline-start" className="size-3.5" />
          Reconnect
        </Button>
      </div>
      <div
        ref={hostRef}
        className="h-[460px] w-full overflow-hidden rounded-xl bg-[#09090b] p-3 shadow-raised"
      />
    </div>
  )
}
