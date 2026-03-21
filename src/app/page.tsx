import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth/get-user"

export default async function Home() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role === "OWNER") {
    redirect("/owner-portal")
  }

  redirect("/dashboard")
}
