import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpenText,
  ClipboardPenLine,
  Home,
  LogOut,
  PillBottle,
  ShieldCheck,
  User,
} from 'lucide-react'

import BrandLogo from '@/components/branding/BrandLogo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { resolveApiAssetUrl } from '@/services/api'
import { cn } from '@/lib/utils'

const APP_NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/log', label: 'Log', icon: ClipboardPenLine },
  { to: '/decoder', label: 'Decoder', icon: BookOpenText, primary: true },
  { to: '/medications', label: 'Meds', icon: PillBottle },
  { to: '/profile', label: 'Profile', icon: User },
]

function getPageTitle(pathname) {
  if (pathname.startsWith('/decoder/behavior/')) return 'Decoder'
  if (pathname.startsWith('/decoder/')) return 'Browse'
  if (pathname.startsWith('/decoder')) return 'Decoder'
  if (pathname.startsWith('/log')) return 'Daily Log'
  if (pathname.startsWith('/medications')) return 'Medications'
  if (pathname.startsWith('/profile')) return 'Profile'
  return 'Home'
}

function getInitials(user) {
  if (user?.first_name || user?.last_name) {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
  }

  return user?.username?.slice(0, 2).toUpperCase() || 'CC'
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const title = getPageTitle(location.pathname)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <Link to="/dashboard" aria-label="CalmCompass home">
            <BrandLogo compact />
          </Link>
          <div className="app-topbar-title min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.care_recipient_name || 'Care workspace'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open account menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={resolveApiAssetUrl(user?.avatar)} alt={user?.username || 'Account'} />
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-semibold">{user?.username || 'Caregiver'}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              {user?.can_access_admin ? (
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin Panel
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="app-main">
        <div className="app-layout">
          <nav className="app-tabbar" aria-label="App navigation">
            {APP_NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) =>
                    cn('app-tab', item.primary && 'app-tab-primary', isActive && 'is-active')
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="app-content">{children}</div>
        </div>
      </main>
    </div>
  )
}
