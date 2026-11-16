# Lehulu (ለሁሉ) — REST API Documentation

Base URL: `/api/v1`  
All successful responses return JSON with `{ success: true, ... }`. Errors return `{ success: false, message: string, ... }`.  
Authenticated requests require the `lehulu_session` HttpOnly cookie or `Authorization: Bearer <token>` header.

---

## 1. Authentication & Session (`/api/v1/auth`)

### 1.1 Google Sign-In & Verification
- **Endpoint**: `POST /api/v1/auth/google`
- **Auth**: Public
- **Description**: Verifies Google ID token, provisions/matches user account, sets HttpOnly session cookie.
- **Request Body**:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "role": "CUSTOMER"
}
```
- **Response** (`200 OK` or `201 Created`):
```json
{
  "success": true,
  "user": {
    "_id": "64f9b8c2e...",
    "email": "user@example.com",
    "displayName": "Abebe Kebede",
    "role": "CUSTOMER",
    "isOnboarded": true
  }
}
```

### 1.2 Complete Onboarding
- **Endpoint**: `POST /api/v1/auth/onboarding` (alias: `/onboard`)
- **Auth**: Authenticated (`CUSTOMER` or `SERVICE_PROVIDER`)
- **Request Body**:
```json
{
  "role": "CUSTOMER",
  "city": "Adama",
  "phoneNumber": "+251911223344",
  "preferredLanguage": "am"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "user": {
    "_id": "64f9b8c2e...",
    "email": "user@example.com",
    "displayName": "Abebe Kebede",
    "role": "CUSTOMER",
    "city": "Adama",
    "phoneNumber": "+251911223344",
    "preferredLanguage": "am",
    "isOnboarded": true
  }
}
```

### 1.3 Current User Session
- **Endpoint**: `GET /api/v1/auth/me`
- **Auth**: Optional (returns `authenticated: false` if not logged in)
- **Response** (`200 OK`):
```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "_id": "64f9b8c2e...",
    "email": "user@example.com",
    "displayName": "Abebe Kebede",
    "role": "CUSTOMER"
  }
}
```

### 1.4 Logout
- **Endpoint**: `POST /api/v1/auth/logout`
- **Auth**: Public
- **Description**: Clears `lehulu_session` cookie.
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 2. User Profile & Notifications (`/api/v1/users`)

### 2.1 Update Profile
- **Endpoint**: `PUT /api/v1/users/profile`
- **Auth**: Authenticated
- **Request Body**:
```json
{
  "displayName": "Abebe Kebede",
  "phoneNumber": "+251911223344",
  "city": "Bishoftu",
  "preferredLanguage": "en"
}
```

### 2.2 Notifications
- `GET /api/v1/users/notifications`: Retrieve user's notifications.
- `PATCH /api/v1/users/notifications/read-all`: Mark all notifications as read.
- `PATCH /api/v1/users/notifications/:id/read`: Mark single notification as read.

---

## 3. Service Categories Catalog (`/api/v1/categories`)

### 3.1 List Categories (Cached)
- **Endpoint**: `GET /api/v1/categories`
- **Auth**: Public
- **Performance**: In-memory cached with 5-minute TTL. Returns `X-Cache: HIT` (<1ms) or `X-Cache: MISS`.
- **Response** (`200 OK`):
```json
{
  "success": true,
  "categories": [
    {
      "_id": "65...",
      "nameEn": "Plumbing",
      "nameAm": "የቧንቧ ሥራ",
      "slug": "plumbing",
      "icon": "Wrench",
      "displayOrder": 1,
      "subcategories": [
        { "nameEn": "Pipe Repair", "nameAm": "የቧንቧ ጥገና", "slug": "pipe-repair" }
      ]
    }
  ]
}
```

### 3.2 Category Administration (`ADMIN` role only)
- `POST /api/v1/categories`: Create category (triggers instant cache invalidation).
- `PUT /api/v1/categories/:id`: Update category (triggers instant cache invalidation).
- `DELETE /api/v1/categories/:id`: Delete category (triggers instant cache invalidation).

---

## 4. Provider Discovery & Profiles (`/api/v1/providers`)

### 4.1 Search & Discover Verified Specialists
- **Endpoint**: `GET /api/v1/providers`
- **Auth**: Public
- **Query Parameters**:
  - `city` (string): `Adama`, `Bishoftu`, `Addis Ababa`
  - `categoryId` (string): Category ObjectId
  - `search` (string): Text query across trade and name
  - `page` (number): Default `1`
  - `limit` (number): Default `12`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "providers": [
    {
      "_id": "66...",
      "businessName": "Adama Pro Plumbing",
      "bioEn": "Certified master plumber with 8+ years experience.",
      "rating": 4.9,
      "reviewCount": 38,
      "completedBookingsCount": 42,
      "isVerified": true,
      "serviceCities": ["Adama", "Bishoftu"]
    }
  ],
  "total": 14
}
```

