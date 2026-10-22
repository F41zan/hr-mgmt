# HR Management System — Auth & RBAC

A production-ready Next.js 16 application with secure Authentication and Role-Based Access Control for **Admin**, **HR**, and **Employee** roles.

---

## Tech Stack

| Layer     | Choice                                    |
| --------- | ----------------------------------------- |
| Framework | Next.js 16 (App Router)                   |
| Database  | MongoDB (Mongoose) via `hr-mgmt` database |
| Session   | JWT cookies via `jose`                    |
| Passwords | bcryptjs (cost 12)                        |
| Email     | Nodemailer (SMTP)                         |
| Styling   | Tailwind CSS v4                           |
| Testing   | Jest + ts-jest                            |

---

## Quick Start

### 1. Configure environment variables

Copy `.env.local` and fill in your values:

```bash
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/hr-mgmt

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<64-char-hex>

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (optional — password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="HR Management <your@gmail.com>"
```

### 2. Seed the first Admin account

Set these in `.env.local`, run the seed **once**, then **remove** them:

```bash
ADMIN_BOOTSTRAP_SECRET=some-strong-secret
ADMIN_SEED_NAME=System Admin
ADMIN_SEED_EMAIL=admin@company.com
ADMIN_SEED_PASSWORD=Admin@1234
```

```bash
npx ts-node --project tsconfig.scripts.json scripts/seed-admin.ts
```

### 3. Run development server

```bash
npm run dev
```

### 4. Run tests

```bash
npm run test:run
```

---

## Routes

| Route                      | Access               |
| -------------------------- | -------------------- |
| `/login`                   | Public               |
| `/forgot-password`         | Public               |
| `/reset-password`          | Public (token-gated) |
| `/admin/dashboard`         | Admin only           |
| `/hr/dashboard`            | HR only              |
| `/employee/dashboard`      | Employee only        |
| `/account/profile`         | All authenticated    |
| `/account/change-password` | All authenticated    |
| `/unauthorized`            | Public (401 page)    |
| `/forbidden`               | Public (403 page)    |

## API Endpoints

| Method | Path                        | Auth    |
| ------ | --------------------------- | ------- |
| POST   | `/api/auth/login`           | None    |
| POST   | `/api/auth/logout`          | Session |
| GET    | `/api/auth/me`              | Session |
| POST   | `/api/auth/forgot-password` | None    |
| POST   | `/api/auth/reset-password`  | Token   |
| POST   | `/api/auth/change-password` | Session |
| GET    | `/api/admin/users`          | Admin   |
| POST   | `/api/admin/users`          | Admin   |
| PATCH  | `/api/admin/users/[id]`     | Admin   |
| DELETE | `/api/admin/users/[id]`     | Admin   |
| GET    | `/api/account/profile`      | Session |
| PATCH  | `/api/account/profile`      | Session |

---

## Security Notes

- Passwords hashed with bcryptjs (cost factor 12)
- Sessions stored in HTTP-only, Secure (production), SameSite=Lax cookies
- JWT signed with HS256, 8-hour expiry
- Role verified server-side on every request — never trusted from client
- Reset tokens: cryptographically secure 32-byte random hex, stored as SHA-256 hash, single-use, 1-hour expiry
- Rate limiting: 10 login attempts / 5 reset requests per 15 min per IP
- Inactive accounts cannot authenticate
- Admin cannot deactivate themselves
- Public registration is disabled — accounts created by Admin only

## Email Configuration

Password reset emails require SMTP configuration. Without it:

- Tokens are still generated and stored
- In `NODE_ENV=development`, the reset link is logged to console (not sent)
- Set `SMTP_USER` and `SMTP_PASS` to enable email delivery

For Gmail, create an **App Password** (not your main password) at https://myaccount.google.com/apppasswords

## Remaining Manual Configuration

1. Set `MONGODB_URI` with your real Atlas connection string
2. Set `JWT_SECRET` to a cryptographically random 64-char hex value
3. Run the admin seed script once, then remove `ADMIN_SEED_*` variables
4. Configure SMTP variables to enable password-reset emails
5. Set `NEXT_PUBLIC_APP_URL` to your production domain before deploying
