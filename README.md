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
- `bun run deploy:cf` - deploy a preview Worker with `vinext deploy --preview`.
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
