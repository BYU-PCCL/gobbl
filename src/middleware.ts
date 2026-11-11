import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/onboarding/")) {
      return NextResponse.next();
    }

    if (!token?.onboardingCompletedAt) {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding/survey";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
);

export const config = {
  matcher: [
    "/home/:path*",
    "/hatch/:path*",
    "/school/:path*",
    "/chat/:path*",
    "/skills/:path*",
    "/shop/:path*",
    "/profile/:path*",
    "/friends/:path*",
    "/onboarding/:path*",
  ],
};
