# Lehulu (ለሁሉ) — Production Deployment Runbook

This guide details the complete deployment process for releasing Lehulu into staging and production environments.

---

## 1. Production Topology Overview

```mermaid
flowchart TD
    DNS["Custom Domain / DNS (e.g. lehulu.et)"]
    Vercel["Frontend Hosting (Vercel)\nSingle Page Application (SPA)\nGlobal Edge CDN"]
    Render["Backend API & WebSockets (Render / Docker)\nExpress.js + Node.js 20 LTS\nSocket.IO WebSockets Server"]
    Atlas[("Database (MongoDB Atlas)\nM0/M10 Dedicated Cluster\nGeospatial 2dsphere & Compound Indexes")]
    GoogleAuth["Google Identity Services\nOAuth 2.0 Client Credentials"]
    Storage["Cloudinary / AWS S3\nObject Storage for Portfolios & ID Photos"]

    DNS -->|lehulu.et| Vercel
    DNS -->|api.lehulu.et| Render
    Vercel -->|REST API / HTTPS| Render
    Vercel <-->|WebSockets (WSS)| Render
    Render --> Atlas
    Render --> GoogleAuth
    Render --> Storage
```

---

## 2. Infrastructure Setup & Requirements

### 2.1 MongoDB Atlas Database
1. Create a MongoDB Atlas cluster (M0 free tier for staging; M10+ for production with automated backups).
2. Under **Network Access**, add the IP address of your Render backend service or `0.0.0.0/0` (secured with strong database user credentials).
3. Under **Database Access**, create an application user with `readWriteAnyDatabase` privileges.
4. Retrieve the SRV connection URI:
   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/lehulu?retryWrites=true&w=majority&appName=LehuluProduction
   ```

### 2.2 Google Cloud Identity OAuth Credentials
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Credentials**.
2. Select your OAuth 2.0 Client ID (Web Application).
3. Configure **Authorized JavaScript Origins**:
   - `https://lehulu.et`
   - `https://www.lehulu.et`
   - `https://lehulu.vercel.app` (Vercel preview domains)
   - `http://localhost:5173` (for local development)
4. Configure **Authorized Redirect URIs**:
   - `https://lehulu.et`
   - `https://lehulu.vercel.app`
5. Note down the **Client ID** (e.g., `1084242194821-xxxxxxxx.apps.googleusercontent.com`).

---

## 3. Backend Deployment (Render / Docker)

### 3.1 Render Web Service Settings
- **Environment**: Node / Docker
- **Branch**: `main`
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/server.js`
- **Health Check Path**: `/api/v1/health`

### 3.2 Backend Production Environment Variables
| Variable | Value / Description | Example |
|---|---|---|
| `PORT` | Listening port assigned by Render | `5000` |
| `NODE_ENV` | Environment mode | `production` |
| `CLIENT_URL` | Frontend origin for CORS and session cookies | `https://lehulu.et` |
| `MONGODB_URI` | MongoDB Atlas SRV URI | `mongodb+srv://...` |
| `JWT_SECRET` | 64+ char random string for session tokens | `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth Web Client ID | `1084242...apps.googleusercontent.com` |
| `ADMIN_EMAIL` | Super admin email receiving ADMIN role | `admin@lehulu.et` |
| `ALLOW_TEST_AUTH` | Disable in production (MUST be false) | `false` |

---

## 4. Frontend Deployment (Vercel)

### 4.1 Vercel Project Settings
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4.2 SPA Route Rewrites (`frontend/vercel.json`)
Ensure client-side routing works for direct URLs:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 4.3 Frontend Production Environment Variables
| Variable | Value / Description | Example |
|---|---|---|
| `VITE_API_URL` | Full URL to backend REST API | `https://api.lehulu.et/api/v1` |
| `VITE_SOCKET_URL` | Full URL to backend WebSocket server | `https://api.lehulu.et` |
| `VITE_GOOGLE_CLIENT_ID` | Same Google OAuth Web Client ID | `1084242...apps.googleusercontent.com` |

---

## 5. Seed Initial Catalog in Production

After provisioning the database and starting the backend, initialize the default Ethiopian trade categories:
```bash
# From local machine with production MONGODB_URI configured:
cd backend
MONGODB_URI="mongodb+srv://..." npm run seed
```
This provisions:
- Essential categories: Plumbing, Electrical, Carpentry, Automotive, Cleaning, Appliance, IT & Networking, Tailoring.
- Initial seed coordinates for Adama and Bishoftu.

---

## 6. Pre-Launch Verification Checklist

1. **Health Check Verification**:
   ```bash
   curl -i https://api.lehulu.et/api/v1/health
   # Expected: HTTP 200 OK with {"status": "UP", "database": "connected"}
   ```

2. **Catalog In-Memory Cache Verification**:
   ```bash
   curl -i https://api.lehulu.et/api/v1/categories
   # First request: X-Cache: MISS (< 50ms)
   # Subsequent requests: X-Cache: HIT (< 1ms)
   ```

3. **Authentication Verification**:
   - Sign in via Google with the configured `ADMIN_EMAIL`.
   - Verify immediate redirect to `/admin` dashboard with full platform metrics.
   - Sign in with a standard Google account and complete customer onboarding ("Find Services").
   - Sign in with another account and complete provider onboarding ("Offer Services").

4. **The 6-Step Booking Lifecycle Verification**:
   - **Step 1**: Customer submits booking request to verified provider.
   - **Step 2**: Provider submits itemized quote in ETB.
   - **Step 3**: Customer accepts quote (`CONFIRMED`).
   - **Step 4**: Provider clicks **"Start Work"** (`IN_PROGRESS`).
   - **Step 5**: Provider clicks **"Mark Completion Pending"** (`COMPLETION_PENDING`).
   - **Step 6**: Customer clicks **"Confirm Completion"** or submits a 5-star review (`COMPLETED`).
   - Verify Provider receives blue badge: **"Job Completed • Ready for Another Service"**.
   - Verify Admin Dashboard shows **Completed Transactions** counter incremented.

5. **Security & RBAC Boundary Check**:
   - Ensure `ALLOW_TEST_AUTH=false` in production.
   - Attempt unauthorized access to `/api/v1/admin/verifications` as customer (must return HTTP 403).

---

## 7. Monitoring & Maintenance

- **Uptime Monitoring**: Configure UptimeRobot or BetterStack monitoring `GET /api/v1/health` every 60 seconds.
- **Log Management**: Audit logs are permanently persisted in MongoDB Atlas (`AuditLog` collection) and searchable via the Admin Dashboard.
- **Database Backup**: Configure daily automated snapshot backups on MongoDB Atlas with 7-day retention.
