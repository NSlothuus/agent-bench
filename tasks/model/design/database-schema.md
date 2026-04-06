# Task: Database Schema Design — Booking System

## Category: design
## Difficulty: Hard
## Binary Check: binary_check_schema_design

## Prompt

Design the database schema for a booking platform (think Calendly meets ClassPass). The platform allows service providers (gyms, salons, clinics) to list their services, set availability, and accept bookings from customers.

Requirements:
1. **Providers** have multiple locations, each location has multiple services
2. **Services** have a duration (30min, 60min, etc), price, and capacity (1 for haircuts, 20 for yoga class)
3. **Availability** is recurring (e.g., "Monday 9am-5pm") with the ability to add exceptions (holidays, sick days)
4. **Bookings** can be for a specific time slot. Double-booking must be prevented at the database level.
5. **Customers** can book, cancel (up to 24h before), and reschedule
6. **Payments** are captured at booking time, refunded on cancellation
7. **Waitlist** for full group classes
8. **Multi-timezone** — providers and customers may be in different timezones

Provide:
1. Table definitions with columns and types
2. Key constraints and indexes
3. How you prevent double-booking
4. How you handle recurring availability + exceptions
5. Any tradeoffs or decisions you'd discuss with the team

Use PostgreSQL. Focus on correctness over completeness — it's fine to note "would also need X" without fully designing it.

## Grading Key (HIDDEN)

### Core Tables (must include):
1. **providers** table (+0.5): id, name, timezone, etc
2. **locations** table (+0.5): provider_id FK, address, timezone
3. **services** table (+0.5): location_id FK, name, duration_minutes, price, capacity
4. **availability_schedules** table (+1): Recurring rules (day_of_week, start_time, end_time) linked to location or service
5. **availability_exceptions** table (+0.5): Date-specific overrides (closures, modified hours)
6. **bookings** table (+1): customer_id, service_id, start_time, end_time, status, payment references
7. **customers** table (+0.5): name, email, timezone
8. **payments** table (+0.5): booking_id, amount, status, refund info

### Double-Booking Prevention (+2):
- **Database-level constraint** (+1): Uses EXCLUDE constraint with tsrange/tstzrange, or unique index on (service_id, time_slot), or serializable transaction isolation
- **Capacity-aware** (+0.5): For group classes (capacity > 1), counts existing bookings before allowing new ones
- **Race condition handling** (+0.5): Mentions SELECT FOR UPDATE, advisory locks, or EXCLUDE constraint — not just application-level checks

### Timezone Handling (+1):
- Stores times in UTC or TIMESTAMPTZ (+0.5)
- Availability rules reference provider's local timezone (+0.5)

### Recurring Availability (+1):
- Separates the schedule rules from specific available slots (+0.5)
- Has a strategy for resolving rules + exceptions into concrete availability (+0.5)

### Extras:
- Waitlist table or mechanism (+0.5)
- Cancellation/reschedule handling in schema (+0.5)
- Indexes justified (not random) (+0.5)
- Booking status enum (confirmed, cancelled, completed, no-show) (+0.25)
- Mentions generated time slots vs on-the-fly calculation tradeoff (+0.25)

### Red flags:
- No double-booking prevention at DB level: -2
- Times stored as naive timestamps (no timezone): -1
- Over-normalized (10+ junction tables for a v1): -0.5
- Under-normalized (everything in one table): -1
