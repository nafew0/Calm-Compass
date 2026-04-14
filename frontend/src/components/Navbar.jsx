import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ClipboardList, LogOut, ShieldCheck, User } from "lucide-react"
import BrandLogo from '@/components/branding/BrandLogo'
import { resolveApiAssetUrl } from '@/services/api'
import { getAppHomePath } from '@/utils/appRoutes'

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const appHomePath = getAppHomePath(user)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return user?.username?.substring(0, 2).toUpperCase() || 'U'
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[rgb(var(--theme-border-rgb)/0.85)] bg-[rgb(var(--theme-neutral-rgb)/0.92)] backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to={isAuthenticated ? appHomePath : '/'} className="flex items-center gap-3">
            <BrandLogo compact showSubtitle={false} />
          </Link>

          <div className="hidden flex-1 lg:block" />

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to={appHomePath}>
                  <Button variant="ghost" className="rounded-full">
                    {user?.has_completed_setup ? 'Home' : 'Setup'}
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={resolveApiAssetUrl(user?.avatar)} alt={user?.full_name || user?.username} />
                        <AvatarFallback className="bg-[rgb(var(--theme-secondary-soft-rgb))] text-[rgb(var(--theme-secondary-ink-rgb))]">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-2xl" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.username}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(appHomePath)}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      <span>{user?.has_completed_setup ? 'Care Home' : 'Finish setup'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    {user?.can_access_admin ? (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        <span>Admin Panel</span>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="rounded-full">Log in</Button>
                </Link>
                <Link to="/register">
                  <Button className="rounded-full">Create account</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
