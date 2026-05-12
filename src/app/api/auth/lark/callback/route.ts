import {
  exchangeCodeForToken,
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

  if (!code) return errorRedirect(request, "missing_code");
  if (!stateFromQuery || !stateCookie || stateFromQuery !== stateCookie) {
    return errorRedirect(request, "state_mismatch");
  }

  let userInfo: LarkUserInfo;
  try {
    const accessToken = await exchangeCodeForToken(code);
    userInfo = await fetchLarkUserInfo(accessToken);
  } catch (err) {
    console.error("[lark/callback] exchange or user_info failed:", err);
    return errorRedirect(request, "lark_api_failed");
  }

  const email = pickEmail(userInfo);
  if (!email) {
    return errorRedirect(request, "no_email");
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
