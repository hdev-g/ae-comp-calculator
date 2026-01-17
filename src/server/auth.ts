import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/server/db";
import { findWorkspaceMemberByEmail } from "@/server/attioClient";
import { getAllowedEmailDomains, getSeedAdminEmails } from "@/server/env";

function isEmailAllowed(email: string): boolean {
  const allowed = getAllowedEmailDomains();
  if (allowed.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain && allowed.includes(domain));
}

function isSeedAdmin(email: string): boolean {
  const admins = getSeedAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.toLowerCase());
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // ensures we get `sub` and `email`
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = (profile?.email ?? "").toString().toLowerCase();
      const googleSub = (profile as any)?.sub?.toString();

      if (!email || !googleSub) return false;
      if (!isEmailAllowed(email)) return false;

      const role = isSeedAdmin(email) ? "ADMIN" : "AE";

      const user = await prisma.user.upsert({
        where: { googleSub },
        update: {
          email,
          fullName: (profile?.name ?? profile?.given_name ?? profile?.family_name ?? null)?.toString() ?? null,
          role,
          status: "ACTIVE",
        },
        create: {
          email,
          googleSub,
          fullName: (profile?.name ?? null)?.toString() ?? null,
          role,
          status: "ACTIVE",
        },
        select: { id: true, role: true },
      });

      if (user.role === "AE") {
        await prisma.aEProfile.upsert({
          where: { userId: user.id },
          update: { status: "ACTIVE" },
          create: { userId: user.id, status: "ACTIVE" },
          select: { id: true },
        });

        // Best-effort Attio linkage (skip if no ATTIO_API_KEY)
        if (process.env.ATTIO_API_KEY) {
          try {
            const member = await findWorkspaceMemberByEmail(email);
            if (member?.id) {
              await prisma.aEProfile.update({
                where: { userId: user.id },
                data: { attioWorkspaceMemberId: member.id },
              });
            }
          } catch (e) {
            console.warn("[auth] Attio member auto-link failed:", e);
          }
        }
      }

      return true;
    },
    async jwt({ token, account, profile }) {
      // Only on initial sign-in, persist app user id/role in the JWT.
      if (account?.provider === "google" && profile) {
        const googleSub = (profile as any)?.sub?.toString();
        const email = (profile as any)?.email?.toString()?.toLowerCase();

        const user =
          (googleSub
            ? await prisma.user.findUnique({ where: { googleSub }, select: { id: true, role: true } })
            : null) ??
          (email ? await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } }) : null);

        if (user) {
          (token as any).appUserId = user.id;
          (token as any).role = user.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = (token as any).appUserId;
      (session.user as any).role = (token as any).role;
      return session;
    },
  },
};