### 4.2 Public Provider Profile
- **Endpoint**: `GET /api/v1/providers/:id`
- **Auth**: Public
- **Description**: Returns detailed trade profile, portfolio images, pricing model, working hours, and reviews.

### 4.3 Provider Profile Management (`SERVICE_PROVIDER` role)
- `GET /api/v1/providers/me/profile`: Retrieve own provider profile.
- `PUT /api/v1/providers/me/profile`: Update business bio, skills, service cities, and working hours.
- `POST /api/v1/providers/me/verification`: Submit National ID number, trade licenses, and certificates for admin audit.

---

## 5. The 6-Step Booking Lifecycle (`/api/v1/bookings`)

### 5.1 Step 1: Customer Requests Service
- **Endpoint**: `POST /api/v1/bookings`
- **Auth**: Requires `CUSTOMER` role
- **Request Body**:
```json
{
  "providerId": "66...",
  "categoryId": "65...",
  "requestedDate": "2026-11-20T09:00:00.000Z",
  "requestedTimeSlot": "09:00 - 12:00",
  "problemDescription": "Kitchen sink main line pipe leaking under the counter.",
  "serviceAddress": {
    "city": "Adama",
    "subcityOrKebele": "Kebele 04",
    "specificLocation": "Near Posta Bet, House #412"
  },
  "referenceImages": []
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "booking": {
    "_id": "67...",
    "bookingNumber": "BK-2026-9814",
    "status": "REQUESTED"
  }
}
```

### 5.2 Step 4: Provider Starts Work
- **Endpoint**: `POST /api/v1/bookings/:id/start-work`
- **Auth**: Requires assigned `SERVICE_PROVIDER`
- **Transition**: `CONFIRMED` $\rightarrow$ `IN_PROGRESS`
- **Broadcast**: Emits `booking:updated` to customer via WebSocket.

### 5.3 Step 5: Provider Requests Completion
- **Endpoint**: `POST /api/v1/bookings/:id/request-completion`
- **Auth**: Requires assigned `SERVICE_PROVIDER`
- **Transition**: `IN_PROGRESS` $\rightarrow$ `COMPLETION_PENDING`
- **Broadcast**: Emits `booking:updated` to customer via WebSocket.

### 5.4 Step 6: Customer Confirms Completion
- **Endpoint**: `POST /api/v1/bookings/:id/confirm-completion`
- **Auth**: Requires booking `CUSTOMER`
- **Transition**: `COMPLETION_PENDING` $\rightarrow$ `COMPLETED`
- **Side Effects**: Atomically increments provider `completedBookingsCount`, awards blue indicator badge, updates platform metrics.

---

## 6. Quotation Workflow (`/api/v1/quotes`)

### 6.1 Step 2: Provider Submits Quotation
- **Endpoint**: `POST /api/v1/quotes`
- **Auth**: Requires assigned `SERVICE_PROVIDER`
- **Request Body**:
```json
{
  "bookingId": "67...",
  "laborCost": 500,
  "materialCost": 250,
  "inspectionFee": 0,
  "items": [
    { "description": "Valve replacement labor", "quantity": 1, "unitPrice": 500, "total": 500 },
    { "description": "High-pressure brass ball valve", "quantity": 1, "unitPrice": 250, "total": 250 }
  ],
  "notes": "Estimated 2 hours completion time.",
  "validDays": 7
}
```

