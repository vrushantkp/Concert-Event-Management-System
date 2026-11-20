# Evaluation rubric and evidence

Source: PES University, *DBMS Level 3 MiniProject Evaluation Criteria*, August–December 2026, p. 1. Maximum values are copied from the rubric. Completion is an implementation assessment and does not assign marks.

| # | Official component | Max. | Completion | Evidence |
|---|---|---:|---|---|
| 1 | ER diagram | 2 | Completed | `public/erd.png`, displayed in DBMS Explorer |
| 2 | Relational schema with keys, relationships and constraints | 3 | Completed | `db/001_schema.sql`, `docs/schema.md`, constraint integration test |
| 3 | SQL implementation and DDL with constraints | 4 | Completed | Versioned PostgreSQL migrations and the executed database setup |
| 4 | NoSQL or vector database creation | 4 | Completed | MongoDB preferences collection and unique `userId` index |
| 5 | Technology justification | 1 | Completed | Report section 4 and README architecture |
| 6 | DML operations | 4 | Completed | Explorer DML lifecycle and persisted booking/preference operations |
| 7 | Nested, correlated, recursive and JOIN queries | 4 | Completed | `db/demo.mjs` queries executed against PostgreSQL |
| 8 | Procedure, function, trigger and CTE | 6 | Completed | Reserve and confirm routines, expiry, totals, occupancy, audit trigger and revenue CTE |
| 9 | NoSQL or vector feature and retrieve, update, delete | 7 | Completed | Customer preference editor, MongoDB CRUD and aggregation demos, browser readback |
| 10 | Next.js interface | 3 | Completed | Public, customer, organizer and admin screens captured in browser |
| 11 | Backend API and database integration | 2 | Completed | Tested UI-to-database writes and direct database-to-UI refresh |
| 12 | Authentication, minimum two roles and database access control | 4 | Completed | Three roles, hashed passwords, opaque sessions, GRANT and PostgreSQL RLS |
| 13 | Documentation, Git or GitHub | 2 | Completed | README, schema, viva, report, lockfile, and local Git repository |
| 14 | Originality, individual contribution, modification and viva | 4 | Partially Completed | Project-specific workflow and runnable demonstrations prepared. Team members must confirm individual contributions and present the viva. |
| | Total rubric maximum | **50** | | |

## Requirement mapping

| Requirement | Implementation and verification |
|---|---|
| Public catalog, filtering and event details | `app/page.tsx`, `app/events`, `lib/catalog.ts`. Browser searches by artist and opens the live event and inventory. |
| Customer dashboard and preferences | `app/account`, `event_activity` in PostgreSQL, `preferences` in MongoDB. Browser saves a show, writes preferences, reloads a database-side edit and deletes the document. |
| Inventory, recommendation and booking | Seat map, `lib/recommend.ts`, inventory routines and booking tables. Browser selects a recommendation, holds and confirms, then opens the QR verification. PostgreSQL integration tests verify row locks, isolation and expiry. |
| Staff dashboards and authorization | `app/workspace`, protected API actions, SQL grants and RLS. Browser verifies the organizational and admin screens and rejects customer access to the Explorer API. |
| Technical demonstrations | Explorer runs predefined SQL and MongoDB operations and shows actual returned rows. Integration suite tests audit, procedures, functions and permissions. |
| Deployment distinction | Local production build and local database execution verified. No cloud deployment or GitHub publication. |
