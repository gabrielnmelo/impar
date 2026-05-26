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

## 6. Set the admin password

```sh
npx wrangler secret put CMS_PASSWORD
```

Wrangler will prompt you to type the password (it won't echo). Use something
strong — this is the only credential protecting `/admin`. Share it with
anyone who needs access to the CMS.

To change the password later, just run the same command again and redeploy.

## 7. Deploy

```sh
npx wrangler deploy
```

Visit `https://impar.workers.dev/admin` — you'll see a login screen. Enter
the password you set above and you're in.

## Local development

```sh
npm run dev
```

For local dev, create a `.dev.vars` file in the repo root:

```
CMS_PASSWORD=any-local-test-password
```

This file is gitignored — never commit it.

## Adding new editors

Share the `CMS_PASSWORD` with them. Their session lasts until they close
the browser tab. To revoke access, run `npx wrangler secret put CMS_PASSWORD`
with a new password and `npx wrangler deploy` — all existing sessions are
immediately invalidated.

## Schema changes

Add a new file under `migrations/` named `0003_something.sql`, then:

```sh
npx wrangler d1 migrations apply impar-cms --remote
```
