export async function GET() {
  return Response.json({
    status: "ok",
    service: "right-stay-africa-pms",
    timestamp: Date.now(),
  })
}

