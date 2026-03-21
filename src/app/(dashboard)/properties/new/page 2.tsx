import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewPropertyPage() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Add Property</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/properties">
            <ArrowLeft className="size-4" />
            Back to Properties
          </Link>
        </Button>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Property creation form</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-500">
          Coming soon
        </CardContent>
      </Card>
    </section>
  )
}
