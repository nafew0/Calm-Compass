import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, HeartHandshake, LoaderCircle, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'

export default function Setup() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    care_recipient_name: user?.care_recipient_name || '',
  })
  const [saving, setSaving] = useState(false)

  if (user?.has_completed_setup) {
    return <Navigate to="/dashboard" replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)

    const result = await updateUser({
      first_name: formData.first_name.trim(),
      care_recipient_name: formData.care_recipient_name.trim(),
    })

    if (result.success) {
      toast({
        title: 'Setup complete',
        description: 'Your caregiver workspace is ready.',
        variant: 'success',
      })
      navigate('/dashboard', { replace: true })
    } else {
      toast({
        title: 'Could not save setup',
        description: result.error,
        variant: 'error',
      })
    }

    setSaving(false)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f8fbfa_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Quick setup
            </p>
            <CardTitle className="text-3xl tracking-tight text-slate-950">
              Finish your caregiver workspace
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-7 text-slate-600">
              We only need two details to tailor the CalmCompass shell for your caregiving context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-3">
            <div className="grid gap-4 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              <p>Behavior Decoder is ready as the primary caregiver workflow.</p>
              <p>Daily Log and Medications are both live on the care home for quick tracking.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="first_name" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Your first name
                </Label>
                <div className="relative mt-2">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="h-12 rounded-2xl border-slate-200 pl-10"
                    autoComplete="given-name"
                    placeholder="Caregiver first name"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="care_recipient_name" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Care recipient name
                </Label>
                <div className="relative mt-2">
                  <HeartHandshake className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="care_recipient_name"
                    name="care_recipient_name"
                    value={formData.care_recipient_name}
                    onChange={handleChange}
                    className="h-12 rounded-2xl border-slate-200 pl-10"
                    autoComplete="off"
                    placeholder="Who you are caring for"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="rounded-full px-6" disabled={saving}>
                {saving ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Saving setup...
                  </>
                ) : (
                  <>
                    Continue to care home
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
