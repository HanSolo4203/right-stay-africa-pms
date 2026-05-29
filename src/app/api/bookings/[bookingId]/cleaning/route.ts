import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth/get-user"
import {
  getBookingCleaningTasks,
  regenerateBookingCleaningTasks,
  replaceBookingCleaningSchedule,
  type BookingCleaningTaskInput,
} from "@/lib/cleaning/booking-schedule"
import { prisma } from "@/lib/prisma"

type RouteContext = { params: Promise<{ bookingId: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { bookingId } = await context.params
  const data = await getBookingCleaningTasks(prisma, bookingId)
  if (!data) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { bookingId } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { tasks, lockSchedule } = body as {
    tasks?: BookingCleaningTaskInput[]
    lockSchedule?: boolean
  }

  if (!Array.isArray(tasks)) {
    return NextResponse.json({ error: "tasks array is required." }, { status: 400 })
  }

  const result = await replaceBookingCleaningSchedule(prisma, bookingId, {
    tasks,
    lockSchedule,
  })

  if (result && "error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(result)
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { bookingId } = await context.params

  let body: unknown
  try {
    body = await request.json().catch(() => ({}))
  } catch {
    body = {}
  }

  const regenerate =
    body &&
    typeof body === "object" &&
    "regenerate" in body &&
    Boolean((body as { regenerate?: boolean }).regenerate)

  if (regenerate) {
    const force = Boolean(
      body && typeof body === "object" && (body as { force?: boolean }).force,
    )
    const result = await regenerateBookingCleaningTasks(prisma, bookingId, { force })
    if (result && "error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    const data = await getBookingCleaningTasks(prisma, bookingId)
    return NextResponse.json({ ...data, created: result.created })
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 })
}
