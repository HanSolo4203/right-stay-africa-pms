import Image from "next/image"

import { cn } from "@/lib/utils"

/** `public/RSA NEW BLK BG.png` — light backgrounds */
const LOGO_ON_LIGHT = "/RSA%20NEW%20BLK%20BG.png"
/** `public/RSA NEW WHT BG Cropped.png` — dark backgrounds (sidebar, etc.) */
const LOGO_ON_DARK = "/RSA%20NEW%20WHT%20BG%20Cropped.png"

type BrandLogoProps = {
  className?: string
  /** Use `onDark` on spike sidebar / dark UI; default is auth-style light panels. */
  variant?: "onLight" | "onDark"
}

export function BrandLogo({ className, variant = "onLight" }: BrandLogoProps) {
  const src = variant === "onDark" ? LOGO_ON_DARK : LOGO_ON_LIGHT
  const defaultSize =
    variant === "onDark"
      ? "relative h-9 w-36 max-w-full shrink-0 sm:h-10 sm:w-40"
      : "relative mx-auto h-16 w-56 max-w-full shrink-0 sm:h-[4.5rem] sm:w-64"

  return (
    <div className={cn(defaultSize, className)}>
      <Image
        src={src}
        alt="Right Stay"
        fill
        className="object-contain object-left"
        priority={variant === "onLight"}
        sizes={variant === "onDark" ? "160px" : "(max-width: 640px) 224px, 256px"}
      />
    </div>
  )
}
