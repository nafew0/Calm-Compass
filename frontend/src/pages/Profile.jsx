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

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { resolveApiAssetUrl } from '@/services/api'
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
    setFormData((current) => ({ ...current, [name]: value }))
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
      toast({ title: 'Profile saved', variant: 'success' })
    } else {
      toast({
        title: 'Could not save profile',
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
    if (!file) return

    if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid image',
        description: 'Use JPG, PNG, WEBP, or GIF.',
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
      toast({ title: 'Photo updated', variant: 'success' })
    } else {
      setAvatarPreview(previousPreview)
      toast({
        title: 'Photo upload failed',
        description: result.error,
        variant: 'error',
        duration: 4500,
      })
    }

    setUploadingAvatar(false)
    event.target.value = ''
  }

  const profileFields = [
    { id: 'first_name', label: 'First name', icon: UserRound, autoComplete: 'given-name' },
    { id: 'last_name', label: 'Last name', icon: UserRound, autoComplete: 'family-name' },
    { id: 'care_recipient_name', label: 'Care recipient', icon: HeartHandshake, autoComplete: 'off' },
    { id: 'email', label: 'Email', icon: Mail, autoComplete: 'email', readOnly: true },
    { id: 'phone', label: 'Phone', icon: Phone, autoComplete: 'tel' },
    { id: 'timezone', label: 'Timezone', icon: Clock3, autoComplete: 'off', list: 'timezone-options' },
    { id: 'organization', label: 'Organization', icon: Building2, autoComplete: 'organization' },
    { id: 'designation', label: 'Role', icon: BriefcaseBusiness, autoComplete: 'organization-title' },
  ]

  const displayName =
    `${formData.first_name} ${formData.last_name}`.trim() || user?.username || 'Profile'

  return (
    <div className="page-shell screen-enter">
      <div className="page-stack max-w-3xl space-y-4">
        <section className="soft-card p-4">
          <div className="flex items-center gap-4">
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
              className="group relative inline-flex shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Upload avatar"
            >
              <Avatar className="h-20 w-20 border border-[rgb(var(--theme-border-rgb))]">
                <AvatarImage src={avatarPreview} alt={`${displayName} avatar`} className="object-cover" />
                <AvatarFallback className="bg-[rgb(var(--theme-primary-soft-rgb))] text-xl font-semibold text-[rgb(var(--theme-primary-ink-rgb))]">
                  {getInitials(user, formData)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white bg-primary text-white shadow-md transition group-hover:scale-105">
                {uploadingAvatar ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </span>
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                {displayName}
              </h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">@{user?.username}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? 'Uploading...' : 'Change photo'}
              </Button>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="soft-card space-y-4 p-4">
          <datalist id="timezone-options">
            {SUPPORTED_TIMEZONES.map((timezoneValue) => (
              <option key={timezoneValue} value={timezoneValue} />
            ))}
          </datalist>

          <div className="grid gap-4 md:grid-cols-2">
            {profileFields.map(({ id, label, icon: Icon, readOnly, ...field }) => (
              <div key={id} className={id === 'care_recipient_name' ? 'md:col-span-2' : ''}>
                <Label htmlFor={id} className="text-sm font-semibold text-foreground">
                  {label}
                </Label>
                <div className="relative mt-2">
                  <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={id}
                    name={id}
                    value={formData[id]}
                    onChange={handleChange}
                    className="pl-10"
                    readOnly={readOnly}
                    {...field}
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="bio" className="text-sm font-semibold text-foreground">
              Notes
            </Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Optional context"
              className="mt-2"
            />
          </div>

          <Button type="submit" className="w-full" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save profile'}
          </Button>
        </form>
      </div>
    </div>
  )
}
