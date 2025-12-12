# events database setup for D1

## setup steps

### 1. create tables

```bash
wrangler d1 execute spinwellness_web --file=scripts/setup-events-d1.sql
```

### 2. insert events

```bash
wrangler d1 execute spinwellness_web --file=scripts/insert-events-d1.sql
```

### 3. verify

```bash
wrangler d1 execute spinwellness_web --command="SELECT * FROM events"
```

## local development

for local development, you can also run:

```bash
wrangler d1 execute spinwellness_web --local --file=scripts/setup-events-d1.sql
wrangler d1 execute spinwellness_web --local --file=scripts/insert-events-d1.sql
```

## notes

- events are stored in the same D1 database as waitlist
- database binding is `DATABASE` (configured in wrangler.toml)
- events API routes are at `/api/events` and `/api/events/[id]`
- pages automatically fetch from D1 via API routes

