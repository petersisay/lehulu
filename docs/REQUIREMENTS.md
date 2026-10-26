# Lehulu (ለሁሉ) — Functional & Non-Functional Requirements Specification

## 1. System Scope & Objectives

Lehulu is a production-grade online marketplace connecting Ethiopian households and enterprises with vetted, trustworthy local service professionals.
- **Initial Launch Geography**: **Adama** and **Bishoftu**.
- **Expansion Architecture**: Scalable to **Addis Ababa** and nationwide regional capitals.
- **Primary Value Proposition**: Eliminating informal uncertainty through verified credentials, transparent itemized quotations in ETB, a strictly enforced 6-step job lifecycle, real-time messaging, and verifiable reviews.

---

## 2. Strict Role Definitions

The system supports exactly three mutually exclusive roles:
1. `CUSTOMER`: Discovers providers, requests quotations, manages active bookings through the 6-step lifecycle, chats securely, confirms completion, and submits reviews.
2. `SERVICE_PROVIDER`: Submits credentials for Admin verification, manages service radius and working hours, issues formal quotations in ETB, executes jobs through Step 4 and Step 5, and earns a "Job Completed • Ready for Another Service" blue badge.
3. `ADMIN`: Audits provider verification submissions, approves/rejects/revokes providers, manages service categories, investigates disputes, and monitors platform health via immutable audit logs.

---

## 3. Functional Requirements

### 3.1 Authentication & Onboarding
- **FR-AUTH-1**: Google Identity Services token verification on the backend using Google's official public key certificates (`google-auth-library`).
- **FR-AUTH-2**: Secure session management using `HttpOnly`, `SameSite=Lax/Strict`, `Secure` (in production) cookies.
- **FR-AUTH-3**: New user role selection: "Find Services" (Customer) or "Offer Services" (Service Provider).
- **FR-AUTH-4**: Provider onboarding requires National ID / Kebele ID submission, optional trade licenses/certificates, and portfolio photos.
- **FR-AUTH-5**: Administrator access strictly restricted to server-side provisioning matching `ADMIN_EMAIL`. Client-side role escalation attempts receive HTTP 403 Forbidden.

### 3.2 Service Discovery & Geolocation
- **FR-DISC-1**: Search providers by trade category, provider name, city (Adama, Bishoftu), or GPS coordinates.
- **FR-DISC-2**: Interactive Leaflet / OpenStreetMap view showing verified providers with public business locations or service coverage radii.
- **FR-DISC-3**: Privacy enforcement: Customer residential addresses and provider personal residences are never exposed publicly.
- **FR-DISC-4**: Only providers with `isVerified === true` and `verificationStatus === 'VERIFIED'` appear in customer search results.

### 3.3 The 6-Step Booking State Machine
- **FR-BOOK-1 (Step 1 - REQUESTED)**: Customer initiates request with problem description, requested date/time slot, private service address, and optional reference photos.
- **FR-BOOK-2 (Step 2 - QUOTED)**: Assigned provider submits an itemized quotation in Ethiopian Birr (ETB) detailing labor, materials, and inspection fees.
- **FR-BOOK-3 (Step 3 - CONFIRMED)**: Customer accepts quotation, locking the binding price in ETB.
- **FR-BOOK-4 (Step 4 - IN_PROGRESS)**: Provider arrives on-site and clicks "Start Work". Both dashboards update state in real-time.
- **FR-BOOK-5 (Step 5 - COMPLETION_PENDING)**: Provider completes work and clicks "Mark Completion Pending" for customer inspection.
- **FR-BOOK-6 (Step 6 - COMPLETED)**: Customer confirms satisfaction OR submits a review, transitioning booking to `COMPLETED`. Provider's `completedBookingsCount` increments, platform completed transaction metric increments, and provider receives a blue "Job Completed • Ready for Another Service" badge.

### 3.4 In-App Messaging & Real-Time Synchronization
- **FR-COMM-1**: Secure in-app messaging strictly restricted to the customer and assigned provider for that active booking.
- **FR-COMM-2**: Real-time event notifications via Socket.IO for chat messages and booking status transitions.
- **FR-COMM-3**: Automatic fallback REST synchronization polling when WebSocket disconnects or is unavailable.

### 3.5 Reviews & Completed Transactions
- **FR-REV-1**: Only customers with verified bookings reaching Step 6 can submit a review. Exactly 1 review permitted per booking.
- **FR-REV-2**: Customer rating (1 to 5 stars) + textual review; provider can submit a single professional response.
- **FR-REV-3**: Review submission on `/api/v1/reviews/:bookingId` automatically transitions a booking in `COMPLETION_PENDING` to `COMPLETED`.

### 3.6 Administration & Verification Queue
- **FR-ADM-1**: Provider verification queue with side-by-side inspection of submitted credentials, photos, and masked national ID.
- **FR-ADM-2**: Status actions: `VERIFIED`, `REJECTED`, `NEEDS_RECHECK`, `SUSPENDED`.
- **FR-ADM-3**: Dedicated **Verified Providers** tab allowing admins to inspect live customer profiles (`/providers/:id`) or immediately revoke/reject verification with audit logging.
- **FR-ADM-4**: Service Category CRUD management with instant in-memory cache invalidation.
- **FR-ADM-5**: Immutable audit log recording all administrative actions with timestamp, actor email, action type, and target entity.

---

## 4. Non-Functional Requirements

### 4.1 Security & Compliance
- **NFR-SEC-1**: Helmet security headers, dynamic CORS allowlist, and rate limiting (500 req/15m with real-time polling exemption).
- **NFR-SEC-2**: Strict Zod schema validation on all request bodies, route parameters, and query strings.
- **NFR-SEC-3**: Passwordless, credential-safe architecture leveraging Google Identity Services.

### 4.2 Performance & Responsiveness
- **NFR-PERF-1**: Category catalog endpoint responds in `<1ms` via in-memory caching with `X-Cache: HIT`.
- **NFR-PERF-2**: Admin verification queue loads in single-digit milliseconds via bulk $O(1)$ set synchronization.
- **NFR-PERF-3**: Database queries for discovery, bookings, and reviews backed by compound and geospatial `2dsphere` indexes.
- **NFR-PERF-4**: Frontend bundle code-split into vendor chunks with lazyRetry recovery against stale production hashes.

### 4.3 Internationalization & Localization
- **NFR-I18N-1**: Complete bilingual localization in English (`en`) and Amharic (`am`).
- **NFR-I18N-2**: Ethiopian Birr (ETB / ብር) currency formatting across all quotation, billing, and review interfaces.
