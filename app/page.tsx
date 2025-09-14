import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { ProtectedJournal } from "@/components/protected-journal"

export default async function Home() {
  const session = await getServerSession(authOptions as any)
  if (!session) {
    redirect("/auth/signin")
  }
  return <ProtectedJournal />
}
