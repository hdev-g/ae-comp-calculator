import type { NextAuthOptions, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

import { reconcileDealsToAEs } from "@/server/aeDealAssignment";
import { runAttioSync } from "@/server/attioSync";
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

function getProfileSub(profile: Profile): string | null {
  const rec = profile as unknown as Record<string, unknown>;
  const sub = rec["sub"];
  return typeof sub === "string" ? sub : null;
}

function getProfileName(profile: Profile): string | null {
  if (profile.name) return profile.name.toString();
  const rec = profile as unknown as Record<string, unknown>;
  const given = rec["given_name"];
  const family = rec["family_name"];
  const full = [given, family].filter((v) => typeof v === "string" && v.trim().length > 0).join(" ");
  return full ? full : null;
}

function getProfilePicture(profile: Profile): string | null {
  const rec = profile as unknown as Record<string, unknown>;
  const picture = rec["picture"];
  return typeof picture === "string" && picture.startsWith("http") ? picture : null;
}

export const authOptions: NextAuthOptions = {
  // NextAuth v4 expects NEXTAUTH_SECRET; allow AUTH_SECRET for convenience.
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
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
      const googleSub = profile ? getProfileSub(profile) : null;

      if (!email || !googleSub) return false;
      if (!isEmailAllowed(email)) return false;

      const role = isSeedAdmin(email) ? "ADMIN" : "AE";

      const profilePicture = profile ? getProfilePicture(profile) : null;

      const user = await prisma.user.upsert({
        where: { googleSub },
        update: {
          email,
          fullName: profile ? getProfileName(profile) : null,
          profileImageUrl: profilePicture,
          role,
          status: "ACTIVE",
        },
        create: {
          email,
          googleSub,
          fullName: profile ? getProfileName(profile) : null,
          profileImageUrl: profilePicture,
          role,
          status: "ACTIVE",
        },
        select: { id: true, role: true },
      });

      // Create AEProfile for all users (regardless of admin status)
      // This ensures everyone appears in the Users admin page
      await prisma.aEProfile.upsert({
        where: { userId: user.id },
        update: { status: "ACTIVE" },
        create: { userId: user.id, status: "ACTIVE" },
        select: { id: true },
      });

      // Best-effort Attio linkage by email:
      // 1) Prefer existing synced member in our DB (fast, no Attio API dependency)
      // 2) Fall back to Attio API lookup if ATTIO_API_KEY is set
      try {
        let memberId: string | null =
          (
            await prisma.attioWorkspaceMember.findUnique({
              where: { email },
              select: { id: true },
            })
          )?.id ?? null;

        if (!memberId && process.env.ATTIO_API_KEY) {
          const member = await findWorkspaceMemberByEmail(email);
          if (member?.id) {
            memberId = member.id;
            // Persist a minimal member row so Settings can display "Connected".
            await prisma.attioWorkspaceMember.upsert({
              where: { id: member.id },
              update: { email, fullName: member.name ?? null },
              create: { id: member.id, email, fullName: member.name ?? null },
              select: { id: true },
            });
          }
        }

        if (memberId) {
          try {
            await prisma.aEProfile.update({
              where: { userId: user.id },
              data: { attioWorkspaceMemberId: memberId },
            });
          } catch (e) {
            // Likely unique constraint conflict (same Attio member linked to another AEProfile).
            console.warn("[auth] Attio member auto-link skipped:", e);
            memberId = null;
          }
        }

        // If we linked successfully, assign deals immediately so "My dashboard" works right after login.
        if (memberId) {
          await reconcileDealsToAEs({ onlyMemberId: memberId });
        }
      } catch (e) {
        console.warn("[auth] Attio member auto-link failed:", e);
      }

      // Trigger a full Attio sync in the background (fire-and-forget)
      // This ensures any new deals since the last hourly sync are pulled in
      runAttioSync().catch((e) => {
        console.warn("[auth] Background Attio sync failed:", e);
      });

      return true;
    },
    async jwt({ token, account, profile }) {
      const t = token as JWT;
      // Only on initial sign-in, persist app user id/role in the JWT.
      if (account?.provider === "google" && profile) {
        const googleSub = getProfileSub(profile);
        const email = (profile.email ?? "").toString().toLowerCase();

        const user =
          (googleSub
            ? await prisma.user.findUnique({ where: { googleSub }, select: { id: true, role: true } })
            : null) ??
          (email ? await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } }) : null);

        if (user) {
          t.appUserId = user.id;
          t.role = user.role;
        }
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as JWT;
      session.user.id = t.appUserId;
      session.user.role = t.role;
      return session;
    },
  },
};

