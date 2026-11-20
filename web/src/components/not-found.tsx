import { Link } from "@tanstack/react-router"
import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useT } from "@/i18n"
import { cn } from "@/lib/utils"
import { Illustration } from "@/components/ui/illustration"

export function NotFound() {
  const t = useT()
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <Illustration kind="not-found" className="w-48" />
        </EmptyMedia>
        <EmptyTitle>{t("common.notFound")}</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/cluster" className={cn(buttonVariants({ variant: "outline" }))}>
          {t("common.backToProjects")}
        </Link>
      </EmptyContent>
    </Empty>
  )
}
