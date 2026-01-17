export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect everything except Next internals, auth routes, and the login page
    "/((?!api/auth|login|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif)).*)",
  ],
};

