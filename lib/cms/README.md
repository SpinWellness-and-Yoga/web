# CMS implementation status

This directory contains shared types, server helpers, and database logic for the website CMS.

## Implemented components

- `types.ts` defines data structures for posts, events, media, and site content.
- `validation.ts` validates form inputs and schemas with Zod.
- `http.ts` validates origins, bounds body sizes, and sanitizes API error output.
- `client.ts` initializes public and privileged Supabase database clients.
- `auth.ts` verifies session cookies and checks active editor database records.
- `media.ts` validates image format, byte size, dimensions, and storage rollback.
- `public.ts` fetches published journal posts and managed content.
- `operations.ts` provides database write transactions and rate limits.

## Database schema

The migration script is at `web/database/migrations/20261001_website_cms.sql`.

It configures:
- `website_editors` table with row level security.
- `blog_posts` table with status checks and public read policies.
- `website_content` table with JSON schema and size validation.
- `website_media` table tracking private R2 objects.
- `website_audit` table recording editor actions.
- `website_rate_limits` table tracking request frequencies.
- `cms_save` stored procedure for atomic versioned content updates.
- `cms_register_event` stored procedure for atomic registration and capacity checks.
- `cms_add_media` stored procedure for media record creation.
- `cms_rate_limit` stored procedure for request rate limiting.

## Verification

The following local checks passed on 1 October 2026:
- TypeScript type check (`npm run type-check`).
- ESLint verification (`npm run lint`).
- Unit and integration tests (`npm run test`).
- Playwright administrative browser workflow tests (`node tests/admin-browser.cjs`).
- Terraform configuration validation for website media bucket.
- Worker configuration generator tests (`test_configure_worker.py`).
- Production application build (`npm run build`).

Local tests do not apply remote changes. Live database migration, remote bucket creation, and worker deployment require owner approval.


## Location compatibility

Event locations can use text or JSONB database columns. A plain string is one location, including commas in addresses. Multiple locations use a JSON array of strings. Registration checks ignore non-string array entries. Application and database tests cover both column types.
