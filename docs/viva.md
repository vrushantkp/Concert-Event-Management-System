# Encore viva and live demonstration

## Demo sequence

1. Open Encore and show the public landing page, event discovery and filters. Search for Neon Atlas.
2. Open After the Signal. Select any available seats and explain the state legend. Sign in as the seeded customer.
3. Request two adjacent seats under ₹6,000 and read the score and explanation. Select one result and hold the seats. Refresh the reservation page to show that expiry persists.
4. Confirm the booking. Open the QR verification link and My Encore. Find the reference in Booking history.
5. Query the actual affected rows in PostgreSQL. Use a real reference from the page.
   ```sql
   SELECT id,event_id,customer_id,status,expires_at FROM encore.booking WHERE id='<uuid>';
   SELECT * FROM encore.booking_seat WHERE booking_id='<uuid>';
   SELECT * FROM encore.audit_log WHERE booking_id='<uuid>' ORDER BY id;
   ```
6. As the migration account, temporarily change an event title. Reload the event page, show the new title, and restore the original.
7. In My Encore, create, edit and delete event preferences. Query the matching document in MongoDB after each operation.
   ```javascript
   use encore
   db.preferences.findOne({userId:3})
   ```
   Look up the seeded account ID before the MongoDB query. Change its budget in MongoDB and reload My Encore.
8. Sign in as organizer. Open an event and edit its title or price. Confirm that the public listing updates. Discuss how existing booking line prices stay fixed.
9. Sign in as administrator. Show user access, venue layouts, platform booking activity, and the DBMS Explorer. Execute the JOIN, nested, correlated, recursive, CTE and trigger audit examples.
10. Open the Explorer with a customer session or request its API and show denial. Run `npm test` to show PostgreSQL RLS and the simultaneous seat hold test.

## Questions and answers

**Why use two databases?** Bookings require constraints across events, venues and seats, plus atomic reservation changes. PostgreSQL provides this. Preferences contain optional fields and arrays that evolve separately, so MongoDB stores one document per customer.

**Where is the entity relationship diagram?** The project includes `public/erd.png` and `docs/schema.md`. In the application, an administrator opens DBMS Explorer.

**How does the schema avoid duplication?** Venue, section, seat, artist, category and event have separate relations. Ticket categories hold the current price. Booking lines copy the price when the seats are held, so past booking totals stay meaningful after a price change. Inventory includes venue keys to enforce same-venue relationships.

**What is the booking key?** The booking primary key is a random UUID. The inventory primary key is the event ID and physical seat ID. Composite foreign keys preserve event identity on the booking lines and current owner of an inventory row.

**How do two requests for the same seat behave?** Both try to lock the inventory row. One acquires the lock first and sets its booking reference. After the first commits, the second checks availability again and rejects the whole request. Multi-seat locks are acquired by ascending seat ID.

**What happens when a hold expires?** Inventory treats the expired hold as reclaimable. Confirmation checks the timestamp and refuses the expired booking. The expiry procedure changes held rows to expired for reconciliation and appends audit activity through the trigger.

**What is the difference between a function, procedure and trigger here?** SELECT calls functions to compute availability, occupancy and totals. CALL invokes procedures that write bookings. The audit trigger fires automatically on insertion or status change.

**How does a recursive query run?** It starts at categories with no parent and repeatedly joins their children. The query carries a path to prevent repeating any category in that traversal.

**What is a correlated query?** Its inner query refers to a row from the outer query. The Explorer counts confirmed bookings for each outer event. A nested query without such a reference can select IDs of venues in a city first.

**Why use a LEFT JOIN?** Revenue summaries keep events with no bookings and display a zero. An INNER JOIN returns only matching pairs. A CTE names an intermediate result such as confirmed totals by event.

**How is a ticket verified?** The QR contains a reference URL. A narrow PostgreSQL function checks that the matching booking is confirmed and the event remains published. The verification response reveals event and state, without customer data.

**What separates authentication and authorization?** Password verification establishes a session. The backend chooses route access and an SQL role from that session. PostgreSQL grants determine which operations are possible, and row policies limit which bookings or organizer events the role can access.

**How are seats recommended?** The server reads current seat availability, enumerates contiguous groups within each section and row, filters by total budget and accessibility, and ranks the remaining groups by cost, section match and distance from the stage. A later hold still needs database verification.
