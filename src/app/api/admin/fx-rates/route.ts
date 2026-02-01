import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rates = await prisma.fxRate.findMany({
    orderBy: [{ year: "desc" }, { currencyCode: "asc" }],
  });

  return NextResponse.json({ rates });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const currencyCode =
    typeof data.currencyCode === "string" && data.currencyCode.trim()
      ? data.currencyCode.trim().toUpperCase()
      : "";
  const year = typeof data.year === "number" ? data.year : Number(data.year);
  const rate = typeof data.rate === "number" ? data.rate : Number(data.rate);

  if (!currencyCode || !Number.isFinite(year) || !Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ error: "currencyCode, year, and positive rate are required" }, { status: 400 });
  }

  const fxRate = await prisma.fxRate.upsert({
    where: { currencyCode_year: { currencyCode, year } },
    update: { rate },
    create: { currencyCode, year, rate },
  });

  return NextResponse.json({ rate: fxRate });
}
