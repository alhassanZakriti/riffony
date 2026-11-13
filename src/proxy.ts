import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/login",
  publicRoutes: [
    "/",
    "/daily-puzzle",
    "/pricing",
    "/privacy",
    "/terms",
    "/login",
    "/register",
    "/forgot-password",
    "/api/daily-puzzle",
  ],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/).*)"],
};
