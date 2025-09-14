import type React from "react"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "@/components/providers/session-provider"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import "./globals.css"

export const metadata: Metadata = {
  title: "MindsetOS.ai - AI-Powered Mindset Coaching",
  description: "Transform your mindset with AI-powered journal analysis and cognitive reframing exercises.",
  generator: "v0.app",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(authOptions as any)
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthProvider session={session}>
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  )
}
