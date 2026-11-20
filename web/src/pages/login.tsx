import { useState, type FormEvent } from "react"

import { BrandLogo } from "@/components/brand-logo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { ThemeToggle } from "@/components/ui/theme-toggle"

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
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-shell p-4 text-foreground">
      <div className="fixed top-4 end-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="gap-1.5">
          <div className="mb-1">
            <BrandLogo />
          </div>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your credentials to manage local Docker containers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <Alert variant="destructive" size="sm">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <FieldGroup>
              <Field>
                <FieldLabel>Username</FieldLabel>
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
              <Field>
                <FieldLabel>Password</FieldLabel>
                <PasswordInput
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
