# Lehulu (ለሁሉ) — Role-Based Access Control (RBAC) Specification

## 1. Role Definitions

Lehulu implements strict server-side authorization partitioned into exactly three distinct roles:

| Role | Identifier | Description | Provisioning Mechanism |
|---|---|---|---|
| **Customer** | `CUSTOMER` | Individual or business seeking local services, requesting quotes, managing active jobs, and rating providers. | Default role assigned upon completing customer onboarding ("Find Services"). |
| **Service Provider** | `SERVICE_PROVIDER` | Professional trade specialist (plumber, electrician, etc.) offering services, sending quotes, and completing jobs. | Assigned upon completing provider onboarding ("Offer Services"). Initial status is unverified until Admin audits credentials. |
| **Administrator** | `ADMIN` | Platform operator verifying provider identity, curating categories, resolving disputes, and auditing actions. | Strictly assigned via server environment (`ADMIN_EMAIL`) or database seed. Zero client-side self-escalation allowed. |

---

## 2. Comprehensive Permissions Matrix

| Domain | Action / Resource | CUSTOMER | SERVICE_PROVIDER | ADMIN |
|---|---|:---:|:---:|:---:|
| **Authentication & Identity** | Authenticate via Google Identity Services | Yes | Yes | Yes |
| | Select initial role on onboarding | Yes | Yes | No (pre-assigned) |
| | Update personal profile (phone, city, language) | Yes | Yes | Yes |
| | Self-escalate role in payload (`role: ADMIN`) | **BLOCKED (403)** | **BLOCKED (403)** | N/A |
| **Discovery & Providers** | Browse & search verified providers | Yes | Yes | Yes |
| | View public specialist profile (`/providers/:id`) | Yes | Yes | Yes |
| | View private customer residence address | Assigned Booking Only | Assigned Booking Only | Dispute Audit Only |
| | Inspect unverified provider credentials | No | Own Profile Only | Yes |
| **Verification Pipeline** | Submit National ID & Trade Licenses | No | Yes | No |
| | View Admin Verification Queue (`PENDING_REVIEW`) | No | No | Yes |
| | Approve provider verification (`VERIFIED`) | No | No | Yes |
| | Reject provider verification (`REJECTED`) | No | No | Yes |
| | Revoke previously verified provider from Verified tab | No | No | Yes |
| **The 6-Step Booking Lifecycle** | Create new service booking (Step 1: `REQUESTED`) | Yes | No | No |
| | Issue formal itemized quotation in ETB (Step 2: `QUOTED`) | No | Assigned Provider | No |
| | Accept / decline quotation (Step 3: `CONFIRMED`) | Yes | No | No |
| | Start work on-site (Step 4: `IN_PROGRESS`) | No | Assigned Provider | No |
| | Mark job complete for inspection (Step 5: `COMPLETION_PENDING`) | No | Assigned Provider | No |
| | Confirm final completion (Step 6: `COMPLETED`) | Yes | No | Override in Dispute |
| | Submit review & auto-complete booking (Step 6: `COMPLETED`) | Yes | No | No |
| | Earn "Ready for Another Service" blue badge | No | Automatically on Step 6 | No |
| **In-App Communication** | Join booking chat room (`booking:<id>`) | Booking Participant | Booking Participant | Dispute Audit |
| | Send real-time messages & attachments | Booking Participant | Booking Participant | Dispute Audit |
| **Reviews & Ratings** | Submit 1–5 star rating & comment (1 per booking) | Completed Booking Only | No | No |
| | Post provider professional response to review | No | Assigned Provider | No |
| | Moderate or report inappropriate reviews | Yes (Report) | Yes (Report) | Yes (Remove) |
| **Platform Administration** | Create, edit, deactivate service categories | No | No | Yes |
| | Invalidate in-memory category cache on change | Automatic | Automatic | Automatic |
| | View platform statistics & completed transactions count | No | No | Yes |
| | Inspect immutable administrative audit logs | No | No | Yes |

---

## 3. Server-Side Security & Enforcement Rules

1. **Role Escalation Protection**: An attempt to send `{ role: 'ADMIN' }` in profile update payloads is rejected with HTTP 403 Forbidden.
2. **Provider Verification Integrity**: The `isVerified` flag on `ProviderProfile` is strictly immutable to the provider; only administrators can transition `verificationStatus` (`PENDING_REVIEW` -> `VERIFIED` / `REJECTED` / `NEEDS_RECHECK` / `SUSPENDED`).
3. **Booking Tenancy Protection**: Endpoints `/api/v1/bookings/:id` inspect whether `req.user._id` matches `booking.customerId` or `booking.providerId`. Non-participants receive HTTP 403 Forbidden.
4. **Messaging Isolation**: Socket.IO connection requires session authentication. Joining room `booking:<id>` executes an ownership check verifying caller identity against booking participant records.
5. **Review Eligibility Constraint**: Reviews require an existing booking with `status === 'COMPLETED'` and `customerId === req.user._id`. A unique database index on `{ bookingId: 1 }` strictly enforces that exactly one review can exist per booking.
6. **Self-Healing Administrative Consistency**: Synchronization between `ProviderProfile` and `ProviderVerification` executes in bulk set operations without quadratic loops, guaranteeing zero orphaned profiles.
