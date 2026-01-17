import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { ok: false as const, session: null };
  if (session.user.role !== "ADMIN") return { ok: false as const, session };
  return { ok: true as const, session };
}

