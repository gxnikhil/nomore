import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_EMAILS = [
  'nikhiltripathi911@gmail.com',
  'dwivedivaishnavi15@gmail.com',
]

const PUBLIC_ROUTES = ['/login', '/auth/callback', '/access-denied']
const PROTECTED_ROUTE_PREFIX = ['/', '/home', '/chat', '/memories', '/albums', '/profile', '/settings', '/stories']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not remove this line. It refreshes the session.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    // If user is logged in and on login page, redirect to home
    if (user && pathname === '/login') {
      const email = user.email?.toLowerCase()
      if (email && ALLOWED_EMAILS.includes(email)) {
        const url = request.nextUrl.clone()
        url.pathname = '/home'
        return NextResponse.redirect(url)
      }
    }
    return supabaseResponse
  }

  // No user → redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // User exists but email not in allowlist → access denied
  const email = user.email?.toLowerCase()
  if (!email || !ALLOWED_EMAILS.includes(email)) {
    const url = request.nextUrl.clone()
    url.pathname = '/access-denied'
    return NextResponse.redirect(url)
  }

  // Root redirect to home
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
