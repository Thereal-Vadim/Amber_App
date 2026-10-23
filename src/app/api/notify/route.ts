import { NextResponse } from "next/server";

type Body = {
  eventId?: string;
  actorId?: string;
  kind?: string;
  text?: string;
};

/**
 * Fan-out hook for change notifications.
 * Activity documents + client listeners deliver in-app pushes.
 * Optional FIREBASE_SERVICE_ACCOUNT_JSON can be wired later for FCM Admin.
 */
export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  if (!body.eventId || !body.text) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    delivered: 0,
    mode: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? "admin-pending" : "activity-only",
  });
}
