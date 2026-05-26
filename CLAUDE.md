# Ímpar — project notes for Claude

## Stack
- Cloudflare Worker (`src/worker.js`) — API + asset serving
- D1 database (`impar-cms`) — posts table
- R2 bucket (`impar-images`) — cover images
- Static assets in `public/` served via Workers Assets binding
- Admin CMS at `/admin/` (password protected via `CMS_PASSWORD` Worker secret)

## IMPORTANT: when implementing a new design from Claude Design

When the user brings a new `Impar.html` from Claude Design and it replaces
`public/index.html`, always make sure the following script tag is present
just before `</body>`:

```html
<script src="/cms-content.js"></script>
```

This tag loads the CMS content script that fetches published posts from
`/api/posts` and replaces the static placeholder articles in `.content-grid`
with real ones linked to `/article.html?id=<id>`. Without it, the Conteúdo
section shows static placeholder cards that don't link anywhere.

## Deployment workflow
1. Develop on branch `claude/relaxed-turing-xM8t6`
2. Fast-forward merge to `main`
3. User runs `npx wrangler deploy` locally to ship

## Other CMS integration points to preserve across design updates
- `public/cms-content.js` — do not delete; auto-fetches posts for the homepage
- `public/article.html` — article reader page; links come from cms-content.js
- `public/admin/` — admin CMS UI; never touched by design updates
