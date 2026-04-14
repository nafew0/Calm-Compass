export function getAppHomePath(user) {
  return user?.has_completed_setup ? '/dashboard' : '/setup'
}

export function getPostAuthRedirect(user, fallbackPath = '/dashboard') {
  if (!user?.has_completed_setup) {
    return '/setup'
  }

  return fallbackPath || '/dashboard'
}

