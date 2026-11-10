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
  "user": { ... }
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
  "user": { ... }
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

### 2.3 Saved Providers (Bookmarks)
- `GET /api/v1/users/saved-providers`: List bookmarked providers.
- `POST /api/v1/users/saved-providers/:providerId`: Toggle bookmark on/off.

---

## 3. Service Categories Catalog (`/api/v1/categories`)

### 3.1 Get Active Categories (Cached `<1ms`)
- **Endpoint**: `GET /api/v1/categories`
- **Auth**: Public
- **Headers**: `X-Cache: HIT` or `X-Cache: MISS`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "categories": [
    {
      "_id": "67...",
      "nameEn": "Plumbing",
      "nameAm": "የቧንቧ ስራ",
      "slug": "plumbing",
      "icon": "Wrench",
      "displayOrder": 1,
      "subcategories": [ ... ]
    }
  ]
}
```

### 3.2 Get Category by Slug
- **Endpoint**: `GET /api/v1/categories/:slug`
- **Auth**: Public

### 3.3 Admin Category Management
- `GET /api/v1/categories/admin/all`: List all categories including inactive. (Requires `ADMIN`)
- `POST /api/v1/categories`: Create category. (Requires `ADMIN`)
- `PUT /api/v1/categories/:id`: Update category. (Requires `ADMIN`)
- `DELETE /api/v1/categories/:id`: Soft delete/deactivate category. (Requires `ADMIN`)
*(All mutations automatically invalidate the in-memory cache)*

---

## 4. Provider Discovery & Profiles (`/api/v1/providers`)

### 4.1 Search Providers
- **Endpoint**: `GET /api/v1/providers`
- **Auth**: Public
- **Query Parameters**:
  - `q`: Free-text search (name, trade, bio).
  - `category`: Category slug.
  - `city`: City filter (e.g., `Adama`, `Bishoftu`).
  - `sort`: `rating` or `experience`.
  - `page`: Page number (default: 1).
  - `limit`: Items per page (default: 12).
- **Response** (`200 OK`):
```json
{
  "success": true,
  "providers": [
    {
      "_id": "67...",
      "businessName": "Bole Electrical Pro",
      "rating": 4.9,
      "reviewCount": 14,
      "completedBookingsCount": 18,
      "isVerified": true,
      "serviceCities": ["Adama"]
    }
  ],
  "pagination": { "page": 1, "totalPages": 1, "total": 1 }
}
```

### 4.2 Get Public Provider Profile
- **Endpoint**: `GET /api/v1/providers/:id`
- **Auth**: Public
- **Description**: Returns provider business info, services, rating, portfolio, and reviews. Private residence and national ID are stripped.

### 4.3 Provider Self-Management
- `GET /api/v1/providers/me`: Fetch own provider profile. (Requires `SERVICE_PROVIDER`)
- `PUT /api/v1/providers/me`: Update bio, pricing, working hours, portfolio. (Requires `SERVICE_PROVIDER`)
- `POST /api/v1/providers/verify`: Submit National ID and trade documents. (Requires `SERVICE_PROVIDER`)

---

## 5. The 6-Step Booking Lifecycle (`/api/v1/bookings`)

### 5.1 Step 1: Create Booking Request
- **Endpoint**: `POST /api/v1/bookings`
- **Auth**: Requires `CUSTOMER`
- **Request Body**:
```json
{
  "providerId": "67...",
  "categoryId": "67...",
  "requestedDate": "2026-10-30",
  "requestedTimeSlot": "09:00 - 12:00",
  "problemDescription": "Main water supply valve leaking under kitchen sink.",
  "referenceImages": ["https://..."],
  "serviceAddress": {
    "city": "Adama",
    "subcityOrKebele": "Kebele 04",
    "specificLocation": "Near Geda Hall, House 420"
  }
}
```
- **Response** (`201 Created`): Returns booking in `REQUESTED` state.

### 5.2 List Bookings
- `GET /api/v1/bookings`: Auto-dispatches customer or provider bookings based on authenticated user role.
- `GET /api/v1/bookings/customer`: Customer's booking history. (Requires `CUSTOMER`)
- `GET /api/v1/bookings/provider`: Provider's assigned jobs. (Requires `SERVICE_PROVIDER`)
- `GET /api/v1/bookings/:id`: Retrieve booking detail with quotation, status history, and messages.

### 5.3 Step 4: Start Work (`IN_PROGRESS`)
- **Endpoint**: `PATCH /api/v1/bookings/:id/status` (or `PUT / :id/status`)
- **Auth**: Requires assigned `SERVICE_PROVIDER`
- **Request Body**:
```json
{
  "status": "IN_PROGRESS"
}
```

### 5.4 Step 5: Request Completion (`COMPLETION_PENDING`)
- **Endpoint**: `POST /api/v1/bookings/:id/request-completion` (or status patch)
- **Auth**: Requires assigned `SERVICE_PROVIDER`
- **Description**: Marks work complete for customer inspection.

### 5.5 Step 6: Confirm Completion (`COMPLETED`)
- **Endpoint**: `POST /api/v1/bookings/:id/confirm-completion`
- **Auth**: Requires booking `CUSTOMER`
- **Description**: Customer confirms job satisfaction. Advances booking to `COMPLETED`, increments `completedBookingsCount`, increments platform transaction count, and grants the provider the blue ready badge.

---

## 6. Quotation Negotiation (`/api/v1/quotes`)

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
- **Endpoint**: `POST /api/v1/quotes/:quoteId/accept` (or `PUT / :quoteId/accept`)
- **Auth**: Requires booking `CUSTOMER`
- **Description**: Sets quote status to `ACCEPTED` and transitions booking to `CONFIRMED`.

### 6.3 Customer Rejects Quotation
- **Endpoint**: `POST /api/v1/quotes/:quoteId/reject` (or `PUT / :quoteId/reject`)
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
- **Endpoint**: `POST /api/v1/reviews/:bookingId` (or `POST /api/v1/reviews`)
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

### 8.3 Provider Response
- **Endpoint**: `POST /api/v1/reviews/:reviewId/respond`
- **Auth**: Requires assigned `SERVICE_PROVIDER`
- **Request Body**:
```json
{
  "text": "Thank you for trusting us with your home plumbing!"
}
```

---

## 9. Administrator Platform Operations (`/api/v1/admin`)
*(All endpoints strictly require `ADMIN` role)*

### 9.1 Verification Queue & Directory
- `GET /api/v1/admin/verifications`: Returns pending verifications with masked IDs and credential links.
  - Query: `status=PENDING_REVIEW` or `status=VERIFIED`
- `PATCH /api/v1/admin/verifications/:id`: Approve (`status: VERIFIED`) or reject/revoke (`status: REJECTED`) a specialist with reason and admin notes. Records immutable audit log.

### 9.2 Platform Analytics
- `GET /api/v1/admin/stats` (alias: `/overview`): Platform metrics including total users, verified specialists, active bookings, completed transactions, and dispute counters.

### 9.3 Immutable Audit Logs
- `GET /api/v1/admin/audit-logs`: Returns paginated audit trail of all administrative interventions, approvals, and revocations.

### 9.4 Dispute Resolution
- `GET /api/v1/admin/disputes`: List disputes.
- `PATCH /api/v1/admin/disputes/:id`: Resolve dispute with resolution notes.
