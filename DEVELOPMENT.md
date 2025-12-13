# development setup

## running the application

### for D1 database access (required for events & waitlist)

```bash
npm run dev:cf
```

this runs `wrangler dev` which provides access to D1 database.

**important:** regular `npm run dev` (next dev) does NOT have D1 database access.

### accessing the app

when running with `npm run dev:cf`, the app will be available at:
- http://localhost:8788

### local D1 database

the local D1 database is stored in `.wrangler/state/v3/d1/`

to set up events in local database:

```bash
# create tables
wrangler d1 execute spinwellness_web --local --file=scripts/setup-events-d1.sql

# insert events
wrangler d1 execute spinwellness_web --local --file=scripts/insert-events-d1.sql

# verify
wrangler d1 execute spinwellness_web --local --command="SELECT * FROM events"
```

## troubleshooting

### events not loading?

1. make sure you're running `npm run dev:cf` not `npm run dev`
2. check server logs for `[events-storage]` messages
3. verify database has events: `wrangler d1 execute spinwellness_web --local --command="SELECT COUNT(*) FROM events"`
4. check browser console for API errors

### database not found?

- make sure you've run the setup scripts with `--local` flag
- check `.wrangler/state/v3/d1/` directory exists
- try running setup scripts again

