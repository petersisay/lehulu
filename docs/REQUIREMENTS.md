# Lehulu (ለሁሉ) — Functional & Non-Functional Requirements Specification

## 1. System Scope & Objectives
Lehulu is an online marketplace bridging Ethiopian households and businesses with verified local service professionals.
Initial launch geography: **Adama** and **Bishoftu**, with extensibility for **Addis Ababa** and nationwide coverage.

## 2. Strict Role Definitions
The platform supports exactly three roles:
1. `CUSTOMER`: Discovers providers, requests quotes, books services, tracks status, chats, completes bookings, submits honest reviews.
2. `SERVICE_PROVIDER`: Submits identity/credentials for verification, sets coverage area (Adama, Bishoftu), manages offerings & pricing, issues quotations, executes jobs, marks completion pending.
3. `ADMIN`: Audits provider verification submissions, approves/rejects/suspends providers, manages categories, investigates disputes, inspects immutable audit logs.

## 3. Functional Requirements

### 3.1 Authentication & Onboarding
- **FR-AUTH-1**: Google Identity Services token verification on backend via Google's official public key signature verification.
- **FR-AUTH-2**: Secure HttpOnly, SameSite cookie session management with protection against session fixation.
- **FR-AUTH-3**: New user onboarding role prompt: "Find Services" (Customer) or "Offer Services" (Service Provider).
- **FR-AUTH-4**: Provider selection initiates onboarding workflow requiring identity verification submission (National ID / Kebele ID, license/certificate, photo).
- **FR-AUTH-5**: Administrator access strictly restricted to server-side provisioning (matching `ADMIN_EMAIL` or explicit database grant); no client-side role escalation.

### 3.2 Service Discovery & Geolocation
- **FR-DISC-1**: Search providers by trade category, provider name, city (Adama, Bishoftu), or GPS coordinates.
- **FR-DISC-2**: Interactive Leaflet / OpenStreetMap view showing verified providers with public business locations or service coverage radii.
- **FR-DISC-3**: Privacy enforcement: Never publish private customer residential addresses or provider home addresses; display service areas only.
- **FR-DISC-4**: Transparent multi-factor ranking based on verified status, proximity, rating, and availability. No fabricated reviews or inflated ratings.

### 3.3 Quotations & Booking State Machine
- **FR-BOOK-1**: Customer requests service with date/time, description, private address, optional images.
- **FR-BOOK-2**: Valid booking status transitions:
  `REQUESTED` -> `QUOTED` (or `CONFIRMED` if fixed price accepted) -> `IN_PROGRESS` -> `COMPLETION_PENDING` -> `COMPLETED` (or `CANCELLED`, `DISPUTED`).
- **FR-BOOK-3**: Quotation revisions with customer confirmation before quote becomes binding price in Ethiopian Birr (ETB).
- **FR-BOOK-4**: Dual-confirmation completion workflow: Provider marks job as `COMPLETION_PENDING`, Customer confirms satisfaction to reach `COMPLETED`.

### 3.4 Messaging & Real-Time Notifications
- **FR-COMM-1**: Secure in-app messaging restricted strictly to the customer and assigned provider for that active booking.
- **FR-COMM-2**: Real-time event notifications via Socket.io with fallback to REST polling.
- **FR-COMM-3**: Persistent notification inbox with unread counts and read-state synchronization.

### 3.5 Reviews & Moderation
- **FR-REV-1**: Only customers with verified `COMPLETED` bookings can review that provider. Exactly 1 review per completed booking.
- **FR-REV-2**: Customer rating (1 to 5 stars) + textual review; provider can submit a single professional response.
- **FR-REV-3**: Dispute and report mechanism for abusive content, fraud, or service failure.

### 3.6 Administration & Verification
- **FR-ADM-1**: Provider verification queue with side-by-side inspection of submitted credentials, photos, and ID documents.
- **FR-ADM-2**: Status actions: `VERIFIED`, `REJECTED`, `NEEDS_RECHECK`, `SUSPENDED`.
- **FR-ADM-3**: Category management (CRUD for trade categories and subcategories).
- **FR-ADM-4**: Immutable audit log of administrative decisions (approvals, bans, disputes).

## 4. Non-Functional Requirements
- **NFR-SEC-1**: Helmet security headers, CORS allowlist, rate-limiting on sensitive endpoints.
- **NFR-SEC-2**: Input sanitization and Zod schema validation across all write APIs.
- **NFR-I18N-1**: Full English and Amharic (አማርኛ) localization across all user-facing interfaces.
- **NFR-PERF-1**: Fast load times, responsive layouts for desktop, tablet, and mobile browsers.
