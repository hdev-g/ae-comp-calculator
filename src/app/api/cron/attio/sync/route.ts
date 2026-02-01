import { NextResponse } from "next/server";

import { runAttioSync } from "@/server/attioSync";

function isAuthorized(req: Request) {
  if (req.headers.get("x-vercel-cron") === "1") return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  return token === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await runAttioSync({ actorUserId: null });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Attio sync failed";
    console.error("[attio-cron]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

