import Image from "next/image"

import { cn } from "@/lib/utils"

/** Public asset: `public/RSA NEW BLK BG.png` */
const LOGO_SRC = "/RSA%20NEW%20BLK%20BG.png"

type AuthBrandLogoProps = {
  className?: string
}

export function AuthBrandLogo({ className }: AuthBrandLogoProps) {
  return (
    <div
      className={cn("relative mx-auto h-16 w-56 max-w-full shrink-0 sm:h-[4.5rem] sm:w-64", className)}
    >
      <Image
        src={LOGO_SRC}
        alt="Right Stay Africa"
        fill
        className="object-contain"
        priority
        sizes="(max-width: 640px) 224px, 256px"
      />
    </div>
  )
}
