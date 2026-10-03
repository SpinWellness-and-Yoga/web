# Spinwellness website deployment runbook

This document describes verified checks, deployment requirements, and operator procedures for the website CMS.

## Verified local checks

The following checks passed locally:

1. TypeScript validation:
   `npm run type-check` (zero errors).
2. Linter validation:
   `npm run lint` (zero errors).
3. Automated test suite:
   `npm run test` (18 passing tests covering authentication, database migration, concurrency, rate limits, event capacity, location validation, media checks, and storage rollback).
4. Administrative browser verification:
   `node tests/admin-browser.cjs` (verified desktop and 360-pixel mobile layouts, form field accessibility, version conflicts, modal interactions, and session gates).
5. Terraform infrastructure validation:
   `TF_CLI_CONFIG_FILE=/dev/null terraform -chdir=infrastructure/providers/cloudflare/website-media validate` (configuration is valid).
6. Worker configuration generator tests:
   `python3 -m unittest discover -s infrastructure/providers/cloudflare/website-media -p 'test_*.py'` (5 tests passing).
7. Production application build:
   `NEXT_DIST_DIR=.next-build npm run build` (successful compilation and asset generation for all 27 routes).

## External dependencies and unverified paths

No remote modifications were executed. The following items require remote execution after owner approval:

- Cloudflare R2 bucket creation through Terraform.
- Supabase SQL migration execution (`20261001_website_cms.sql`).
- Initial editor identity setup in Supabase Auth and `website_editors`.
- OpenNext worker deployment with the generated `CMS_MEDIA` R2 binding.

## Required resources and configuration

### Environment variables

Set the following runtime variables on the website Worker:

- `NEXT_PUBLIC_SUPABASE_URL`: The Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public anonymous key for public queries.
- `SUPABASE_SERVICE_ROLE_KEY`: The privileged service key for administrative authentication and rate limiting.
- `CMS_SITE_URL`: The canonical public website origin (for example, `https://spinwellness.org`).
- `CMS_MEDIA`: The private Cloudflare R2 bucket binding.

Do not expose the service role key in client bundles or public repositories.

## Deployment procedure

### Step 1: Apply database migration

1. Request owner approval to execute the migration.
2. In the Supabase SQL editor or CLI, run `web/database/migrations/20261001_website_cms.sql`.
3. Confirm that tables, indexes, row level security policies, and stored procedures exist.

### Step 2: Configure initial website editor

1. Create a user identity in Supabase Auth for the authorized editor email.
2. Insert a record into `public.website_editors`:
   ```sql
   insert into public.website_editors (user_id, active)
   values ('<user-uuid-from-auth.users>', true);
   ```

### Step 3: Provision Cloudflare R2 storage

1. Request owner approval for the Terraform plan.
2. Navigate to `infrastructure/providers/cloudflare/website-media`.
3. Supply required variables: `account_id` and `environment`.
4. Run `terraform plan` and inspect the plan output.
5. Run `terraform apply` after approval.
6. Retrieve the created bucket name:
   ```sh
   terraform output -raw bucket_name
   ```

### Step 4: Generate Worker deployment configuration

Run the configuration generator from the repository root:

```sh
python3 infrastructure/providers/cloudflare/website-media/configure_worker.py \
  --source web/wrangler.template.json \
  --bucket-name "<bucket-name-from-step-3>" \
  --output web/wrangler.cms.json
```

### Step 5: Deploy website application

1. Request owner approval for deployment.
2. Build the Cloudflare Worker target:
   ```sh
   cd web
   npm run build:cf
   ```
3. Deploy the application with the generated configuration:
   ```sh
   npx wrangler deploy --config wrangler.cms.json
   ```

## Rollback procedure

1. Redeploy the previous verified worker package if application errors occur.
2. Do not destroy the R2 bucket or drop CMS tables during an application rollback. Preserving storage protects authored content and event registrations.

## Reproducible Worker configuration

The tracked `web/wrangler.template.json` provides the existing website Worker settings without secrets.
Confirm its Worker name, account, routes, and D1 binding before an approved deployment.
Use the generator to add the bucket name from Terraform output.
The generated configuration sets `keep_vars` to preserve runtime variables set outside this file.
Keep privileged values in Worker secrets.
Do not add secrets to either configuration file.

`web/open-next.config.ts` defines the Cloudflare build target.
CMS reads use dynamic routes, so this configuration does not add a separate incremental cache bucket.
`next dev` initializes Cloudflare context from `web/wrangler.local.json`.
Its `CMS_MEDIA` binding uses local R2 simulation with `remote: false`.
Local uploads do not reach a Cloudflare bucket.
Use the generated deployment configuration for production, never the local simulation configuration.
