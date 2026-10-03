# Website administration

The administration UI uses the `/api/admin` handlers. Each page requires a verified session before it renders.
The API also enforces access for each request. The interface does not provide a public preview mode.

## Workflows

- Sign in with an email code.
- Create, edit, preview, publish, unpublish, and archive posts.
- Search posts and events across server records.
- Edit event dates, capacity, visibility, description, and image.
- Edit homepage, services, team, FAQs, and contact details.
- Select or upload images in the media dialog.
- Move website content items into the required order.

Editors submit the saved version with each update. A conflict preserves local input and offers a reload.
Save controls report success only after the API returns confirmed data.
Unsaved changes trigger prompts for links, section changes, sign-out, and page unload.
Browser history navigation remains dependent on the Next.js router.

The media library uses server pagination. Uploads use multipart requests with an image and an image description.
The server validates image bytes and stores accepted images in R2. The UI does not hold storage credentials.

The post editor uses plain text. Its toolbar inserts section, list, quotation, and paragraph text.
Both preview and public rendering must keep text escaped. The editor does not accept HTML.

## Verification

Run `npx tsx --test app/admin/_components/request.test.ts` for the request boundary tests.
Run `npx eslint app/admin` for the administration lint check.
Run `npx tsc --noEmit --incremental false` for the application type check.

Local checks do not verify production credentials, migrations, email delivery, R2 bindings, or live publication.
The waitlist page does not request or display personal records because no waitlist administration service exists.
