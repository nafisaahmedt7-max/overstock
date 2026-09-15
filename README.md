# FORM marketplace storefront

An original clinical monochrome marketplace catalog built with Next.js, React and TypeScript. It includes category routes, product detail pages, size selection, a persistent prototype cart, responsive layouts and semantic markup.

## Start locally

1. Install Node.js 20 or newer.
2. Open this folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

## Quality commands

- `npm run lint` checks code quality.
- `npm run typecheck` checks TypeScript.
- `npm run build` creates the production build.

## Project map

- `src/app` — routes and global styles
- `src/components` — reusable storefront behavior
- `src/data` — temporary typed product catalog
- `docs/STYLE_GUIDE.md` — visual and image rules
- `docs/HANDOFF.md` — production integration notes

## Deployment

Push the repository to GitHub. In Vercel choose **Add New → Project**, import the repository and keep the detected Next.js defaults. Every pull request receives a preview deployment and pushes to `main` update production.

FORM is a working placeholder name. Search for `FORM` to rename it consistently once the final brand name is chosen.
