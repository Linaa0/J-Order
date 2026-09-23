# J Order

Gas ordering and tracking platform for Gas Engineering and Services Ltd (GES), Gasabo, Kigali, Rwanda.

Built with Next.js 14 App Router, TypeScript, Tailwind CSS, PostgreSQL, and Prisma.

## Features

- Step by step guided order form for 5 gas products
- Live order status tracking with animated progress tracker
- Four language support: English, Kinyarwanda, French, and Kiswahili
- Offline order placement with automatic sync via Dexie IndexedDB
- Phone number plus OTP authentication via Africa's Talking SMS
- Staff dashboard with real time order queue filtered by assigned product categories
- Admin dashboard with analytics, staff management, and order charts
- USSD fallback via Africa's Talking for users without internet access
- PWA installable on Android and iOS
- Full audit trail for every order status change

## Tech Stack

- Next.js 14 App Router
- TypeScript (strict mode)
- Tailwind CSS with custom navy and ember color palette
- PostgreSQL via Prisma ORM
- Dexie.js for IndexedDB offline storage
- NextAuth.js with custom phone plus OTP provider
- next-intl for internationalization
- Framer Motion for animations
- Africa's Talking for SMS and USSD
- Firebase Cloud Messaging for push notifications
- Sentry for error monitoring
- Jest plus Testing Library for tests

## Quick Start

### Prerequisites

- Node.js 18 or later
- PostgreSQL database
- Africa's Talking account (for SMS and USSD)
- Firebase project (for push notifications)

### Setup

1. Clone and install dependencies

   npm install

2. Copy environment variables

   copy .env.example .env.local

3. Fill in all required environment variables in .env.local

4. Generate Prisma client

   npm run db:generate

5. Run database migrations

   npm run db:migrate

6. Seed the database with sample data

   npm run db:seed

7. Start the development server

   npm run dev

The app runs at http://localhost:3000

## Required Environment Variables

DATABASE_URL
  PostgreSQL connection string in format postgresql://user:password@host:port/dbname

NEXTAUTH_SECRET
  A random string at least 32 characters, used to sign JWTs

NEXTAUTH_URL
  Your app URL, e.g. http://localhost:3000 or https://your-domain.com

AT_API_KEY
  Africa's Talking API key from https://account.africastalking.com

AT_USERNAME
  Africa's Talking username, use sandbox for testing

AT_SENDER_ID
  SMS sender name shown to recipients

NEXT_PUBLIC_FIREBASE_API_KEY through NEXT_PUBLIC_FIREBASE_VAPID_KEY
  Firebase project credentials for push notifications

SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN
  Sentry project DSN for error monitoring

OTP_SECRET
  Secret for OTP generation, at least 32 characters

## Database Schema

The PostgreSQL schema covers:

- users: clients, order staff, technicians, and admins
- otp_codes: one time passwords for phone verification
- staff_product_categories: which product types each staff member handles
- orders: full order details with client, status, delivery location, and timing
- order_items: individual line items per order
- order_status_history: complete audit trail of every status change with timestamp and actor
- notifications: SMS and push notification records

## API Endpoints

POST /api/auth/send-otp
  Send OTP to phone number. Body: { phone: string }

GET /api/orders
  List orders. Query: status, product, page, limit. Scoped by role.

POST /api/orders
  Create order. Body: { items, deliveryAddress, preferredDate, preferredTime, notes, guestPhone }

GET /api/orders/:id
  Get single order with full detail and status history.

PATCH /api/orders/:id
  Update order status. Body: { status, reason }. Staff and admin only.

GET /api/users/profile
  Get current user profile.

PATCH /api/users/profile
  Update name and preferred language.

GET /api/admin/analytics
  Get analytics data. Admin only.

GET /api/admin/users
  List staff accounts. Admin only.

POST /api/admin/users
  Create staff member. Admin only.

PATCH /api/admin/users/:id
  Update staff member isActive status. Admin only.

POST /api/ussd
  Africa's Talking USSD callback endpoint.

## Seed Data Test Accounts

All test accounts use OTP authentication. In development mode the OTP is printed to the server console.

Admin: +250780000001
Staff (Gas Refill and 6 Kg): +250780000002
Staff (12 Kg, 20 Kg, 38 Kg): +250780000003
Technician: +250780000004
Client 1: +250788000001
Client 2: +250788000002

## Deployment

### Production Checklist

1. Set NODE_ENV=production
2. Use a strong NEXTAUTH_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
3. Run prisma migrate deploy before starting the server
4. Ensure DATABASE_URL points to production PostgreSQL
5. Set NEXTAUTH_URL to your production domain with HTTPS
6. Configure Africa's Talking with your live API key and sender ID
7. Set up Sentry DSN for production error monitoring
8. The PWA service worker and manifest are automatically generated during build

### Recommended Platforms

- Railway or Render for the Next.js app
- Neon or Supabase for PostgreSQL
- Vercel is also supported

### Build Command

npm run build

### Start Command

npm run start

## USSD Integration

Register the USSD callback URL in your Africa's Talking dashboard:
https://your-domain.com/api/ussd

The USSD flow supports:
1. Place new order (product, quantity, address, confirm)
2. Check order status by order number

## Running Tests

npm test

Tests cover order creation, status transitions, and offline sync utilities.
