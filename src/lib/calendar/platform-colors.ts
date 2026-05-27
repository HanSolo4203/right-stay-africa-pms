export const PLATFORM_COLORS: Record<
  string,
  {
    bg: string
    border: string
    text: string
    light: string
    label: string
  }
> = {
  Airbnb: {
    bg: "#FF5A5F",
    border: "#CC3338",
    text: "#ffffff",
    light: "#FFF0F0",
    label: "Airbnb",
  },
  "Booking.com": {
    bg: "#003580",
    border: "#002255",
    text: "#ffffff",
    light: "#EEF2FF",
    label: "Booking.com",
  },
  Direct: {
    bg: "#1a5c35",
    border: "#0f3d22",
    text: "#ffffff",
    light: "#F0FAF4",
    label: "Direct",
  },
  Vrbo: {
    bg: "#1C6AFF",
    border: "#0047CC",
    text: "#ffffff",
    light: "#EEF4FF",
    label: "Vrbo",
  },
  Google: {
    bg: "#4285F4",
    border: "#2463D9",
    text: "#ffffff",
    light: "#EEF3FF",
    label: "Google",
  },
}

export const DEFAULT_PLATFORM_COLOR = {
  bg: "#6B7280",
  border: "#4B5563",
  text: "#ffffff",
  light: "#F3F4F6",
  label: "Other",
}

export function getPlatformColor(platform: string | null | undefined) {
  if (!platform) return DEFAULT_PLATFORM_COLOR
  return PLATFORM_COLORS[platform] ?? DEFAULT_PLATFORM_COLOR
}
