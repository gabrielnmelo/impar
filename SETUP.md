# Ímpar — admin / CMS setup

This is a one-time setup. Once done, every push to `main` redeploys the site
and the `/admin` area automatically.

You'll need:
- A terminal with the repo checked out locally.
- Node.js installed.
- Logged in to the same Cloudflare account that owns the `impar` Worker.

## 1. Install dependencies

```sh
npm install
```

## 2. Authenticate Wrangler

```sh
npx wrangler login
```

(If you've used Wrangler before on this machine you can skip this.)

## 3. Create the D1 database

```sh
npx wrangler d1 create impar-cms
```

This prints something like:

```
[[d1_databases]]
binding = "DB"
database_name = "impar-cms"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy that `database_id` value and paste it into `wrangler.jsonc`, replacing
`REPLACE_WITH_D1_ID`.

## 4. Create the R2 bucket for images

```sh
npx wrangler r2 bucket create impar-images
```

## 5. Run migrations (creates the `posts` table + seeds the 6 existing cards)

```sh
npx wrangler d1 migrations apply impar-cms --remote
```

## 6. Set up Cloudflare Access (this is your "password" gate)

In the Cloudflare dashboard:

1. Go to **Zero Trust** → **Settings** → **General** and note your **Team
   domain** (e.g. `yourname.cloudflareaccess.com`). If you don't have one
   yet, the wizard will ask you to create a team name — pick something
   short.
2. Go to **Zero Trust** → **Access** → **Applications** → **Add an
   application** → **Self-hosted**.
3. Fill in:
   - **Application name:** `Ímpar Admin`
   - **Session duration:** `24 hours` (whatever you like)
   - **Application domain:** add **two** rows:
     - `impar.pages.dev` with path `/admin*`
     - `impar.pages.dev` with path `/api/*`
     - (also add your custom domain rows if you have one)
4. **Identity providers:** check **One-time PIN** (email magic-link login).
   Optionally add Google.
5. **Policies → Add a policy:**
   - Name: `Allowed admins`
   - Action: `Allow`
   - Include: **Emails** → list every person who should be able to log in
     (your email, partners, etc.). You can come back and add more later.
6. Save the application.
7. On the application's details page, copy the **Application Audience
   (AUD) tag** (a long hex string).

Now paste the team domain and the AUD into `wrangler.jsonc`:

```jsonc
"vars": {
  "CF_ACCESS_TEAM_DOMAIN": "yourname.cloudflareaccess.com",
  "CF_ACCESS_AUD": "the-long-hex-aud-tag"
}
```

## 7. Deploy

```sh
npx wrangler deploy
```

That's it. Visit `https://impar.pages.dev/admin` — Cloudflare Access will
intercept, ask for your email, send a magic-link code, and once you're in
you'll land on the post list.

To add more editors later: Zero Trust → Access → Applications → Ímpar
Admin → Policies → edit `Allowed admins` → add emails. They get access on
their next login. No code changes needed.

## Local development

```sh
npm run dev
```

This runs Wrangler locally with a local D1. Note: Cloudflare Access can't
gate `wrangler dev`, so locally the `/admin` and `/api/*` routes will
return 401 unless you also set `CF_ACCESS_TEAM_DOMAIN` and
`CF_ACCESS_AUD` to empty/dummy values during local testing — or just do
your testing against a preview deploy.

## Adding new editors

Cloudflare dashboard → **Zero Trust** → **Access** → **Applications** →
**Ímpar Admin** → **Policies** → edit `Allowed admins` → add their email.
They'll get a magic-link the next time they hit `/admin`.

## Schema changes

Add a new file under `migrations/` named `0003_something.sql`, then:

```sh
npx wrangler d1 migrations apply impar-cms --remote
```
