import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type EmergencyContact = {
  name: string
  phone: string
}

type OwnerInfoGuideReadonlyProps = {
  infoGuide: {
    wifi_name: string | null
    wifi_password: string | null
    parking_instructions: string | null
    access_code: string | null
    lockbox_code: string | null
    electricity_notes: string | null
    emergency_contacts: EmergencyContact[]
    notes: string | null
  } | null
}

function displayText(value: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : "Not provided"
}

export function OwnerInfoGuideReadonly({ infoGuide }: OwnerInfoGuideReadonlyProps) {
  if (!infoGuide) {
    return (
      <Card className="bg-white">
        <CardContent className="p-6">
          <p className="text-sm text-slate-600">No info guide has been published for this property yet.</p>
        </CardContent>
      </Card>
    )
  }

  const contacts = infoGuide.emergency_contacts ?? []

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Info Guide</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Card className="border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Connectivity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Wifi name</p>
                <p className="text-sm text-slate-900">{displayText(infoGuide.wifi_name)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Wifi password</p>
                <p className="text-sm text-slate-900">{displayText(infoGuide.wifi_password)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Building access code</p>
                <p className="text-sm text-slate-900">{displayText(infoGuide.access_code)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Lockbox code</p>
                <p className="text-sm text-slate-900">{displayText(infoGuide.lockbox_code)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none sm:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Parking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">
                {displayText(infoGuide.parking_instructions)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none sm:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Utilities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">
                {displayText(infoGuide.electricity_notes)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none sm:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Emergency contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-sm text-slate-500">No emergency contacts listed.</p>
              ) : (
                <ul className="space-y-2">
                  {contacts.map((contact, index) => (
                    <li key={`${contact.name}-${contact.phone}-${index}`} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">{contact.name || "Unnamed contact"}</p>
                      <p className="text-sm text-slate-600">{contact.phone || "No phone number"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-none sm:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{displayText(infoGuide.notes)}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
