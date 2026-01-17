import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const take = Math.min(Number(url.searchParams.get("limit") ?? "25") || 25, 50);

  const members = await prisma.attioWorkspaceMember.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { fullName: { contains: q, mode: "insensitive" } },
            { id: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ email: "asc" }, { fullName: "asc" }],
    take,
    select: { id: true, email: true, fullName: true },
  });

  return NextResponse.json({ members });
}

