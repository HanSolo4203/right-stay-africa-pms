"use client"

import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { InfoGuideFormModal } from "@/components/info-guide/info-guide-form-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type EmergencyContact = {
  name: string
  phone: string
}

type InfoGuideData = {
  wifi_name: string | null
  wifi_password: string | null
  parking_instructions: string | null
  access_code: string | null
  lockbox_code: string | null
  electricity_notes: string | null
  emergency_contacts: EmergencyContact[]
  notes: string | null
}

type InfoGuideTabProps = {
  propertyId: string
  infoGuide: InfoGuideData | null
}

function displayText(value: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : "Not provided"
}

function displayMaskedValue(value: string | null, revealed: boolean) {
  if (!value?.trim()) return "Not provided"
  if (revealed) return value
  return "••••••••"
}

export function InfoGuideTab({ propertyId, infoGuide }: InfoGuideTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isWifiPasswordVisible, setIsWifiPasswordVisible] = useState(false)
  const [isAccessCodeVisible, setIsAccessCodeVisible] = useState(false)
  const [isLockboxCodeVisible, setIsLockboxCodeVisible] = useState(false)

  const contacts = infoGuide?.emergency_contacts ?? []

  return (
    <>
      {!infoGuide ? (
        <Card className="bg-white">
          <CardContent className="flex flex-col items-start gap-4 p-6">
            <p className="text-sm text-slate-600">No info guide yet</p>
            <Button onClick={() => setIsModalOpen(true)}>Set Up Info Guide</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <CardTitle>Info Guide</CardTitle>
              <Button variant="outline" onClick={() => setIsModalOpen(true)}>
                Edit
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Connectivity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Wifi Name</p>
                    <p className="text-sm text-slate-900">{displayText(infoGuide.wifi_name)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Wifi Password</p>
                      {infoGuide.wifi_password ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setIsWifiPasswordVisible((current) => !current)}
                        >
                          {isWifiPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          <span className="sr-only">
                            {isWifiPasswordVisible ? "Hide wifi password" : "Reveal wifi password"}
                          </span>
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-900">
                      {displayMaskedValue(infoGuide.wifi_password, isWifiPasswordVisible)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Building Access Code
                      </p>
                      {infoGuide.access_code ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setIsAccessCodeVisible((current) => !current)}
                        >
                          {isAccessCodeVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          <span className="sr-only">
                            {isAccessCodeVisible ? "Hide access code" : "Reveal access code"}
                          </span>
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-900">
                      {displayMaskedValue(infoGuide.access_code, isAccessCodeVisible)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Lockbox Code</p>
                      {infoGuide.lockbox_code ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setIsLockboxCodeVisible((current) => !current)}
                        >
                          {isLockboxCodeVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          <span className="sr-only">
                            {isLockboxCodeVisible ? "Hide lockbox code" : "Reveal lockbox code"}
                          </span>
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-900">
                      {displayMaskedValue(infoGuide.lockbox_code, isLockboxCodeVisible)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {displayText(infoGuide.parking_instructions)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Utilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-900 whitespace-pre-wrap">
                    {displayText(infoGuide.electricity_notes)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Emergency Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  {contacts.length === 0 ? (
                    <p className="text-sm text-slate-500">No emergency contacts added.</p>
                  ) : (
                    <ul className="space-y-2">
                      {contacts.map((contact, index) => (
                        <li key={`${contact.name}-${contact.phone}-${index}`} className="rounded border p-2">
                          <p className="text-sm font-medium text-slate-900">{contact.name || "Unnamed contact"}</p>
                          <p className="text-sm text-slate-600">{contact.phone || "No phone number"}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
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
      )}

      <InfoGuideFormModal
        propertyId={propertyId}
        infoGuide={infoGuide}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  )
}
