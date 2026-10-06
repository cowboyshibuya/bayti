# Shelby

This is a [Next.js](https://nextjs.org) App Router project backed by Convex.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Cloudflare Workers preview with vinext

This project keeps the standard Next.js scripts and adds a parallel
Cloudflare Workers path powered by [vinext](https://vinext.io/).

```bash
bun install
bun run check:cf
bun run build:cf
bun run deploy:cf
```

The Cloudflare scripts are:

- `bun run dev:cf` - run the vinext development server.
- `bun run build:cf` - build the app with vinext.
- `bun run preview:cf` - run the vinext production server locally.
- `bun run deploy:cf` - build and upload a preview Worker version with Wrangler.
- `bun run check:cf` - scan for vinext compatibility issues.

Required frontend environment variables:

```bash
NEXT_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<deployment>.convex.site
```

Stella's `OPENROUTER_API_KEY` is read by Convex actions. Keep it configured in
the Convex deployment environment, not as a Cloudflare Worker secret.

Before testing auth on a Cloudflare preview or production URL, update the Convex
auth site URL for that environment so cookies and redirects match the Worker
origin. For the current Convex setup, this means setting the Convex `SITE_URL`
environment variable to the Cloudflare URL and redeploying Convex functions.

Use `wrangler login` for local deploys, or set `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` in your shell for non-interactive deploys.

## Cloudflare production builds

In the `bayti` Worker's **Settings → Build**, configure:

- Build command: `bun run build:cf:ci`
- Deploy command: `bun run deploy:cf:production`
- Production branch: `main`

In **Build variables and secrets**, set `CONVEX_DEPLOY_KEY` as a secret using
a production deploy key from the Convex `bayti` project, production deployment
`vivid-wildebeest-480`. The key must start with `prod:vivid-wildebeest-480|`.
Worker runtime secrets are separate from build secrets; adding the key only
to the Worker's runtime settings does not make it available to the build.

`build:cf:ci` rejects development, preview, and other deployment keys before
deploying. It invokes the installed Convex CLI with explicit arguments and
builds with vinext, which produces the Cloudflare Worker output. Convex injects
the canonical `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` for
production; the child build validates both before bundling. The deploy command
uploads the resulting Worker without rebuilding it outside those variables.

Verified deployment URLs:

```text
Production: https://vivid-wildebeest-480.eu-west-1.convex.cloud
Development: https://chatty-husky-389.eu-west-1.convex.cloud
```

Keep Convex Auth's `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, and action secrets
configured on the production Convex deployment. Production's `SITE_URL` should
match the public app origin (`https://bayti.cowboyshibuya.workers.dev`).

Native Next.js output lives in `build/next`; vinext keeps its route types in
`.next` and Cloudflare output in `dist`. These separate directories prevent the
two build workflows from overwriting each other's generated route types.

TypeScript stays on 6.0 and ESLint on 9.39 because the current ESLint TypeScript
parser and React plugin do not support TypeScript 7 and ESLint 10 respectively.
Node type definitions track Node 22, the Cloudflare build runtime.
