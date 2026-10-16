# REPAIRFLOW AI Backend Starter

A starter Express REST API for the MySQL schema you supplied. It includes authentication, role checks, customers, repair tickets/status history, products, stock movements, audit events, and dashboard counts.

## Requirements
- Node.js 20+ recommended
- MySQL 8+
- Your `repairflow_ai` schema already created in MySQL

## Setup
1. Open a terminal in this folder.
2. Install packages:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and enter your own MySQL credentials.
4. Create a long random `JWT_SECRET`.
5. Ensure your supplied schema has been run against the same MySQL server and database named by `DB_NAME`.
6. Start the API:
   ```bash
   npm run dev
   ```
7. Test `GET http://localhost:3777/api/health`.

## Important first account
Register a user using `POST /api/auth/register`. For safety, public registration always creates a `technician` account. To create the first owner, register, then update that account's `role` to `owner` directly in MySQL using a trusted administrator connection. Do not expose role selection to public registration.

## API routes

### Public
- `GET /api/health`
- `POST /api/auth/register` body: `{ "full_name": "Demo User", "email": "demo@example.com", "password": "a-long-password" }`
- `POST /api/auth/login` body: `{ "email": "demo@example.com", "password": "a-long-password" }`

### Authenticated
- `GET /api/auth/me`
- `GET /api/customers?search=...`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `GET /api/repairs?status=Received&search=...&page=1&limit=20`
- `POST /api/repairs`
- `GET /api/repairs/:id`
- `PUT /api/repairs/:id`
- `PATCH /api/repairs/:id/status` body: `{ "status": "Diagnosing", "note": "Initial inspection started" }`
- `GET /api/products?search=...`
- `POST /api/products`
- `PUT /api/products/:id`
- `POST /api/stock-movements` body: `{ "product_id": 1, "movement_type": "received", "quantity": 5, "reason": "Supplier delivery" }`
- `GET /api/dashboard/summary` (manager/owner)

All protected routes require `Authorization: Bearer <token>`.

## Repair status values
`Received`, `Diagnosing`, `Waiting for Part`, `Waiting for Customer`, `In Repair`, `Ready for Pickup`, `Completed`, `Cancelled`.

## Security and scope notes
- Uses bcrypt password hashes, JWT authentication, parameterized SQL, basic validation, Helmet, CORS, and rate limiting on authentication.
- Public registration cannot choose privileged roles.
- This is a starter, not a fully audited production service. Add request-schema validation, automated tests, pagination limits, and deployment hardening before production.
- Gemini, Telegram, Google Sheets, workflow scheduling, notifications, and the shop-manager copilot are not wired up yet. Those should be added as separate modules after core CRUD flows are verified.
