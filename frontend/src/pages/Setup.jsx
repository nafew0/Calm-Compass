import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, HeartHandshake, LoaderCircle, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import BrandLogo from '@/components/branding/BrandLogo'
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
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)

    const result = await updateUser({
      first_name: formData.first_name.trim(),
      care_recipient_name: formData.care_recipient_name.trim(),
    })

    if (result.success) {
      toast({ title: 'Setup complete', variant: 'success' })
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
    <div className="theme-app-gradient min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-md space-y-5">
        <BrandLogo />
        <section className="theme-panel p-5">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Quick setup
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Two names help CalmCompass feel personal.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <Label htmlFor="first_name" className="text-sm font-semibold text-foreground">
                Your first name
              </Label>
              <div className="relative mt-2">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="pl-10"
                  autoComplete="given-name"
                  placeholder="Caregiver name"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="care_recipient_name" className="text-sm font-semibold text-foreground">
                Care recipient
              </Label>
              <div className="relative mt-2">
                <HeartHandshake className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="care_recipient_name"
                  name="care_recipient_name"
                  value={formData.care_recipient_name}
                  onChange={handleChange}
                  className="pl-10"
                  autoComplete="off"
                  placeholder="Who you care for"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </section>
      </div>
    </div>
  )
}
