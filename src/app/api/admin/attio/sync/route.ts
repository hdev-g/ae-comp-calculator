import { NextResponse } from "next/server";

import { runAttioSync } from "@/server/attioSync";
import { requireAdmin } from "@/server/rbac";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await runAttioSync({ actorUserId: auth.session.user.id ?? null });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Attio sync failed";
    console.error("[attio-sync]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

