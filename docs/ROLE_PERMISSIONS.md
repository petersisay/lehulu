# Lehulu (ለሁሉ) — Role-Based Access Control (RBAC) Specification

## 1. Role Definitions

Lehulu implements strict server-side authorization partitioned into exactly three roles:

| Role | Identifier | Description | Provisioning Mechanism |
|---|---|---|---|
| **Customer** | `CUSTOMER` | Standard user searching for local services, booking appointments, and reviewing providers. | Default role upon initial registration if "Find Services" is selected. |
| **Service Provider** | `SERVICE_PROVIDER` | Professional providing trades (electrician, plumber, etc.). | Assigned when a user completes provider onboarding. Verification badge requires Admin approval. |
| **Administrator** | `ADMIN` | Platform operator verifying providers, managing categories, resolving disputes, auditing logs. | Strictly assigned via server environment (`ADMIN_EMAIL`) or root database provisioning. Users cannot self-escalate. |

---

## 2. Granular Permissions Matrix

| Domain | Action / Resource | CUSTOMER | SERVICE_PROVIDER | ADMIN |
|---|---|:---:|:---:|:---:|
| **Authentication** | Sign in with Google | Yes | Yes | Yes |
| | Select initial role on onboarding | Yes | Yes | No (pre-set) |
| | Update personal profile (phone, bio, photo) | Yes | Yes | Yes |
| **Discovery** | Search & filter providers | Yes | Yes | Yes |
| | View public provider profile | Yes | Yes | Yes |
| | View private customer address | Assigned Booking Only | Assigned Booking Only | Investigation Only |
| **Provider Mgmt** | Submit verification application | No | Yes | No |
| | Upload credentials & trade licenses | No | Yes | No |
| | Audit & approve/reject verification | No | No | Yes |
| | Configure service area & rates | No | Yes | No |
| **Bookings** | Create service booking request | Yes | No | No |
| | Accept / decline booking request | No | Yes | No |
| | Issue price quotation | No | Yes | No |
| | Accept / reject price quotation | Yes | No | No |
| | Cancel booking (pre-confirmed) | Yes | Yes | Yes (override) |
| | Mark booking as `COMPLETION_PENDING` | No | Yes | No |
| | Mark booking as `COMPLETED` | Yes (Dual Confirm) | Yes (Dual Confirm) | Dispute Resolution |
| **Messaging** | Send message in booking room | Room Participant | Room Participant | Dispute Investigation |
| **Reviews** | Submit review (Completed bookings only) | Yes | No | No |
| | Respond to customer review | No | Yes | No |
| | Moderate / remove abusive reviews | No | No | Yes |
| **Admin Operations** | Manage service categories (CRUD) | No | No | Yes |
| | Inspect audit logs & metrics | No | No | Yes |
| | Resolve customer/provider disputes | No | No | Yes |

---

## 3. Server-Side Enforcement Rules

1. **Role Escalation Protection**: An attempt to send `{ role: 'ADMIN' }` in profile update payloads is rejected with HTTP 403 Forbidden.
2. **Provider Verification Integrity**: The `isVerified` flag on `ProviderProfile` is strictly immutable to the provider; only administrators can transition `verificationStatus` (`PENDING_REVIEW` -> `VERIFIED` / `REJECTED` / `NEEDS_RECHECK` / `SUSPENDED`).
3. **Booking Tenancy Protection**: Endpoints `/api/v1/bookings/:id` inspect whether `req.user._id` matches `booking.customerId` or `booking.providerId`. Non-participants receive HTTP 403.
4. **Messaging Isolation**: Socket.IO connection requires session authentication. Joining room `booking:<id>` executes an ownership check.
5. **Review Eligibility**: Reviews require an existing booking with `status === 'COMPLETED'` and `customerId === req.user._id`, with a unique database index on `{ bookingId: 1 }` preventing multiple reviews for the same transaction.
