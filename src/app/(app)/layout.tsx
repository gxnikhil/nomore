import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import { Profile } from '@/lib/types'

const ALLOWED_EMAILS = [
  'nikhiltripathi911@gmail.com',
  'dwivedivaishnavi15@gmail.com',
]

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const email = user.email?.toLowerCase()
  if (!email || !ALLOWED_EMAILS.includes(email)) {
    redirect('/access-denied')
  }

  // Fetch profiles for the private space
  let partnerProfile: Profile | null = null
  try {
    const { data: profiles } = await supabase.from('profiles').select('*')
    if (profiles && profiles.length > 0) {
      partnerProfile = profiles.find((p: Profile) => p.id !== user.id) || null
    }
  } catch (err) {
    console.error('Failed to fetch profiles in AppLayout:', err)
  }

  return (
    <AppShell userId={user.id} partnerProfile={partnerProfile}>
      {children}
    </AppShell>
  )
}
