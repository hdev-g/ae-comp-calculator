import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase() ?? null;
  const userId = session?.user?.id ?? null;

  if (!session?.user || (!email && !userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user =
    (userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, fullName: true, role: true, status: true, aeProfile: { select: { id: true, attioWorkspaceMemberId: true, status: true } } },
        })
      : null) ??
    (email
      ? await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, fullName: true, role: true, status: true, aeProfile: { select: { id: true, attioWorkspaceMemberId: true, status: true } } },
        })
      : null);

  return NextResponse.json({ user });
}

