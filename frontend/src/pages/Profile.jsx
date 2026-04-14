import { useEffect, useRef, useState } from 'react'
import {
  BriefcaseBusiness,
  Building2,
  Camera,
  Clock3,
  HeartHandshake,
  LoaderCircle,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { resolveApiAssetUrl } from '@/services/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getSupportedTimezones } from '@/utils/timezones'

const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024
const AVATAR_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const SUPPORTED_TIMEZONES = getSupportedTimezones()

function buildFormState(user) {
  return {
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    care_recipient_name: user?.care_recipient_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    timezone: user?.timezone || '',
    organization: user?.organization || '',
    designation: user?.designation || '',
    bio: user?.bio || '',
  }
}

function getInitials(user, formData) {
  const first = (formData.first_name || user?.first_name || '').trim()
  const last = (formData.last_name || user?.last_name || '').trim()

  if (first || last) {
    return `${first[0] || ''}${last[0] || ''}`.toUpperCase() || 'U'
  }

  return user?.username?.slice(0, 2).toUpperCase() || 'U'
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState(() => buildFormState(user))
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    setFormData(buildFormState(user))
    setAvatarPreview(resolveApiAssetUrl(user?.avatar))
  }, [user])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSavingProfile(true)

    const result = await updateUser({
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      care_recipient_name: formData.care_recipient_name.trim(),
      email: formData.email,
      phone: formData.phone.trim(),
      timezone: formData.timezone.trim(),
      organization: formData.organization.trim(),
      designation: formData.designation.trim(),
      bio: formData.bio.trim(),
    })

    if (result.success) {
      toast({
        title: 'Profile updated',
        description: 'Your caregiver profile details were saved successfully.',
        variant: 'success',
      })
    } else {
      toast({
        title: 'Could not update profile',
        description: result.error,
        variant: 'error',
        duration: 4500,
      })
    }

    setSavingProfile(false)
  }

  const handleAvatarClick = () => {
    if (!uploadingAvatar) {
      fileInputRef.current?.click()
    }
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid image format',
        description: 'Use a JPG, PNG, WEBP, or GIF image for your avatar.',
        variant: 'error',
      })
      event.target.value = ''
      return
    }

    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      toast({
        title: 'Image too large',
        description: 'Avatar images must be 5 MB or smaller.',
        variant: 'error',
      })
      event.target.value = ''
      return
    }

    const previewUrl = URL.createObjectURL(file)
    const previousPreview = avatarPreview
    setAvatarPreview(previewUrl)
    setUploadingAvatar(true)

    const payload = new FormData()
    payload.append('avatar', file)

    const result = await updateUser(payload)

    URL.revokeObjectURL(previewUrl)

    if (result.success) {
      setAvatarPreview(resolveApiAssetUrl(result.user?.avatar))
      toast({
        title: 'Avatar updated',
        description: 'Your profile photo is now live.',
        variant: 'success',
      })
    } else {
      setAvatarPreview(previousPreview)
      toast({
        title: 'Avatar upload failed',
        description: result.error,
        variant: 'error',
        duration: 4500,
      })
    }

    setUploadingAvatar(false)
    event.target.value = ''
  }

  const profileFields = [
    {
      id: 'first_name',
      label: 'Caregiver first name',
      icon: UserRound,
      placeholder: 'Your first name',
      autoComplete: 'given-name',
    },
    {
      id: 'last_name',
      label: 'Last name',
      icon: UserRound,
      placeholder: 'Last name',
      autoComplete: 'family-name',
    },
    {
      id: 'care_recipient_name',
      label: 'Care recipient name',
      icon: HeartHandshake,
      placeholder: 'Who you are caring for',
      autoComplete: 'off',
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      placeholder: 'Email address',
      autoComplete: 'email',
      readOnly: true,
      description: 'Email changes will follow the verification flow in a later phase.',
    },
    {
      id: 'phone',
      label: 'Phone',
      icon: Phone,
      placeholder: '+1 (555) 010-9999',
      autoComplete: 'tel',
    },
    {
      id: 'timezone',
      label: 'Timezone',
      icon: Clock3,
      placeholder: 'America/New_York',
      autoComplete: 'off',
      list: 'timezone-options',
      description: 'Medication schedules use this timezone for upcoming doses and adherence.',
    },
    {
      id: 'organization',
      label: 'Organization',
      icon: Building2,
      placeholder: 'Care agency or family context',
      autoComplete: 'organization',
    },
    {
      id: 'designation',
      label: 'Role',
      icon: BriefcaseBusiness,
      placeholder: 'Daughter, spouse, aide, nurse...',
      autoComplete: 'organization-title',
    },
  ]

  const displayName =
    `${formData.first_name} ${formData.last_name}`.trim() || user?.username || 'Your profile'

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f7faf8_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Caregiver profile
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Manage your CalmCompass details
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Keep your caregiver name, care recipient, and contact details current. Billing
            actions are intentionally hidden in the MVP path.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Profile identity</CardTitle>
              <CardDescription>
                Your avatar and caregiver summary across the MVP shell.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={AVATAR_ACCEPTED_TYPES.join(',')}
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="group relative inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Upload avatar"
                >
                  <Avatar className="h-32 w-32 rounded-full border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <AvatarImage
                      src={avatarPreview}
                      alt={`${displayName} avatar`}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-full bg-emerald-100 text-3xl font-semibold text-emerald-900">
                      {getInitials(user, formData)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-1 right-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-emerald-700 text-white shadow-lg transition group-hover:scale-105">
                    {uploadingAvatar ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-4 rounded-full"
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? 'Uploading photo...' : 'Change photo'}
                </Button>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                  {displayName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">@{user?.username}</p>
              </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Setup status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {user?.has_completed_setup ? 'Complete' : 'Needs caregiver details'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Care recipient
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {formData.care_recipient_name || 'Not added yet'}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Email verification
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {user?.email_verified ? 'Verified' : 'Pending verification'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Caregiver details</CardTitle>
              <CardDescription>
                Update the information used across the MVP experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <datalist id="timezone-options">
                    {SUPPORTED_TIMEZONES.map((timezoneValue) => (
                      <option key={timezoneValue} value={timezoneValue} />
                    ))}
                  </datalist>
                  {profileFields.map(({ id, label, icon: Icon, description, readOnly, ...field }) => (
                    <div key={id} className={id === 'care_recipient_name' ? 'sm:col-span-2' : ''}>
                      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {label}
                      </Label>
                      <div className="relative mt-2">
                        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id={id}
                          name={id}
                          value={formData[id]}
                          onChange={handleChange}
                          className="h-12 rounded-2xl border-slate-200 pl-10"
                          readOnly={readOnly}
                          {...field}
                        />
                      </div>
                      {description ? (
                        <p className="mt-2 text-xs text-slate-500">{description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div>
                  <Label htmlFor="bio" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Notes
                  </Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Optional caregiver note or role context"
                    className="mt-2 rounded-2xl border-slate-200"
                  />
                </div>

                <Button type="submit" className="rounded-full px-6" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
