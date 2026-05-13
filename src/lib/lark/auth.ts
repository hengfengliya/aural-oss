/**
 * Lark (Feishu) OAuth v2 helper.
 *
 * Flow: /authorize → code → /oauth/token → user_info
 * Docs: https://open.feishu.cn/document/server-docs/authentication-management/login-state-management/obtain_identity
 */

const LARK_AUTHORIZE_URL =
  "https://accounts.feishu.cn/open-apis/authen/v1/authorize";
const LARK_TOKEN_URL =
  "https://open.feishu.cn/open-apis/authen/v2/oauth/token";
const LARK_USERINFO_URL =
  "https://open.feishu.cn/open-apis/authen/v1/user_info";

export type LarkUserInfo = {
  name: string;
  en_name?: string;
  avatar_url?: string;
  avatar_thumb?: string;
  open_id: string;
  union_id: string;
  user_id?: string;
  email?: string;
  enterprise_email?: string;
  mobile?: string;
};

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export function getLarkConfig() {
  return {
    appId: requireEnv("LARK_APP_ID"),
    appSecret: requireEnv("LARK_APP_SECRET"),
    redirectUri: requireEnv("LARK_REDIRECT_URI"),
  };
}

export function buildAuthorizeUrl(state: string): string {
  const { appId, redirectUri } = getLarkConfig();
  // contact:user.employee:readonly is required for enterprise_email (admin-assigned
  // mailbox in Lark contact). contact:user.email:readonly only covers the
  // account-level primary email which is often unset for users registered by phone.
  const scope =
    "contact:user.base:readonly contact:user.email:readonly contact:user.employee:readonly contact:user.id:readonly";
  // Hand-build query so spaces in scope are encoded as %20 (not +), which Lark prefers.
  const qs = [
    `app_id=${encodeURIComponent(appId)}`,
    `redirect_uri=${encodeURIComponent(redirectUri)}`,
    `state=${encodeURIComponent(state)}`,
    `scope=${encodeURIComponent(scope)}`,
  ].join("&");
  return `${LARK_AUTHORIZE_URL}?${qs}`;
}

type LarkTokenResponse = {
  code?: number;
  error?: string;
  error_description?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export async function exchangeCodeForToken(code: string): Promise<string> {
  const { appId, appSecret, redirectUri } = getLarkConfig();

  const res = await fetch(LARK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: appId,
      client_secret: appSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as LarkTokenResponse;

  if (!res.ok || !data.access_token) {
    throw new Error(
      `Lark token exchange failed: ${data.error ?? data.code ?? res.status} - ${
        data.error_description ?? "unknown"
      }`,
    );
  }

  return data.access_token;
}

type LarkUserInfoResponse = {
  code: number;
  msg: string;
  data?: LarkUserInfo;
};

export async function fetchLarkUserInfo(
  userAccessToken: string,
): Promise<LarkUserInfo> {
  const res = await fetch(LARK_USERINFO_URL, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
    cache: "no-store",
  });

  const payload = (await res.json()) as LarkUserInfoResponse;

  if (!res.ok || payload.code !== 0 || !payload.data) {
    throw new Error(
      `Lark user_info failed: code=${payload.code} msg=${payload.msg}`,
    );
  }

  return payload.data;
}

const LARK_CONTACT_USER_URL =
  "https://open.feishu.cn/open-apis/contact/v3/users";

type LarkContactUserResponse = {
  code: number;
  msg: string;
  data?: {
    user?: {
      email?: string;
      enterprise_email?: string;
      mobile?: string;
      name?: string;
      en_name?: string;
      open_id?: string;
      union_id?: string;
      user_id?: string;
    };
  };
};

/**
 * Fallback: query contact v3 with user_access_token to get richer fields
 * (notably enterprise_email which v1 user_info never returns).
 *
 * Requires scope: contact:user.email:readonly (already granted in this app).
 */
export async function fetchLarkContactUser(
  userAccessToken: string,
  openId: string,
): Promise<{ email?: string; enterprise_email?: string } | null> {
  const url = `${LARK_CONTACT_USER_URL}/${encodeURIComponent(openId)}?user_id_type=open_id`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
    cache: "no-store",
  });

  const payload = (await res.json()) as LarkContactUserResponse;

  if (!res.ok || payload.code !== 0 || !payload.data?.user) {
    console.warn(
      `[lark/contact] v3 lookup failed: code=${payload.code} msg=${payload.msg}`,
    );
    return null;
  }

  return {
    email: payload.data.user.email,
    enterprise_email: payload.data.user.enterprise_email,
  };
}

/**
 * Resolve the email to use as the Supabase user identifier.
 * Prefers enterprise_email (more stable for org users), falls back to personal email.
 * Returns null if the Lark user has no email bound — caller should surface an error.
 */
export function pickEmail(info: LarkUserInfo): string | null {
  const candidate = info.enterprise_email?.trim() || info.email?.trim();
  return candidate && candidate.length > 0 ? candidate.toLowerCase() : null;
}

/**
 * Always-resolvable email for Supabase auth.users.email (unique identifier only).
 *
 * Lark's /authen/v1/user_info returns email="" when the user hasn't bound
 * a primary mailbox at the *account* layer — and the v3 contact fallback is
 * gated behind tenant_access_token + admin scopes we don't have. To unblock
 * HR sign-in we synthesize a stable identifier from open_id, which Lark
 * guarantees is per-user-per-tenant unique and immutable.
 */
export function resolveSupabaseEmail(info: LarkUserInfo): string {
  const real = pickEmail(info);
  if (real) return real;
  return `${info.open_id.toLowerCase()}@lark.local`;
}
