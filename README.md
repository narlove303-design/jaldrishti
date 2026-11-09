# JalDrishti – Smart Multi-Village Water Intelligence & Management System
**जलदृष्टि · स्मार्ट बहु-ग्राम जल बुद्धिमत्ता एवं प्रबंधन प्रणाली**

[![Node.js Version](https://img.shields.io/badge/Node.js-v22+-026e00?logo=node.js)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%203%20(node%3Asqlite)-003b57?logo=sqlite)](https://nodejs.org/api/sqlite.html)
[![Security & RBAC](https://img.shields.io/badge/Security-Enforced%20RBAC%20&%20Crypto%20Auth-10b981)](./backend/test_security.js)
[![Engineering Simulation](https://img.shields.io/badge/Simulation-Darcy--Weisbach%20%26%20Pump%20Hydraulics-blue)](./backend/test_engineering.js)

---

## 1. Project Overview & Multi-Village Physical Topology
**JalDrishti** (जलदृष्टि) is a full-stack, SCADA-grade water utility intelligence and operational platform engineered for rural and peri-urban piped water distribution systems.

The platform monitors and balances a multi-village network connected to one common pumping station:

```
                     [Raw Reservoir / Water Works Source]
                                      │
                 [Central Main Pump Station (P-01)]
                 3-Phase 415V · 18.5 kW Motor · VFD Control
                 Darcy-Weisbach Head · P_hyd = rho * g * Q * H
                 Sensors: Flow, Pressure, Current, Temp, Energy
                                      │
                 [Main 3-Way Distribution Junction (J-01)]
                 Master Ultrasonic Flow Meter FM-01 (84.0 m³/h)
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │ (160mm HDPE, 780m)         │ (110mm PVC, 610m)          │ (110mm HDPE, 850m)
         ▼                            ▼                            ▼
   [Village A]                  [Village B]                  [Village C]
(Shanti Nagar)               (Kalyanpur)                  (Sundarpur)
Connections: 520             Connections: 410             Connections: 365
Elevated Tank: 180 kL        Elevated Tank: 140 kL        Elevated Tank: 120 kL
Delivered: 112.4 kL/day      Delivered: 88.1 kL/day       Delivered: 76.0 kL/day
Pressure: 3.41 bar (Normal)  Pressure: 2.58 bar (Warning) Pressure: 1.88 bar (Critical Leak)
```

---

## 2. Demonstration Personas & Working Credentials

Use any of the following credentials to evaluate the system. You can switch roles seamlessly with 1 click using the persona switcher at the top of the interface:

| Persona | Role | Email / Contact | Password | Scope & Boundaries |
| :--- | :--- | :--- | :--- | :--- |
| **Vikram Sharma** | `Administrator` | `admin@demo.local` | `Demo12345!` | Full access: User management, asset registry, security audit logs, IWA water balance, GIS schematic, notice publishing. |
| **Harpreet Singh** | `Operating Staff` | `operator@demo.local` | `Demo12345!` | Operational monitoring: Central pump, safe simulated controls, tank levels, sensor telemetry, alarms, work orders, incident drafts. |
| **Rajesh Patel** | `Resident (Village A)` | `resident@demo.local` | `Demo12345!` | Village A resident portal: Water supply schedule (Normal), notice board, lodge/track complaints. |
| **Suman Verma** | `Resident (Village B)` | `resident.b@demo.local` | `Demo12345!` | Village B resident portal: Water supply schedule (Low pressure advisory), complaint tracking. |
| **Anil Kumar** | `Resident (Village C)` | `resident.c@demo.local` | `Demo12345!` | Village C resident portal: Water supply schedule (School Road active leak disruption), emergency boiling notice. |

> **Security Enforcement**: Strict backend role-based access control (RBAC) is enforced. Residents attempting to access administrative or operational APIs (e.g., `/api/pump`, `/api/users`, `/api/pump/control`) receive `403 Forbidden`, and security violations are logged to the audit log.

---

## 3. Engineering & Simulation Physics Formulation

JalDrishti implements first-principles mathematical modeling:

### A. Darcy-Weisbach Pipeline Friction Loss
$$h_f = f \cdot \frac{L}{D} \cdot \frac{v^2}{2g}, \quad \Delta P\text{ (bar)} = \frac{\rho g h_f}{10^5}$$
- Swamee-Jain explicit formulation for turbulent flow ($Re \ge 2300$):
  $$f = \frac{0.25}{\left[\log_{10}\left(\frac{\varepsilon}{3.7 D} + \frac{5.74}{Re^{0.9}}\right)\right]^2}$$
- Accurately computes pressure gradients across Ductile Iron (feeder), HDPE PE100 (Branch A & C), and uPVC (Branch B).

### B. Centrifugal Pump Hydraulics & Motor Power
- Hydraulic power in SI units:
  $$P_{\text{hyd}} = \rho g Q H = (P_{\text{discharge}} - P_{\text{suction}}) \cdot Q$$
- Electrical shaft power:
  $$P_{\text{elec}} = \frac{P_{\text{hyd}}}{\eta_{\text{pump}} \cdot \eta_{\text{motor}}}$$
- 3-Phase line current:
  $$I = \frac{P_{\text{elec}}}{\sqrt{3} \cdot V_{\text{line}} \cdot \cos\phi}$$
- Motor thermal heating ($I^2 R$) and convective cooling:
  $$\frac{dT}{dt} = k_{\text{heat}} \left(\frac{I}{I_{\text{rated}}}\right)^2 - k_{\text{cool}} (T_{\text{motor}} - T_{\text{ambient}})$$

### C. Reservoir Tank Mass Balance Integration
$$\frac{dV}{dt} = Q_{\text{in}} - Q_{\text{out}}, \quad \Delta V = (Q_{\text{in}} - Q_{\text{out}}) \cdot \frac{\Delta t}{3600} \cdot 1000\text{ (L)}$$
- Strictly clamped: $0 \le V \le V_{\text{capacity}}$, Level % = $(V / V_{\text{capacity}}) \times 100$.

### D. IWA Mass-Balance Leakage Intelligence
$$\Delta Q_{\text{loss}} = \max\left(0, Q_{\text{pump}} - \sum Q_{\text{villages}}\right)$$
- Anomaly score integrates instantaneous volume discrepancy ($\text{L/h}$) with localized Branch C pressure gradient drop ($\Delta P_{\text{deficit}}$).

---

## 4. Key Functional Modules

### A. Administrative Command Center
- **Three-Village Comparison**: Compare delivered volumes, per-connection liters/day, tank storage reserves, and distribution equity across all three villages.
- **IWA Standard Water Balance**:
  $$\text{Water Balance Difference (\%)} = \left(\frac{\text{Water Supplied} - \text{Authorized Consumption}}{\text{Water Supplied}}\right) \times 100$$
  Decomposes system input, village deliveries, authorized consumption, physical leakage, and apparent meter tolerances from real database time-series.
- **Asset Registry**: Infrastructure registry of pumps, elevated reservoirs, HDPE/PVC trunks, and control valves.
- **User & Operator Management**: Role-based user provisioning and access directory.
- **Security Audit Trail**: Real-time log of administrative changes, simulated pump operations, and blocked access attempts.
- **Exporting**: Download RFC 4180 CSV telemetry datasets and printable/PDF reports.

### B. Operating Dashboard
- **Central Main Pump Monitoring**: Real-time tracking of 415V voltage, current, power, motor temp, discharge pressure, flow, and running hours.
- **Safe Simulated Equipment Controls**: Start/Stop main pump with interlock safety checks and confirmation dialogs.
- **Interactive GIS / Pipeline Schematic**: Interactive SVG network with branch lines, junction J-01, and live telemetry nodes.
- **Animated Elevated Storage Tanks**: SVG/CSS water tank containers showing percentage reserve, stored volume in liters, wave motion, and inlet/outlet rates.
- **AI-Assisted Leakage Intelligence**: Real-time physical mass-balance engine comparing pump outlet flow with branch sums ($84.0 - 82.7 = 1.3 \text{ m}^3/\text{h}$ loss). Pinpoints the School Road leak in Village C (1,260 L/h, 45 homes affected, 88.5 anomaly score) and provides 1-click work order dispatch.
- **Sensor Health & Water Quality**: Flow meters, pressure transducers, residual chlorine, pH, and turbidity.
- **Alarm & Incident Management**: Acknowledge, assign, and resolve operational alarms.
- **Maintenance Work Orders**: Technician dispatch, spare parts tracking, and repair cost accounting in Indian Rupees (₹).

### C. Resident Portal (Mobile-First)
- **Village Welcome Banner**: Shows registered village and current operational status.
- **Water Supply Status**: Clear status banner (`Normal`, `Supply Affected`, or `Emergency Interruption`) with next scheduled supply window.
- **Elevated Tank Level Indicator**: Real-time water buffer for their registered village.
- **High-Priority Notice Board**: Filtered announcements targeting their village with unread notification badges and 1-click "Mark as Read / Unread".
- **Complaint Submission & Tracking**: File water complaints with category, location, description, and optional photo. Generates a unique reference ticket (e.g., `CMP-1042`) with an interactive step-by-step resolution timeline.
- **Water Advice & Technical Glossary**: Bilingual water dictionary in both **English and Hindi (हिन्दी)**.

---

## 5. Quick Start & Setup Guide

### Prerequisites
- Node.js v22 or higher (Node.js 26 recommended)
- npm v10 or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/narlove303-design/jaldrishti.git
cd jaldrishti

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Running Development Servers
To run both backend API (port 4000) and frontend Next.js app (port 3000) concurrently:
```bash
npm run dev
```

Open your browser at:
- **Frontend Application**: `http://localhost:3000`
- **Backend API & Health**: `http://localhost:4000/api/health`
- **WebSocket Stream**: `ws://localhost:4000/ws/telemetry`

---

## 6. Comprehensive Automated Test Suites

Run the complete test suite (61 tests across 3 suites):
```bash
cd backend && npm test
```

Or execute individual test suites:
```bash
# 1. Fluid Mechanics & Engineering Calculations (22 tests)
npm run test:engineering

# 2. Security, JWT, Dynamic OTP & Rate Limiting (20 tests)
npm run test:security

# 3. Role-Based Access Control (19 tests)
npm run test:rbac
```

---

## 7. Directory Structure
```
jaldrishti/
├── package.json                 # Monorepo scripts
├── .env.example                 # Environment configuration template
├── README.md                    # System documentation and operational guide
├── database/
│   ├── schema.sql               # Relational database schema
│   └── seed.sql                 # Demonstration seed records
├── docs/
│   ├── API_DOCUMENTATION.md     # REST and WebSocket API specification
│   └── SIMULATION_AND_HARDWARE_ROADMAP.md # Engineering physics & hardware roadmap
├── backend/
│   ├── package.json
│   ├── server.js                # Express & WebSocket streaming server
│   ├── db.js                    # Embedded high-performance node:sqlite database
│   ├── simulation.js            # Darcy-Weisbach & pump hydraulic simulation engine
│   ├── test_engineering.js     # Fluid mechanics & mass balance test suite
│   ├── test_security.js        # JWT, OTP, and security defense test suite
│   ├── test_rbac.js            # Automated role isolation verification suite
│   ├── middleware/
│   │   ├── auth.js              # JWT verification & role route guards
│   │   └── rateLimiter.js       # In-memory sliding-window rate limiter
│   └── routes/
│       ├── auth.js              # Login, register, dynamic OTP, password reset
│       ├── pump.js              # Central pump telemetry & safe controls
│       ├── villages.js          # Village stats & multi-village comparison
│       ├── network.js           # Pipeline topology & distribution junction
│       ├── tanks.js             # Water storage tanks & level telemetry
│       ├── sensors.js           # Multi-parameter sensors & thresholds
│       ├── leaks.js             # AI leakage intelligence & anomaly engine
│       ├── notices.js           # High-priority village notice board
│       ├── complaints.js        # Grievance registration & code tracker
│       ├── maintenance.js       # Work orders, technicians, and repair costs
│       ├── assets.js            # Asset & equipment registry
│       ├── analytics.js         # IWA water balance calculations & CSV export
│       ├── users.js             # User & operator directory (Admin only)
│       └── audit.js             # Security audit logs (Admin only)
└── frontend/
    ├── package.json
    ├── next.config.ts           # Next.js configuration with backend proxy
    ├── tailwind.config.ts       # Utility styling with custom navy/teal palette
    ├── app/
    │   ├── layout.tsx           # Providers, bilingual wrapper, and typography
    │   ├── page.tsx             # Master dashboard coordinator & route views
    │   └── globals.css          # Animated water tanks, wave keyframes, dark mode
    ├── components/              # 20+ specialized UI modules
    ├── context/
    │   ├── AuthContext.tsx      # User state, JWT sessions, and role helpers
    │   └── LanguageContext.tsx  # English / Hindi translations dictionary
    └── lib/
        └── api.ts               # Typed fetch client with Bearer auth
```

---

## 8. License & Compliance
Built as part of the JalDrishti Clean Water Intelligence Initiative. Designed to comply with Jal Jeevan Mission guidelines and IWA (International Water Association) water loss reporting standards.
