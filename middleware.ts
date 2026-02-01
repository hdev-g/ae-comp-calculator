export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect everything except Next internals, auth routes, and the login page
    "/((?!api/auth|api/cron|login|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif)).*)",
  ],
};

