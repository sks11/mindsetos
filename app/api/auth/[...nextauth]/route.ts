import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt",
    maxAge: 5 * 60, // 5 minutes - shorter session to force refresh
  },
  callbacks: {
    async session({ session, token }: any) {
      // Add user tier information to session - always fetch fresh data
      if (session?.user?.email) {
        try {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
          // Add cache-busting parameter to force fresh fetch
          const response = await fetch(`${backendUrl}/user-tier/${session.user.email}?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
          if (response.ok) {
            const tierInfo = await response.json()
            session.user.tier = tierInfo.tier
            session.user.messagesUsed = tierInfo.messages_used_this_month
            session.user.messagesLimit = tierInfo.messages_limit
            session.user.messagesRemaining = tierInfo.messages_remaining
            session.user.currentMonthYear = tierInfo.current_month_year
            console.log('DEBUG: Fresh tier data fetched:', tierInfo)
          } else {
            console.error('Failed to fetch user tier, response not ok:', response.status)
          }
        } catch (error) {
          console.error('Failed to fetch user tier:', error)
          // Set default values if fetch fails
          session.user.tier = 'free'
          session.user.messagesUsed = 0
          session.user.messagesLimit = 100  // Updated default to match current free tier
          session.user.messagesRemaining = 100
        }
      }
      return session
    },
    async jwt({ token, user }: any) {
      return token
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
} as const

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 