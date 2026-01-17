import { NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

function sanitizeExt(mime: string | null) {
  if (!mime) return "bin";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = (form?.get("file") ?? null) as File | null;
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Max file size is 10MB" }, { status: 400 });

  const ext = sanitizeExt(file.type);
  const filename = `users/${userId}/profile.${ext}`;

  // Remove old blob first (best-effort).
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { profileImageUrl: true, profileImagePathname: true },
  });

  try {
    if (existing?.profileImageUrl) await del(existing.profileImageUrl);
  } catch (e) {
    console.warn("[profile-photo] failed to delete previous blob:", e);
  }

  const blob = await put(filename, file, { access: "public", addRandomSuffix: true });

  await prisma.user.update({
    where: { id: userId },
    data: { profileImageUrl: blob.url, profileImagePathname: blob.pathname },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, url: blob.url });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { profileImageUrl: true, profileImagePathname: true },
  });

  if (existing?.profileImageUrl) {
    try {
      await del(existing.profileImageUrl);
    } catch (e) {
      console.warn("[profile-photo] failed to delete blob:", e);
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { profileImageUrl: null, profileImagePathname: null },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}

