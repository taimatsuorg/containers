import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header"
import {
  SettingsGroup,
  SettingsRow,
  SettingsRowControl,
  SettingsRowDescription,
  SettingsRowText,
  SettingsRowTitle,
  SettingsSection,
  SettingsSectionDescription,
  SettingsSectionHeader,
  SettingsSectionTitle,
} from "@/components/ui/settings-section"
import { ThemeSwitch } from "@/components/ui/theme-toggle"
import { api } from "@/lib/api"
import { formatBytes } from "@/lib/format"

export function SettingsPage() {
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: api.getOverview,
  })
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.getMe,
  })

  const host = overview.data?.host

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Settings</PageHeaderTitle>
          <PageHeaderDescription>Host runtime, appearance, and session settings.</PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      <SettingsSection>
        <SettingsSectionHeader>
          <SettingsSectionTitle>Host &amp; Docker Engine</SettingsSectionTitle>
          <SettingsSectionDescription>
            Local Docker daemon connected via <code className="font-mono text-ui-xs">/var/run/docker.sock</code>.
          </SettingsSectionDescription>
        </SettingsSectionHeader>
        <SettingsGroup>
          <SettingsRow size="sm">
            <SettingsRowText>
              <SettingsRowTitle>Status</SettingsRowTitle>
            </SettingsRowText>
            <SettingsRowControl>
              <Badge variant={host?.dockerConnected ? "success" : "destructive"} size="sm">
                {host?.dockerConnected ? "Connected" : "Disconnected"}
              </Badge>
            </SettingsRowControl>
          </SettingsRow>
          <SettingsRow size="sm">
            <SettingsRowText>
              <SettingsRowTitle>Hostname</SettingsRowTitle>
            </SettingsRowText>
            <SettingsRowControl className="font-mono text-ui-xs text-muted-foreground">
              {host?.hostname || "—"}
            </SettingsRowControl>
          </SettingsRow>
          <SettingsRow size="sm">
            <SettingsRowText>
              <SettingsRowTitle>Docker Version</SettingsRowTitle>
            </SettingsRowText>
            <SettingsRowControl className="font-mono text-ui-xs text-muted-foreground">
              {host?.dockerVersion || "—"}
            </SettingsRowControl>
          </SettingsRow>
          <SettingsRow size="sm">
            <SettingsRowText>
              <SettingsRowTitle>Operating System</SettingsRowTitle>
            </SettingsRowText>
            <SettingsRowControl className="text-ui-xs text-muted-foreground">
              {host ? `${host.os} (${host.arch})` : "—"}
            </SettingsRowControl>
          </SettingsRow>
          <SettingsRow size="sm">
            <SettingsRowText>
              <SettingsRowTitle>Kernel</SettingsRowTitle>
            </SettingsRowText>
            <SettingsRowControl className="font-mono text-ui-xs text-muted-foreground">
              {host?.kernel || "—"}
            </SettingsRowControl>
          </SettingsRow>
          <SettingsRow size="sm">
            <SettingsRowText>
              <SettingsRowTitle>Capacity</SettingsRowTitle>
            </SettingsRowText>
            <SettingsRowControl className="text-ui-xs text-muted-foreground">
              {host ? `${host.cpus} vCPU · ${formatBytes(host.memoryBytes)}` : "—"}
            </SettingsRowControl>
          </SettingsRow>
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection>
        <SettingsSectionHeader>
          <SettingsSectionTitle>Appearance</SettingsSectionTitle>
          <SettingsSectionDescription>Switch between light, dark, or system color scheme.</SettingsSectionDescription>
        </SettingsSectionHeader>
        <SettingsGroup>
          <SettingsRow>
            <SettingsRowText>
              <SettingsRowTitle>Theme</SettingsRowTitle>
              <SettingsRowDescription>Follows OS appearance when set to system.</SettingsRowDescription>
            </SettingsRowText>
            <SettingsRowControl>
              <ThemeSwitch />
            </SettingsRowControl>
          </SettingsRow>
        </SettingsGroup>
      </SettingsSection>

      <SettingsSection>
        <SettingsSectionHeader>
          <SettingsSectionTitle>Authentication</SettingsSectionTitle>
          <SettingsSectionDescription>Session protection for this instance.</SettingsSectionDescription>
        </SettingsSectionHeader>
        <SettingsGroup>
          <SettingsRow>
            <SettingsRowText>
              <SettingsRowTitle>Current User</SettingsRowTitle>
              <SettingsRowDescription>
                {me.data?.authEnabled ? "Session cookie authentication is active." : "Authentication is disabled."}
              </SettingsRowDescription>
            </SettingsRowText>
            <SettingsRowControl className="gap-2">
              <Badge variant="outline">{me.data?.username || "admin"}</Badge>
              {me.data?.authEnabled ? (
                <Button size="sm" variant="outline" onClick={() => void api.logout()}>
                  Sign out
                </Button>
              ) : null}
            </SettingsRowControl>
          </SettingsRow>
        </SettingsGroup>
      </SettingsSection>
    </div>
  )
}
