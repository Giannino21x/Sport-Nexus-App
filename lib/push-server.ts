// Server-seitiger Push-Versand. Zwei Wege, je Geräte-Plattform:
//   iOS     → direkt an APNs (HTTP/2 + ES256-JWT; Team 699K5VAG3G)
//   Android → FCM HTTP v1 (Service-Account-JWT → OAuth-Token)
// Beide Wege sind env-gated: fehlen die Credentials, wird die Plattform
// still übersprungen (einmalig geloggt) — die App funktioniert ohne Push
// vollständig weiter. Benötigte Env-Vars (Vercel):
//   APNS_KEY_P8    Inhalt des .p8 APNs-Auth-Keys (Developer-Portal → Keys)
//   APNS_KEY_ID    Key-ID des .p8
//   FIREBASE_SERVICE_ACCOUNT  JSON des Firebase-Service-Accounts
import { connect, constants as h2 } from "node:http2";
import { createPrivateKey, createSign } from "node:crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const APNS_TEAM_ID = "699K5VAG3G";
const APNS_TOPIC = "ch.sportnexus.app";
const APNS_HOST = "https://api.push.apple.com";

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

// ---------- APNs ----------
let apnsJwtCache: { token: string; exp: number } | null = null;

function apnsJwt(): string | null {
  const p8 = process.env.APNS_KEY_P8;
  const keyId = process.env.APNS_KEY_ID;
  if (!p8 || !keyId) return null;
  const now = Math.floor(Date.now() / 1000);
  // APNs akzeptiert Tokens bis 60 Min; nach 50 Min erneuern.
  if (apnsJwtCache && apnsJwtCache.exp > now) return apnsJwtCache.token;
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = b64url(JSON.stringify({ iss: APNS_TEAM_ID, iat: now }));
  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  const key = createPrivateKey(p8.replace(/\\n/g, "\n"));
  const token = `${header}.${payload}.${b64url(signer.sign({ key, dsaEncoding: "ieee-p1363" }))}`;
  apnsJwtCache = { token, exp: now + 50 * 60 };
  return token;
}

// Ein APNs-Push über eine kurzlebige HTTP/2-Verbindung (fetch kann kein h2).
// Resolve: { ok, gone } — gone = Token ist tot (410/BadDeviceToken) → löschen.
function apnsSend(
  deviceToken: string,
  payload: object,
): Promise<{ ok: boolean; gone: boolean }> {
  return new Promise((resolve) => {
    const jwt = apnsJwt();
    if (!jwt) return resolve({ ok: false, gone: false });
    const client = connect(APNS_HOST);
    client.on("error", () => resolve({ ok: false, gone: false }));
    const req = client.request({
      [h2.HTTP2_HEADER_METHOD]: "POST",
      [h2.HTTP2_HEADER_PATH]: `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": APNS_TOPIC,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });
    let status = 0;
    let body = "";
    req.on("response", (headers) => { status = Number(headers[":status"] ?? 0); });
    req.setEncoding("utf8");
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      client.close();
      const gone = status === 410 || (status === 400 && body.includes("BadDeviceToken"));
      if (status !== 200 && !gone) console.error("[push:apns]", status, body.slice(0, 200));
      resolve({ ok: status === 200, gone });
    });
    req.on("error", () => { client.close(); resolve({ ok: false, gone: false }); });
    req.end(JSON.stringify(payload));
  });
}

// ---------- FCM (HTTP v1) ----------
let fcmTokenCache: { token: string; exp: number; projectId: string } | null = null;

async function fcmAccessToken(): Promise<{ token: string; projectId: string } | null> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  const now = Math.floor(Date.now() / 1000);
  if (fcmTokenCache && fcmTokenCache.exp > now) {
    return { token: fcmTokenCache.token, projectId: fcmTokenCache.projectId };
  }
  try {
    const sa = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
    const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = b64url(JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }));
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    const assertion = `${header}.${claims}.${b64url(signer.sign(sa.private_key.replace(/\\n/g, "\n")))}`;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${assertion}`,
    });
    if (!res.ok) {
      console.error("[push:fcm] token exchange failed", res.status);
      return null;
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    fcmTokenCache = { token: json.access_token, exp: now + Math.min(json.expires_in - 120, 3000), projectId: sa.project_id };
    return { token: json.access_token, projectId: sa.project_id };
  } catch (e) {
    console.error("[push:fcm]", e instanceof Error ? e.message : e);
    return null;
  }
}

async function fcmSend(
  deviceToken: string,
  msg: { title: string; body: string; link: string },
): Promise<{ ok: boolean; gone: boolean }> {
  const auth = await fcmAccessToken();
  if (!auth) return { ok: false, gone: false };
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title: msg.title, body: msg.body || undefined },
        data: msg.link ? { link: msg.link } : undefined,
        android: { priority: "HIGH", notification: { default_sound: true } },
      },
    }),
  });
  // 404/UNREGISTERED = Token tot → löschen.
  const gone = res.status === 404;
  if (!res.ok && !gone) console.error("[push:fcm] send failed", res.status, (await res.text()).slice(0, 200));
  return { ok: res.ok, gone };
}

// ---------- Öffentliche API ----------
export type PushMessage = { title: string; body: string; link: string };

// Schickt eine Push-Nachricht an alle registrierten Geräte eines Members.
// Badge (iOS) = aktuelle Anzahl ungelesener Notifications. Tote Tokens
// werden dabei aufgeräumt.
export async function sendPushToMember(memberId: string, msg: PushMessage): Promise<void> {
  const supabase = admin();
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token, platform")
    .eq("member_id", memberId);
  if (!tokens || tokens.length === 0) return;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .eq("unread", true);
  const badge = count ?? 1;

  const dead: string[] = [];
  await Promise.all(tokens.map(async (t) => {
    const r = t.platform === "ios"
      ? await apnsSend(t.token, {
          aps: { alert: { title: msg.title, body: msg.body || undefined }, badge, sound: "default" },
          link: msg.link || undefined,
        })
      : await fcmSend(t.token, msg);
    if (r.gone) dead.push(t.token);
  }));
  if (dead.length > 0) {
    await supabase.from("push_tokens").delete().in("token", dead);
  }
}
