# Developer handoff

## Product data

Sample data currently lives in `src/data/products.ts`. A production developer should replace it with typed records from the chosen commerce backend or marketplace API.

## Product images

The `ProductPlaceholder` component deliberately marks every image location. Replace it with `next/image` and add an `image` field to the Product type. Preserve the 4:5 container and provide useful alternative text.

## Required production integrations

- Seller accounts, product submission and moderation
- Inventory and price source of truth
- Stripe Connect or another marketplace payment system
- Order records, shipping and tax calculation
- Authentication, rate limiting and audit logs
- Image storage and transformation
- Transactional email and customer support flows

Never trust totals, prices, seller IDs or inventory sent from the browser. Recalculate and validate them on the server before creating payment sessions.

## Architecture

The catalog and product routes are server-rendered. Cart state is isolated in a small client provider and persisted locally for prototype testing. The boundary makes replacing local cart storage with server-side sessions straightforward.
