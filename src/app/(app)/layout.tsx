import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import { Profile } from '@/lib/types'


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

  // Fetch current user profile
  let userProfile: Profile | null = null
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    userProfile = profile || null
  } catch (err) {
    console.error('Failed to fetch profile in AppLayout:', err)
  }

  // If user has not chosen a unique username yet, redirect to setup
  if (!userProfile?.username) {
    redirect('/username-setup')
  }

  return (
    <AppShell userId={user.id} userProfile={userProfile}>
      {children}
    </AppShell>
  )
}
