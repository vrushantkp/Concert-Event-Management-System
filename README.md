# Encore

Concert & Live Event Management and Intelligent Seat Reservation System

PES University DBMS Level 3 · VRUSHANT K P · PES1UG24CS542 · Section I

Encore is a local concert ticketing application. Customers browse shows, compare seats, request contiguous seat recommendations and book digital tickets. Organizers manage their events and view occupancy and booking value. Administrators manage event and venue data, account access and the DBMS Explorer.


For a walkthrough, open the [study guide](docs/Encore_Study_Notes.html) in your browser.

## Requirements

- Node.js 22 or later and npm
- Docker and Docker Compose, or PostgreSQL 18 and MongoDB 8 installed locally
- Microsoft Edge or another Playwright-supported Chromium browser for browser checks

## Start the demo

Open PowerShell in this directory. Set three different local passwords of at least 12 characters before running setup. Use letters and numbers in passwords for these commands or URL encode reserved characters in database connection URLs.

```powershell
Copy-Item .env.example .env.local
notepad .env.local
npm ci
docker compose --env-file .env.local up -d
npm run db:setup
npm run dev -- --webpack --hostname 127.0.0.1
```

Use [http://127.0.0.1:3000](http://127.0.0.1:3000) and keep `APP_ORIGIN` at that exact origin. In `.env.local` set `POSTGRES_PASSWORD` and put the same password in `MIGRATION_DATABASE_URL`. Set a different password in `DATABASE_URL` for `encore_runtime`. The migration script creates this role with the runtime password and grants only the roles and routines used by the application. The Compose ports are bound to loopback. The MongoDB container is intended for a local demonstration. Use an authenticated MongoDB deployment and HTTPS for any shared environment.

If using installed databases, create an empty PostgreSQL database called `encore` with `createdb`, update the two PostgreSQL URLs and the MongoDB URI, and omit the Compose command. The setup command applies versioned PostgreSQL SQL files and seed data, then creates the unique MongoDB preferences index. Subsequent setup runs skip applied migrations. The setup account needs permission to create database roles. The app uses only the runtime URL.

Sign in with the password configured as `DEMO_PASSWORD` at first setup.

| Account | Email |
|---|---|
| Customer | customer@encore.test |
| Organizer | organizer@encore.test |
| Administrator | admin@encore.test |

For a new customer, choose **Create a customer account** from the sign-in page.


## Architecture

Next.js App Router and TypeScript serve pages and JSON route handlers. Zod validates inputs. The server verifies opaque sessions stored in PostgreSQL and uses a transaction-scoped database role and identity. PostgreSQL records the definitive inventory and booking state. MongoDB stores preferences independently. Tailwind CSS and project styles define the layout, Lucide provides the brand icon, and the QR code opens a booking verification page. Payments are represented by a clearly labelled demo confirmation.

```text
app/                     App Router pages and JSON API
  account/               Customer dashboard, history and tickets
  api/[action]/          Validated route handlers
  events/                Discovery and interactive seating
  sign-in/               Registration and login
  ticket/[reference]/   Public limited ticket verification
  workspace/             Staff controls and DBMS Explorer
components/              Interactive forms, seat map and dashboards
lib/                     Auth, PostgreSQL, MongoDB and domain queries
db/                      Migrations, seed, SQL and MongoDB demos
scripts/                 Setup, integration tests and browser demo
docs/                    Schema, rubric, viva and screenshots
public/                  Event photographs and ER diagram
```

### API operations

| Method and path | Access | Purpose |
|---|---|---|
| POST /api/register, /api/login, /api/logout | Public | Account and session lifecycle |
| GET /api/inventory?eventId= | Public | Published event seat states and current prices |
| POST /api/recommend, /api/reserve, /api/confirm, /api/cancel | Customer | Recommendations, hold and booking changes |
| GET /api/preferences | Customer | Read own MongoDB document |
| POST /api/preferences, /api/delete-preferences | Customer | Save or delete own document |
| POST /api/save-event, /api/view-event | Customer | Saved shows and history |
| POST /api/event, /api/artist | Organizer or admin | Manage catalog and seed inventory |
| POST /api/user, /api/venue, /api/section, /api/seat | Admin | Manage accounts and venues |
| POST /api/demo, /api/mongo-demo | Admin | Execute predefined database examples |

PostgreSQL routines acquire inventory locks in seat-ID order. A hold is written only if all selected seats are available. One inventory row per event and physical seat holds at most one current booking reference. A hold stops blocking inventory after five minutes. The administrator can materialize expired holds using the Explorer procedure. Confirmation checks that the hold is current and retains the inventory references. The audit trigger records transitions. See [schema](docs/schema.md) for keys and [viva notes](docs/viva.md) for the demonstration.

## Verify

```powershell
npm run typecheck
npm run lint
npm run build -- --webpack
npm test
npm start -- --hostname 127.0.0.1
```

In a second terminal, with the same `.env.local` and the server running:

```powershell
node --env-file=.env.local scripts/browser-demo.mjs
```

Use a disposable setup for integration and browser scripts. The integration suite inserts and cleans up dedicated fixtures. The browser demo uses the seeded customer, confirms and then cancels its demonstration booking, and restores the original MongoDB preferences. It leaves a saved show and the booking audit trail. Use `BROWSER_CHANNEL=chrome` in the environment to select Chrome. Screenshots appear under `docs/screenshots`.

## Scope

This is a local university demo. Staff configure independent Standard and Front Row prices. Customer booking history retains cancelled bookings. PostgreSQL access assumes a trusted backend with a restricted database account. Deployment hardening such as shared authentication rate limiting, email verification, monitoring and backups is outside the verified demo.

## Photograph sources

- [Red-lit concert crowd, Ahmed Samy, Unsplash](https://unsplash.com/photos/a-crowd-of-people-in-a-dark-room-with-red-lights-rdD1NdpC-fs)
- [Outdoor live audience, Unsplash](https://images.unsplash.com/photo-1501386761578-eac5c94b800a)
- [Microphone photograph, Unsplash](https://images.unsplash.com/photo-1516280440614-37939bbacd81)
- [Purple stage concert photo, Spencer Davis, Unsplash](https://unsplash.com/photos/man-in-black-and-white-shirt-playing-guitar-on-stage-yg0CWjdgWlo), used as illustrative artwork for the PES demo show.
