# Google OAuth Local Setup (End-to-End)

Use this guide to make Google login work locally without committing secrets.

## Local Testing Recommendation

For local testing, do not depend on Google login.

- Preferred local login:
  - Email: `integration-admin@ripplemark.local`
  - Password: `IntegrationPass123!`
- Use this OAuth guide only if you explicitly need to test OAuth behavior.

## Important notes first

- `OAUTH_GOOGLE_CLIENT_ID` is okay to share.
- `OAUTH_GOOGLE_CLIENT_SECRET` is sensitive and must stay out of git.
- `localhost:4222` is **NATS messaging**, not OAuth. Do **not** use it in Google OAuth config.

## 1) Create/select a Google Cloud project

1. Open Google Cloud Console: `https://console.cloud.google.com/`
2. In the top project picker, choose an existing project or click **New Project**.

## 2) Configure OAuth consent screen

Google UI may show either **Google Auth Platform** or **APIs & Services**.

### If you see Google Auth Platform

1. Open **Google Auth Platform → Branding**.
2. Fill required fields (App name, support email, developer contact).
3. Save.
4. Open **Audience**:
   - Choose **External** for local/dev usage.
   - Add your Google account under **Test users**.
5. Save.

### If you see APIs & Services

1. Open **APIs & Services → OAuth consent screen**.
2. User type: choose **External**.
3. Fill required app info and contact email.
4. Add your Google account under **Test users**.
5. Save.

## 3) Create OAuth client credentials

1. Open **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Name: e.g. `ripplemark-local`.

## 4) Enter exact local URLs in Google Console

In that same OAuth client form, add:

### Authorized JavaScript origins

- `http://localhost:4200`

### Authorized redirect URIs

- `http://localhost:4200/api/auth/oauth/google/callback`

Optional (only if you call gateway callback directly):

- `http://localhost:3000/auth/oauth/google/callback`

Then click **Create**. Copy the generated **Client ID** and **Client Secret**.

## 5) Configure Ripplemark local env

From repo root:

```bash
cd infra/docker
cp .env.example .env
```

Edit `.env` and set:

```dotenv
OAUTH_GOOGLE_CLIENT_ID=<your-client-id-from-google>
OAUTH_GOOGLE_CLIENT_SECRET=<your-client-secret-from-google>
OAUTH_GOOGLE_CALLBACK_URL=http://localhost:4200/api/auth/oauth/google/callback
WEB_APP_URL=http://localhost:4200
```

## 6) Start the stack

```bash
cd infra/docker
docker compose -f docker-compose.yml up --build
```

Open `http://localhost:4200` and start Google login.

## 7) Verify the OAuth flow

Success indicators:

- Browser is redirected to Google login.
- After consent, browser returns to Ripplemark callback route.
- Auth gateway logs show successful callback handling.

Common error mapping:

- `redirect_uri_mismatch`:
  - Your `OAUTH_GOOGLE_CALLBACK_URL` must exactly match one entry in **Authorized redirect URIs**.
- `origin_mismatch`:
  - Add `http://localhost:4200` to **Authorized JavaScript origins**.
- `access_blocked` / app not verified:
  - Add your account as a **Test user** in OAuth consent screen.

## 8) Keep secrets safe

- Never commit real client secrets to `.env.example`.
- Keep real values only in local `.env` (gitignored).
- If exposed, rotate/revoke secret immediately in Google Cloud Console.