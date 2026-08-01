import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Creates a single Supabase client that both manages session cookies AND
 * calls getUser(). If Supabase refreshes an expired token, the new cookie
 * is captured by setAll() and attached to supabaseResponse — it's never lost.
 */
export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write the refreshed token into the request (for downstream reads)
          // and into supabaseResponse (so it reaches the browser).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() is called here — inside the same client whose setAll() writes
  // refreshed tokens into supabaseResponse. Nothing falls into the void.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
};
