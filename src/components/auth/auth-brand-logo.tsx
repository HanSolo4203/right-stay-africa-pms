import { BrandLogo } from "@/components/brand/brand-logo"
import { cn } from "@/lib/utils"

type AuthBrandLogoProps = {
  className?: string
}

export function AuthBrandLogo({ className }: AuthBrandLogoProps) {
  return <BrandLogo variant="onLight" className={cn(className)} />
}
