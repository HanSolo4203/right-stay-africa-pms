import { NextResponse } from "next/server"

export async function POST() {
  try {
    if (!process.env.UPLISTING_API_KEY) {
      return NextResponse.json(
        { error: "UPLISTING_API_KEY not set" },
        { status: 500 }
      )
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL}`

    const webhookUrl = `${appUrl}/api/webhooks/uplisting`
    const encoded = Buffer.from(process.env.UPLISTING_API_KEY).toString("base64")

    const res = await fetch("https://connect.uplisting.io/hooks", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: webhookUrl }),
    })

    if (res.status === 429) {
      return NextResponse.json(
        { error: "Rate limited — wait 1 minute and try again" },
        { status: 429 }
      )
    }

    if (res.status === 401) {
      return NextResponse.json(
        {
          error: "Invalid API key — check UPLISTING_API_KEY in Vercel env vars",
        },
        { status: 401 }
      )
    }

    if (res.status === 422) {
      return NextResponse.json({
        success: true,
        message: "Webhook already registered with Uplisting",
      })
    }

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Uplisting returned ${res.status}: ${text}` },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Webhook registered successfully with Uplisting",
      webhookUrl,
    })
  } catch {
    return NextResponse.json(
      { error: "Network error — check server logs" },
      { status: 500 }
    )
  }
}
