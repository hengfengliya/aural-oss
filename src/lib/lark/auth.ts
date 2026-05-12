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
  const scope =
    "contact:user.base:readonly contact:user.email:readonly contact:user.id:readonly";
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

/**
 * Resolve the email to use as the Supabase user identifier.
 * Prefers enterprise_email (more stable for org users), falls back to personal email.
 * Returns null if the Lark user has no email bound — caller should surface an error.
 */
export function pickEmail(info: LarkUserInfo): string | null {
  const candidate = info.enterprise_email?.trim() || info.email?.trim();
  return candidate && candidate.length > 0 ? candidate.toLowerCase() : null;
}
