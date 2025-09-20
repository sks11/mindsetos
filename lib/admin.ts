// Admin configuration
export const ADMIN_EMAILS = [
  // Add your email addresses here for admin access
  'shravanksinghdce@gmail.com'
  // Add more admin emails as needed
]

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export function getAdminConfig() {
  return {
    isAdminEnabled: process.env.NODE_ENV === 'development' || ADMIN_EMAILS.length > 0,
    adminEmails: ADMIN_EMAILS
  }
}
