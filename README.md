# JalDrishti – Smart Multi-Village Water Intelligence & Management System
**जलदृष्टि · स्मार्ट बहु-ग्राम जल बुद्धिमत्ता एवं प्रबंधन प्रणाली**

[![Node.js Version](https://img.shields.io/badge/Node.js-v22+-026e00?logo=node.js)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%203%20(node%3Asqlite)-003b57?logo=sqlite)](https://nodejs.org/api/sqlite.html)
[![Security RBAC](https://img.shields.io/badge/Security-Enforced%20RBAC%20(19%20Tests%20Passing)-10b981)](./backend/test_rbac.js)

---

## 1. Project Overview & Architecture
**JalDrishti** (जलदृष्टि) is a modern, responsive, full-stack water utility intelligence and operational platform engineered for rural and peri-urban water supply networks.

The system manages a realistic multi-village physical topology:
```
                     [Raw Reservoir / Water Works Source]
                                      │
                 [Central Main Pump Station (P-01)]
                 3-Phase 415V · 18.5 kW Motor · VFD Control
                 Sensors: Flow, Pressure, Current, Temp, Energy
                                      │
                 [Main 3-Way Distribution Junction (J-01)]
                 Master Ultrasonic Flow Meter FM-01 (84 m³/h)
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │ (160mm HDPE, 780m)         │ (110mm PVC, 610m)          │ (110mm HDPE, 850m)
         ▼                            ▼                            ▼
   [Village A]                  [Village B]                  [Village C]
(Shanti Nagar)               (Kalyanpur)                  (Sundarpur)
Connections: 520             Connections: 410             Connections: 365
Elevated Tank: 180 kL        Elevated Tank: 140 kL        Elevated Tank: 120 kL
Delivered: 112.4 kL/day      Delivered: 88.1 kL/day       Delivered: 76.0 kL/day
Pressure: 3.34 bar (Normal)  Pressure: 2.58 bar (Warning) Pressure: 1.88 bar (Critical Leak)
```

---

## 2. Demonstration Personas & Working Credentials

Use any of the following pre-configured credentials to evaluate the system. You can also switch roles with 1 click using the quick persona bar at the top of the interface:

| Persona | Role | Email / Contact | Password | Scope & Boundaries |
| :--- | :--- | :--- | :--- | :--- |
| **Vikram Sharma** | `Administrator` | `admin@demo.local` | `Demo12345!` | Full system access: User management, asset registry, security audit logs, IWA water balance, GIS schematic, notice publishing. |
| **Harpreet Singh** | `Operating Staff` | `operator@demo.local` | `Demo12345!` | Operational monitoring: Central pump, safe simulated controls, tank levels, sensor telemetry, alarms, work orders, incident drafts. |
| **Rajesh Patel** | `Resident (Village A)` | `resident@demo.local` | `Demo12345!` | Village A resident portal: Water supply schedule (Normal), notice board, lodge/track complaints. |
| **Suman Verma** | `Resident (Village B)` | `resident.b@demo.local` | `Demo12345!` | Village B resident portal: Water supply schedule (Low pressure advisory), complaint tracking. |
| **Anil Kumar** | `Resident (Village C)` | `resident.c@demo.local` | `Demo12345!` | Village C resident portal: Water supply schedule (School Road active leak disruption), emergency boiling notice. |

> **Security Note**: Strict backend role-based access control (RBAC) is enforced. Residents attempting to access administrative or operational APIs (e.g., `/api/pump`, `/api/users`, `/api/pump/control`) receive `403 Forbidden`, and security violations are logged to the audit log.

---

## 3. Key Functional Modules

### A. Administrative Command Center
- **Three-Village Comparison**: Compare delivered volumes, per-connection liters/day, tank storage reserves, and distribution equity across all three villages.
- **IWA Standard Water Balance**:
  $$\text{Water Balance Difference (\%)} = \left(\frac{\text{Water Supplied} - \text{Authorized Consumption}}{\text{Water Supplied}}\right) \times 100$$
  Differentiates system input (292.5 kL), village deliveries (276.5 kL), authorized consumption (249.7 kL), estimated physical losses (19.2 kL), and apparent meter error (23.6 kL).
- **Asset Registry**: Comprehensive catalog of pumps, elevated reservoirs, HDPE/PVC transmission trunks, and control valves.
- **User & Operator Management**: Administrator directory with role provisioning.
- **Security Audit Trail**: Real-time log of administrative changes, simulated pump operations, and blocked access attempts.
- **Exporting**: Download RFC 4180 CSV telemetry datasets and printable/PDF reports.

### B. Operating Dashboard
- **Central Main Pump Monitoring**: Real-time tracking of 415V voltage, 23.4A current, 12.8 kW load, 58.4°C motor bearing temp, 3.62 bar pressure, 84 m³/h flow, and running hours.
- **Safe Simulated Equipment Controls**: Start/Stop main pump with interlock safety checks and explicit confirmation modals (`SIMULATION ONLY: No physical PLC command is issued`).
- **Interactive GIS / Pipeline Schematic**: Interactive SVG network showing the primary source, distribution junction J-01, branch lines, and live sensor nodes. Click any pipeline to view material, diameter, length, pressure, and flow.
- **Animated Elevated Storage Tanks**: Dynamic SVG/CSS water tank containers showing percentage reserve, stored volume in liters, wave motion, and inlet/outlet rates.
- **AI-Assisted Leakage Intelligence**: Real-time physical mass-balance engine comparing pump outlet flow with the sum of village inlet flows ($84.0 - 82.7 = 1.3 \text{ m}^3/\text{h}$ loss). Pinpoints the School Road leak in Village C (1,260 L/h, 45 homes affected, 88.5 anomaly score) and provides 1-click work order dispatch.
- **Sensor Health & Water Quality**: Flow meters, pressure transducers, residual chlorine (0.2–0.8 mg/L band), pH (6.5–8.5), and turbidity (<1.0 NTU) with mandatory health potability disclaimers.
- **Alarm & Incident Management**: Acknowledge, assign, and resolve operational alarms.
- **Maintenance Work Orders**: Technician dispatch, spare parts tracking, and repair cost accounting in Indian Rupees (₹).

### C. Resident Portal (Mobile-First)
- **Village Welcome Banner**: Shows registered village and current operational status.
- **Water Supply Status**: Clear status banner (`Normal`, `Supply Affected`, or `Emergency Interruption`) with next scheduled supply window.
- **Elevated Tank Level Indicator**: Real-time water buffer for their registered village.
- **High-Priority Notice Board**: Filtered announcements targeting their village with unread notification badges and 1-click "Mark as Read / Unread".
- **Complaint Submission & Tracking**: File water complaints with category, location, description, and optional photo. Generates a unique reference ticket (e.g., `CMP-1042`) with an interactive step-by-step resolution timeline.
- **Water Advice & Technical Glossary**: Plain-language explanations of water terms with real-world analogies in both **English and Hindi (हिन्दी)**.

---

## 4. Quick Start & Setup Guide

### Prerequisites
- Node.js v22 or higher (Node.js 26 recommended)
- npm v10 or higher

### Installation
Clone or navigate to the repository directory:
```bash
cd "leakage detection"
```

Install dependencies for root, backend, and frontend:
```bash
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

## 5. Automated Security & RBAC Test Suite
Verify that backend role-based access control strictly isolates residents and operators:
```bash
npm run test:rbac
```
Expected output:
```
====================================================
🛡️  JalDrishti RBAC Security & Authorization Tests
====================================================
  ✅ PASS: Admin authenticated
  ✅ PASS: Operating Staff authenticated
  ✅ PASS: Resident authenticated (Village A)
  ✅ PASS: Unauthenticated access to /api/pump is blocked (401)
  ✅ PASS: Resident blocked from /api/pump (403 Forbidden)
  ✅ PASS: Resident blocked from simulated pump control (403 Forbidden)
  ✅ PASS: Resident blocked from /api/users (403 Forbidden)
  ✅ PASS: Resident blocked from /api/villages/comparison (403 Forbidden)
  ✅ PASS: Village A Resident blocked from Village C internal data (403 Forbidden)
  ✅ PASS: Resident can access their own village data (200 OK)
  ✅ PASS: Resident can view village notice board
  ✅ PASS: Resident can submit water complaint
  ✅ PASS: Operating Staff can monitor central pump (200 OK)
  ✅ PASS: Operating Staff can view AI leakage intelligence (200 OK)
  ✅ PASS: Operating Staff is blocked from user administration (403 Forbidden)
  ✅ PASS: Operating Staff is blocked from viewing audit logs (403 Forbidden)
  ✅ PASS: Administrator can view user directory (200 OK)
  ✅ PASS: Administrator can view security audit logs (200 OK)
  ✅ PASS: Administrator can view IWA water balance analytics
====================================================
Summary: 19 passed, 0 failed.
====================================================
```

---

## 6. Directory Structure
```
leakage detection/
├── package.json                 # Root scripts for concurrently running services
├── .env.example                 # Environment configuration template
├── README.md                    # System documentation and operational guide
├── database/
│   ├── schema.sql               # Relational database schema
│   └── seed.sql                 # Demonstration seed records
├── docs/
│   ├── API_DOCUMENTATION.md     # REST and WebSocket API specification
│   └── SIMULATION_AND_HARDWARE_ROADMAP.md # Hardware integration architecture
├── backend/
│   ├── package.json
│   ├── server.js                # Express & WebSocket streaming server
│   ├── db.js                    # Embedded high-performance node:sqlite database
│   ├── simulation.js            # Stochastic physical telemetry & anomaly engine
│   ├── test_rbac.js             # Automated security & RBAC verification suite
│   ├── middleware/
│   │   └── auth.js              # JWT authentication & role-based route guard
│   └── routes/
│       ├── auth.js              # Login, register, demo OTP, password reset
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
    ├── components/
    │   ├── Navbar.tsx           # Brand, persona switcher, language/theme toggles
    │   ├── Sidebar.tsx          # Role-based collapsible navigation
    │   ├── MobileNav.tsx        # Bottom navigation for mobile residents
    │   ├── DemoBanner.tsx       # Live simulation badge & quick persona selector
    │   ├── TankVisualizer.tsx   # Dynamic animated water tank with wave motion
    │   ├── NetworkSchematic.tsx # Interactive pipeline schematic & GIS map
    │   ├── VillageComparison.tsx# 3-village comparison matrix & equity indicators
    │   ├── PumpMonitor.tsx      # Central pump metrics & safe simulated controls
    │   ├── LeakageIntelligence.tsx# Rule-based AI anomaly engine & leak cards
    │   ├── SensorDashboard.tsx  # Multi-parameter sensor cards & calibrations
    │   ├── NoticeBoard.tsx      # Village water notice board & publishing modal
    │   ├── ResidentPortal.tsx   # Mobile-first resident dashboard
    │   ├── ComplaintManager.tsx # Grievance submission & reference tracker
    │   ├── MaintenanceTracker.tsx# Work orders, technicians, and repair costs
    │   ├── WaterAnalytics.tsx   # Water balance formula, Recharts, and CSV export
    │   ├── AssetRegistry.tsx    # Infrastructure asset inventory & search
    │   ├── UserManagement.tsx   # Admin user & operator directory
    │   ├── AuditLogViewer.tsx   # Immutable security audit trail
    │   ├── TechnicalGlossary.tsx# Bilingual water dictionary (English & Hindi)
    │   └── AuthModal.tsx        # Login, registration with OTP, password recovery
    ├── context/
    │   ├── AuthContext.tsx      # User state, JWT sessions, and role helpers
    │   └── LanguageContext.tsx  # English / Hindi translations dictionary
    └── lib/
        └── api.ts               # Typed fetch client with Bearer auth
```

---

## 7. License & Compliance
Built as part of the JalDrishti Clean Water Intelligence Initiative. Designed to comply with Jal Jeevan Mission guidelines and IWA (International Water Association) water loss reporting standards.
