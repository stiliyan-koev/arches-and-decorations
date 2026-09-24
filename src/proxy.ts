import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs before every /admin request: refreshes the Supabase session cookie and
// bounces anyone without one to the login page. Server Components can't write
// cookies — this is the "elsewhere" the catch in supabase/server.ts defers to.
//
// Next 16 calls this file convention "proxy"; it was "middleware" before.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No database configured means there's nothing to protect, and building a
  // client would throw. The admin layout renders its own warning instead.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() re-validates the token with Supabase. getSession() would just
  // trust whatever cookie the browser sent, which is not a guard.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (!user && !isLoginPage) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/admin/login";
    return NextResponse.redirect(redirect);
  }

  if (user && isLoginPage) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/admin/products";
    return NextResponse.redirect(redirect);
  }

  return response;
}

// Only the admin needs a session. The public site stays fully cacheable.
export const config = {
  matcher: ["/admin/:path*"],
};
