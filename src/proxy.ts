import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { env } from "@/lib/env";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/config";

const COOKIE_NAME = "NEXT_LOCALE";

function pickLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale;
  }
  const accept = request.headers.get("accept-language") ?? "";
  const primary = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  if (primary.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes: never locale-rewrite, never redirect — just refresh the session.
  if (pathname.startsWith("/api")) {
    const { response } = await updateSession(request);
    return response;
  }

  // Locale routing for everything else.
  const hasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (!hasLocale) {
    const locale = pickLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // Refresh Supabase session cookies on every locale-prefixed request.
  const { response, user } = await updateSession(request);

  // Gate /{lang}/admin/* (except /{lang}/admin/login).
  const adminMatch = pathname.match(/^\/(vi|en)\/admin(\/.*)?$/);
  if (adminMatch) {
    const rest = adminMatch[2] ?? "";
    const isLogin = rest === "/login";
    if (!isLogin) {
      if (!user?.email) {
        const url = request.nextUrl.clone();
        url.pathname = `/${adminMatch[1]}/admin/login`;
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
      const allowed = env.allowedAdminEmails;
      if (allowed.length > 0 && !allowed.includes(user.email.toLowerCase())) {
        const url = request.nextUrl.clone();
        url.pathname = `/${adminMatch[1]}/admin/login`;
        url.searchParams.set("error", "not_allowed");
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
