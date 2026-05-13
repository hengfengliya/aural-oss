import {
  exchangeCodeForToken,
  fetchLarkContactUser,
  fetchLarkUserInfo,
  pickEmail,
  type LarkUserInfo,
} from "@/lib/lark/auth";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

const STATE_COOKIE = "lark_oauth_state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorRedirect(request: NextRequest, code: string) {
  console.log(`[lark/callback] errorRedirect: ${code}`);
  const url = new URL("/login", request.url);
  url.searchParams.set("lark_error", code);
  return NextResponse.redirect(url);
}

async function ensureSupabaseUserAndGetHashedToken(
  email: string,
  info: LarkUserInfo,
): Promise<string> {
  const userMetadata = {
    lark_open_id: info.open_id,
    lark_union_id: info.union_id,
    name: info.name,
    avatar_url: info.avatar_url ?? info.avatar_thumb,
    source: "lark",
  };

  // Try to generate a magic link for an existing user first.
  let { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  // User not found → create then retry.
  if (error || !data?.properties?.hashed_token) {
    const errMsg = error?.message?.toLowerCase() ?? "";
    const looksMissing = errMsg.includes("not") || errMsg.includes("found");
    if (looksMissing) {
      const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: userMetadata,
      });
      if (createErr && !createErr.message?.toLowerCase().includes("registered")) {
        throw createErr;
      }
      const retry = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      data = retry.data;
      error = retry.error;
    }
  }

  if (error || !data?.properties?.hashed_token) {
    throw error ?? new Error("generateLink returned no hashed_token");
  }

  return data.properties.hashed_token;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateFromQuery = url.searchParams.get("state");
  const stateCookie = request.cookies.get(STATE_COOKIE)?.value;

  console.log(
    `[lark/callback] entry code=${code ? "Y" : "N"} stateQuery=${
      stateFromQuery ? stateFromQuery.slice(0, 8) : "N"
    } stateCookie=${stateCookie ? stateCookie.slice(0, 8) : "N"}`,
  );

  if (!code) return errorRedirect(request, "missing_code");
  if (!stateFromQuery || !stateCookie || stateFromQuery !== stateCookie) {
    return errorRedirect(request, "state_mismatch");
  }

  let userInfo: LarkUserInfo;
  let accessToken: string;
  try {
    accessToken = await exchangeCodeForToken(code);
    userInfo = await fetchLarkUserInfo(accessToken);
  } catch (err) {
    console.error("[lark/callback] exchange or user_info failed:", err);
    return errorRedirect(request, "lark_api_failed");
  }

  console.log(
    "[lark/callback] v1 user_info raw:",
    JSON.stringify(userInfo),
  );

  // Fallback: query contact v3 to get enterprise_email (v1 user_info never returns it).
  let contactExtra: { email?: string; enterprise_email?: string } | null = null;
  if (!pickEmail(userInfo) && userInfo.open_id) {
    try {
      contactExtra = await fetchLarkContactUser(accessToken, userInfo.open_id);
      console.log(
        "[lark/callback] v3 contact fallback:",
        JSON.stringify(contactExtra),
      );
      if (contactExtra) {
        userInfo.email = userInfo.email || contactExtra.email;
        userInfo.enterprise_email =
          userInfo.enterprise_email || contactExtra.enterprise_email;
      }
    } catch (err) {
      console.warn("[lark/callback] v3 contact lookup threw:", err);
    }
  }

  const email = pickEmail(userInfo);
  if (!email) {
    const url = new URL("/login", request.url);
    url.searchParams.set("lark_error", "no_email");
    // Dump full v1 + v3 payload (base64) so user can paste URL and we see exact server reply.
    const payload = {
      v1: userInfo,
      v3: contactExtra,
    };
    const b64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
      "base64url",
    );
    url.searchParams.set("_diag", b64);
    return NextResponse.redirect(url);
  }

  let hashedToken: string;
  try {
    hashedToken = await ensureSupabaseUserAndGetHashedToken(email, userInfo);
  } catch (err) {
    console.error("[lark/callback] supabase user provisioning failed:", err);
    return errorRedirect(request, "supabase_provision_failed");
  }

  const supabase = createServerSupabase();
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: hashedToken,
  });

  if (verifyErr) {
    console.error("[lark/callback] verifyOtp failed:", verifyErr);
    return errorRedirect(request, "session_verify_failed");
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
