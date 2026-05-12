import { buildAuthorizeUrl } from "@/lib/lark/auth";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

const STATE_COOKIE = "lark_oauth_state";
const STATE_TTL_SECONDS = 600;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = randomBytes(24).toString("hex");
    const url = buildAuthorizeUrl(state);

    const res = NextResponse.redirect(url);
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: STATE_TTL_SECONDS,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: "lark_oauth_misconfigured", detail: message },
      { status: 500 },
    );
  }
}
