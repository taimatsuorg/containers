import { useState, type FormEvent } from "react"
import { BrandLogo } from "@/components/shell/brand-logo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginPage() {
  const params = new URLSearchParams(window.location.search)
  const returnTo = params.get("return") || "/"
  const initialError = params.get("error") ? "Invalid username or password." : ""

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(initialError)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const body = new URLSearchParams({
        username,
        password,
        return: returnTo,
      })
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
        credentials: "same-origin",
      })
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { return?: string }
        window.location.assign(data.return || returnTo || "/")
        return
      }
      const errData = (await res.json().catch(() => ({}))) as { error?: string }
      setError(errData.error || "Invalid username or password.")
    } catch {
      setError("Unable to reach Containers server.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2">
          <BrandLogo />
          <CardTitle className="pt-2 text-lg">Sign in</CardTitle>
          <CardDescription>Enter your credentials to manage local Docker containers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <Alert variant="destructive" size="sm">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Field label="Username">
              <Input
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </Field>
            <Field label="Password">
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" className="w-full" loading={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
