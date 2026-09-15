# Project context for a new chat

Copy this file into a new ChatGPT conversation or ask the next developer to read it first.

## Goal

Build FORM as a one-page-first general marketplace catalog deployed on Vercel through GitHub. The owner is not a programmer and needs plain-language instructions. A professional developer will later connect the production backend.

## Confirmed decisions

- `FORM` is a temporary brand name.
- Visual direction: clinical monochrome and highly minimal.
- Inspiration: the sparse catalog rhythm of Yeezy ecommerce, but not an exact copy.
- FORM is not a fashion-only brand. Sellers may list any kind of product.
- Product images must be isolated product cutouts with transparent backgrounds.
- Do not generate, source or add images. The owner already has product pictures.
- No mannequins, lifestyle scenes, image backgrounds or decorative hero assets.
- Initial scope is commerce-ready UI, not a working payment marketplace.

## Implemented

- Next.js 16 App Router, React 19 and TypeScript
- Home catalog and Men/Women category routes
- Static product detail routes with size selection
- Local persistent cart with add, remove and clear behavior
- Responsive catalog and product layouts
- Metadata and custom FORM favicon
- GitHub Actions quality workflow
- Style guide, production handoff notes and beginner README
- Placeholder image areas sized for the owner's transparent cutouts

## Verification

`npm run check` passes: lint, TypeScript and production build. Core routes return expected content.

## Important files

- `src/data/products.ts`: temporary sample catalog
- `src/components/product-placeholder.tsx`: replace with `next/image` after images are supplied
- `src/app/globals.css`: design tokens and layouts
- `docs/STYLE_GUIDE.md`: brand and image rules
- `docs/HANDOFF.md`: backend and security handoff

## Next steps

1. Replace FORM with the final brand name.
2. Add the owner's transparent product images.
3. Replace sample products with the real catalog.
4. Create a GitHub repository and push this project.
5. Import the GitHub repository into Vercel.
6. Have the production developer choose authentication, seller onboarding, storage, moderation and marketplace payments.

## Guardrails

Do not represent the current checkout button as a live payment flow. Do not add marketplace backend choices without confirming requirements. Do not commit secrets. Validate price, inventory, ownership and payment data on the server in production.
