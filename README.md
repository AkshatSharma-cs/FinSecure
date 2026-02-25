# 🏦 FinSecure Banking System

<div align="center">

![Java](https://img.shields.io/badge/Java-17-orange?style=for-the-badge&logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.0-6DB33F?style=for-the-badge&logo=springboot)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-black?style=for-the-badge&logo=jsonwebtokens)
![Maven](https://img.shields.io/badge/Maven-3.8+-C71A36?style=for-the-badge&logo=apachemaven)

A production-ready, full-stack digital banking application with a Spring Boot backend and dual React portals — one for customers, one for employees.

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Demo Credentials](#-demo-credentials)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)

---

## 🌟 Overview

FinSecure simulates a real Indian digital bank with three layers:

| Portal | Port | Users |
|--------|------|-------|
| **Customer Portal** | `3000` | Registered bank customers |
| **Employee Portal** | `3001` | Bank staff & admins |
| **Backend API** | `8080` | Spring Boot REST API |

---

## ✨ Features

### 👤 Customer Portal
- **Registration & Login** — JWT-based authentication with BCrypt password hashing
- **Dashboard** — Rotating promotional banners, account summary, quick deposit
- **Accounts** — Open Savings, Current, Fixed Deposit, and Recurring Deposit accounts
- **Deposits** — Self-deposit funds directly from the dashboard or accounts page
- **Fund Transfers** — NEFT / RTGS / IMPS / UPI with OTP verification for amounts above ₹10,000
- **Cards** — 4 card types across a full tab UI:
  - 💳 **Debit Card** — Physical & Virtual
  - 💰 **Credit Cards** — 4 schemes (Classic, Gold, Platinum, Signature) × Physical/Virtual
  - 🎁 **Prepaid Cards** — Load from account balance, Physical & Virtual
- **EMI Calculator** — Live rate slider, 7 tenure presets, interest breakdown
- **Loans** — Apply for Home, Personal, Car, Education, Business, and Gold loans
- **KYC** — Upload and track verification status for 8 document types
- **Transaction History** — Paginated per-account transaction log

### 🏢 Employee Portal
- **Customer Management** — Search, paginate, view all customers
- **Employee Deposits** — Credit any customer account directly
- **KYC Verification** — Approve or reject KYC documents from a live queue
- **Loan Approvals** — Review and process pending loan applications

### 💳 Credit Card Schemes

| Scheme | Credit Limit | Annual Fee | Key Benefits |
|--------|-------------|------------|--------------|
| **Classic** | ₹50,000 | Free | 1% cashback on all spends |
| **Gold** | ₹1,00,000 | ₹500/yr | 2% cashback + 2x dining & fuel rewards |
| **Platinum** | ₹3,00,000 | ₹1,000/yr | 3x rewards + airport lounge (4/yr) |
| **Signature** | ₹10,00,000 | ₹2,500/yr | 5x rewards + unlimited lounge + concierge |

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Java | 17 LTS | Core language |
| Spring Boot | 3.3.0 | Framework & REST API |
| Spring Security | 6.x | Authentication & authorization |
| Hibernate / JPA | 6.5 | ORM & database management |
| MySQL | 8.0 | Primary database |
| JJWT | 0.12.5 | JWT token creation & validation |
| BCrypt | Strength 12 | Password hashing |
| Lombok | 1.18.x | Boilerplate reduction |
| Maven | 3.8+ | Build & dependency management |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18 | Customer & Employee portals |
| React Router | v6 | Client-side routing |
| Axios | Latest | HTTP client with interceptors |
| CSS | — | Component scoped styling |

---

## 📁 Project Structure

```
finsecure/
├── backend/
│   ├── src/main/java/com/finsecure/
│   │   ├── config/          # SecurityConfig, JpaAuditingConfig, DataInitializer
│   │   ├── controller/      # AuthController, CustomerController, EmployeeController
│   │   ├── dto/             # 23 request/response DTOs
│   │   ├── entity/          # 11 JPA entities
│   │   ├── repository/      # 11 Spring Data repositories
│   │   ├── security/        # JwtUtil, JwtAuthenticationFilter
│   │   └── service/         # 9 services
│   └── src/main/resources/
│       ├── application.properties
│       └── schema.sql        # Schema + seed data + triggers
│
├── customer-portal/           # React 18 — port 3000
│   └── src/
│       ├── components/
│       │   ├── Dashboard.js   # Banners, deposit modal, quick links
│       │   ├── Accounts.js    # Account list + transfers
│       │   ├── Cards.js       # All card types + EMI calculator
│       │   ├── Loans.js       # Loan list + application
│       │   ├── Transactions.js
│       │   └── Profile.js     # Profile + KYC upload
│       └── api.js             # All Axios API calls
│
└── employee-portal/           # React 18 — port 3001
    └── src/
        ├── components/
        │   ├── CustomerManagement.js  # Customer table + deposit
        │   ├── KYCVerification.js     # Approve/reject queue
        │   └── LoanApprovals.js       # Review queue
        └── api.js
```

---

## 🚀 Quick Start

### Prerequisites

- **Java 17** — [Download](https://adoptium.net)
- **Maven 3.8+** — [Download](https://maven.apache.org)
- **Node.js 18+** — [Download](https://nodejs.org)
- **MySQL 8.0** — [Download](https://dev.mysql.com/downloads)

### 1. Database Setup

```sql
CREATE DATABASE finsecure_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'finsecure'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON finsecure_db.* TO 'finsecure'@'localhost';
FLUSH PRIVILEGES;
```

Then run the schema:
```bash
mysql -u finsecure -p finsecure_db < backend/src/main/resources/schema.sql
```

### 2. Backend Configuration

Edit `backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/finsecure_db
spring.datasource.username=finsecure
spring.datasource.password=your_password

jwt.secret=your-256-bit-secret-key-minimum-32-characters-long
jwt.expiration=86400000

# Optional — email OTP (leave blank to disable)
spring.mail.host=smtp.gmail.com
spring.mail.username=your_email@gmail.com
spring.mail.password=your_app_password
```

### 3. Start the Backend

```bash
cd backend
mvn clean install -DskipTests
mvn spring-boot:run
```

✅ Backend ready at `http://localhost:8080`

### 4. Start the Customer Portal

```bash
cd customer-portal
npm install
npm start
```

✅ Customer portal at `http://localhost:3000`

### 5. Start the Employee Portal

```bash
cd employee-portal
npm install
npm start
```

✅ Employee portal at `http://localhost:3001`

> **Windows note:** If you see `'react-scripts' is not recognized`, run `npm install` first.

---

## 🔑 Demo Credentials

| Role | Email | Password | Portal |
|------|-------|----------|--------|
| Customer | `priya@gmail.com` | `Customer@1234` | localhost:3000 |
| Employee | `emp1@finsecure.com` | `Employee@1234` | localhost:3001 |
| Admin | `admin@finsecure.com` | `Admin@1234` | localhost:3001 |

> If login fails after a backend restart, sign out and log back in to get a fresh JWT token.

---

## 📡 API Reference

Base URL: `http://localhost:8080/api`  
All protected endpoints require: `Authorization: Bearer <token>`

### 🔓 Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new customer |
| `POST` | `/auth/login` | Login — returns JWT |
| `POST` | `/auth/otp/send` | Send OTP to email |
| `POST` | `/auth/otp/verify` | Verify OTP code |

### 👤 Customer `(ROLE_CUSTOMER)`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/customer/dashboard` | Summary with balances and recent transactions |
| `GET` | `/customer/profile` | Full customer profile |
| `POST` | `/customer/accounts` | Open new account |
| `POST` | `/customer/accounts/deposit` | Self-deposit to own account |
| `POST` | `/customer/transactions/transfer` | Transfer funds |
| `GET` | `/customer/transactions/{accountId}` | Transaction history (paginated) |
| `GET` | `/customer/cards` | All cards |
| `POST` | `/customer/cards/{accountId}/issue-debit` | Issue physical debit card |
| `POST` | `/customer/cards/{accountId}/issue-virtual-debit` | Issue virtual debit card |
| `POST` | `/customer/cards/issue-credit` | Apply for credit card (scheme + variant) |
| `POST` | `/customer/cards/issue-prepaid` | Issue prepaid card with load amount |
| `POST` | `/customer/cards/action` | Block / Unblock / Toggle international & online |
| `POST` | `/customer/loans/apply` | Submit loan application |
| `GET` | `/customer/loans` | All loans |
| `POST` | `/customer/kyc/upload` | Upload KYC document |
| `GET` | `/customer/kyc/documents` | List KYC documents |

### 🏢 Employee `(ROLE_EMPLOYEE or ROLE_ADMIN)`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/employee/customers` | All customers with search & pagination |
| `POST` | `/employee/customers/deposit` | Deposit cash to any customer account |
| `GET` | `/employee/kyc/pending` | KYC documents pending review |
| `POST` | `/employee/kyc/verify` | Approve or reject a KYC document |
| `GET` | `/employee/loans/pending` | Loan applications pending review |
| `POST` | `/employee/loans/{loanId}/review` | Approve or reject a loan |
| `GET` | `/employee/dashboard` | Employee dashboard stats |

---

## 🗄 Database Schema

| Table | Description |
|-------|-------------|
| `users` | Core auth — email, password hash, role, active flag |
| `customers` | Profile, KYC status, PAN, Aadhaar, address |
| `employees` | Employee ID, department, joining date |
| `accounts` | Savings/Current/FD, balance, IFSC, branch |
| `transactions` | Debit/Credit, mode, reference number, balance snapshot |
| `cards` | Debit/Credit/Prepaid, scheme, variant, limits, perks |
| `loans` | Type, principal, rate, EMI, status, reviewer |
| `kyc_documents` | Doc type, number, status, rejection reason |
| `notifications` | Type, message, read status |
| `otps` | Email-linked OTP, purpose, expiry, used flag |
| `audit_logs` | All sensitive actions with timestamps |

---

## 🔒 Security

- **JWT tokens** — 24-hour expiry, HS256 signed
- **BCrypt** — Password hashing at strength 12
- **OTP verification** — Required for all transfers above ₹10,000
- **RBAC** — `ROLE_CUSTOMER`, `ROLE_EMPLOYEE`, `ROLE_ADMIN`
- **CORS** — Whitelisted to `localhost:3000` and `localhost:3001` only
- **KYC gate** — Card issuance blocked until KYC is `APPROVED`
- **Audit logging** — All sensitive actions recorded

---

<div align="center">
Made with ☕ &nbsp;·&nbsp; Spring Boot + React &nbsp;·&nbsp; FinSecure Banking System
</div>
