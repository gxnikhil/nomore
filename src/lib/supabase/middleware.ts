import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_EMAILS = [
  'nikhiltripathi911@gmail.com',
  'dwivedivaishnavi15@gmail.com',
]

const PUBLIC_ROUTES = ['/login', '/auth/callback', '/access-denied']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname

  // Always allow static assets and robots.txt without middleware auth overhead
  if (pathname === '/robots.txt' || pathname.startsWith('/_next') || pathname.includes('.')) {
    return supabaseResponse
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vzjahhauiaucaxnksmze.supabase.co'
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6amFoaGF1aWF1Y2F4bmtzbXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MDk1NTgsImV4cCI6MjEwNTM4NTU1OH0.wqExPEX2Eeu8mQFLtyyV1rACcYOIcFWfsGnLjBnnuSw'

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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

    // Refresh session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Allow public routes
    if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
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
  } catch (err) {
    console.error('Middleware auth check error:', err)
    // Fallback: allow public routes on error, otherwise redirect unauthenticated to login
    if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}