### 6.2 Step 3: Customer Accepts Quotation
- **Endpoint**: `POST /api/v1/quotes/:quoteId/accept`
- **Auth**: Requires booking `CUSTOMER`
- **Description**: Sets quote status to `ACCEPTED` and transitions booking to `CONFIRMED`.

### 6.3 Customer Declines Quotation
- **Endpoint**: `POST /api/v1/quotes/:quoteId/reject`
- **Auth**: Requires booking `CUSTOMER`

---

## 7. In-App Messaging (`/api/v1/messages`)

### 7.1 Get Booking Message History
- **Endpoint**: `GET /api/v1/messages/:bookingId`
- **Auth**: Authenticated (Customer or Provider of that booking)

### 7.2 Send Message
- **Endpoint**: `POST /api/v1/messages/:bookingId`
- **Auth**: Authenticated (Customer or Provider of that booking)
- **Request Body**:
```json
{
  "content": "Hello, I am arriving at your gate now."
}
```

---

## 8. Reviews & Ratings (`/api/v1/reviews`)

### 8.1 Submit Review (Auto-Completes Step 6)
- **Endpoint**: `POST /api/v1/reviews/:bookingId`
- **Auth**: Requires booking `CUSTOMER`
- **Request Body**:
```json
{
  "bookingId": "67...",
  "rating": 5,
  "comment": "Prompt arrival, excellent workmanship, fixed the valve cleanly!"
}
```
- **Description**: Creates verified review. If booking is currently `COMPLETION_PENDING`, automatically advances it to `COMPLETED`.

### 8.2 Public Provider Reviews
- **Endpoint**: `GET /api/v1/reviews/provider/:providerId`
- **Auth**: Public

---

## 9. Administrator Operations (`/api/v1/admin`)
*(All endpoints strictly require `ADMIN` role)*

### 9.1 Verification Queue & Directory
- `GET /api/v1/admin/verifications`: Returns pending verifications with masked IDs and credential links.
  - Query: `status=PENDING_REVIEW` or `status=VERIFIED`
- `PATCH /api/v1/admin/verifications/:id`: Approve (`status: VERIFIED`) or reject/revoke (`status: REJECTED`) a specialist with reason and admin notes. Records immutable audit log.

### 9.2 Platform Analytics
- `GET /api/v1/admin/stats`: Platform metrics including total users, verified specialists, active bookings, completed transactions, and dispute counters.

### 9.3 Immutable Audit Logs
- `GET /api/v1/admin/audit-logs`: Returns paginated audit trail of all administrative interventions, approvals, and revocations.

---

## 10. Practical JavaScript Workflow Examples

### 10.1 Complete 6-Step Lifecycle with JavaScript `fetch`

```javascript
// Step 1: Customer submits booking
const createRes = await fetch('/api/v1/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    providerId: '66abc...',
    categoryId: '65xyz...',
    requestedDate: '2026-11-20T09:00:00Z',
    requestedTimeSlot: '09:00 - 12:00',
    problemDescription: 'Leaking pipe under kitchen sink.',
    serviceAddress: { city: 'Adama', subcityOrKebele: 'Kebele 04', specificLocation: 'House 412' }
  })
});
const { booking } = await createRes.json();

// Step 2: Provider submits quotation
await fetch('/api/v1/quotes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bookingId: booking._id,
    laborCost: 500,
    materialCost: 200,
    items: [{ description: 'Pipe fitting', quantity: 1, unitPrice: 200, total: 200 }]
  })
});

// Step 3: Customer accepts quotation
await fetch(`/api/v1/quotes/${quoteId}/accept`, { method: 'POST' });

// Step 4: Provider starts work on-site
await fetch(`/api/v1/bookings/${booking._id}/start-work`, { method: 'POST' });

// Step 5: Provider requests completion inspection
await fetch(`/api/v1/bookings/${booking._id}/request-completion`, { method: 'POST' });

// Step 6: Customer confirms completion and rates service
await fetch(`/api/v1/reviews/${booking._id}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rating: 5,
    comment: 'Work completed quickly and professionally!'
  })
});
```
