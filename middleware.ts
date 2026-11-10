import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options?: any }[]) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && (req.nextUrl.pathname.startsWith("/client") || req.nextUrl.pathname.startsWith("/artisan") || req.nextUrl.pathname.startsWith("/admin"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?role=${req.nextUrl.pathname.startsWith("/artisan") ? "artisan" : "client"}`;
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ["/client/:path*", "/artisan/:path*", "/admin/:path*"] };
