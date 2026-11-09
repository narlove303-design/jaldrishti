# JalDrishti – REST & WebSocket API Documentation
**Smart Multi-Village Water Intelligence & Management System**
*Version 1.0.0*

---

## 1. Architecture & Protocol Overview
- **Base URL**: `http://localhost:4000/api`
- **Real-Time Telemetry Stream**: `ws://localhost:4000/ws/telemetry`
- **Authentication**: Bearer Token in `Authorization: Bearer <JWT>` header
- **Role Enforcement (RBAC)**:
  - `Administrator`: Full access to all villages, user directory, audit trails, and policy publishing.
  - `Operating Staff`: Supervisory monitoring, safe simulated equipment controls, maintenance work orders, alarms, and incident draft submissions.
  - `Resident`: Strictly isolated to resident portal endpoints, village water schedules, notice boards, and complaint tracking. Any attempt to reach admin or operator routes returns `403 Forbidden` and logs a security violation.

---

## 2. Authentication Endpoints (`/api/auth`)

### 2.1 User Login
`POST /api/auth/login`
- **Body**:
  ```json
  {
    "email_or_mobile": "admin@demo.local",
    "password": "Demo12345!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "user": {
      "id": 1,
      "name": "Vikram Sharma (Chief Engineer)",
      "email_or_mobile": "admin@demo.local",
      "role": "Administrator",
      "village": "All"
    }
  }
  ```

### 2.2 Resident Registration (Step 1)
`POST /api/auth/register`
- **Body**:
  ```json
  {
    "name": "Suman Verma",
    "email_or_mobile": "suman@demo.local",
    "password": "Demo12345!",
    "village": "Village B"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Simulated OTP generated successfully.",
    "contact": "suman@demo.local",
    "simulatedOtp": "123456"
  }
  ```

### 2.3 Simulated OTP Verification (Step 2)
`POST /api/auth/otp/verify`
- **Body**:
  ```json
  {
    "email_or_mobile": "suman@demo.local",
    "otp": "123456"
  }
  ```

---

## 3. Central Main Pump Station (`/api/pump`)

### 3.1 Get Pump Telemetry
`GET /api/pump`
- **Allowed Roles**: `Administrator`, `Operating Staff` (Blocked for `Resident`)
- **Response (200 OK)**:
  ```json
  {
    "pump": {
      "id": 1,
      "name": "Central Main Pump Station (P-01)",
      "status": "Running",
      "voltage_v": 415.2,
      "current_a": 23.4,
      "power_kw": 12.8,
      "motor_temp_c": 58.4,
      "discharge_pressure_bar": 3.62,
      "flow_rate_m3h": 84.0,
      "total_energy_kwh": 99.3,
      "total_water_kl": 292.5,
      "run_hours": 3284.5,
      "vfd_frequency_hz": 48.5,
      "interlock_status": "All Interlocks Healthy",
      "energy_intensity_kwh_per_kl": 0.340
    }
  }
  ```

### 3.2 Safe Simulated Equipment Control
`POST /api/pump/control`
- **Allowed Roles**: `Administrator`, `Operating Staff`
- **Body**:
  ```json
  {
    "command": "START", // START | STOP | SET_FREQUENCY | RESET_INTERLOCKS
    "frequency_hz": 48.0
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "SIMULATED: Main pump P-01 started successfully.",
    "status": "Running",
    "note": "Simulation mode active: No electrical relay or physical motor was engaged."
  }
  ```

---

## 4. Multi-Village Distribution (`/api/villages`)

### 4.1 Village Comparison Dashboard
`GET /api/villages/comparison`
- **Allowed Roles**: `Administrator`, `Operating Staff`
- **Response**: Returns comparative breakdown across Village A, Village B, and Village C, including per-household allocation ($L/\text{household}$), storage tank reserve hours, delivered vs authorized volume, and operational statuses.

---

## 5. AI Leakage Intelligence (`/api/leaks`)

### 5.1 Mass-Balance Anomaly Engine
`GET /api/leaks`
- **Response**:
  ```json
  {
    "activeAlerts": [
      {
        "id": 1,
        "leak_code": "LEAK-C01",
        "village": "Village C",
        "suspected_location": "School Road, near Community Centre",
        "estimated_loss_lph": 1260.0,
        "anomaly_score": 88.5,
        "severity": "Critical",
        "classification": "Suspected Leak",
        "affected_households": 45,
        "status": "Active"
      }
    ],
    "massBalanceTelemetry": {
      "pumpOutletFlowM3h": 84.0,
      "branchSumFlowM3h": 82.7,
      "instantaneousMismatchM3h": 1.3,
      "instantaneousMismatchLph": 1300
    }
  }
  ```

### 5.2 Update Investigation Status
`PATCH /api/leaks/:id/status`
- **Body**:
  ```json
  {
    "status": "Under Investigation", // Active | Under Investigation | Repaired | False Positive
    "notes": "Acoustic leak correlator deployed at chainage 520m."
  }
  ```

---

## 6. Village Water Notice Board (`/api/notices`)

### 6.1 Get Notices (Role-Filtered)
`GET /api/notices`
- When accessed by a `Resident`, automatically filters to notices targeting their registered village or `All`.

### 6.2 Publish Public Notice
`POST /api/notices`
- `Administrator`: Published immediately to all village boards.
- `Operating Staff`: Submitted as `Pending Approval` for administrator sign-off.
- **Body**:
  ```json
  {
    "title": "Low Pressure Advisory due to Feeder Maintenance",
    "target_villages": ["Village B", "Village C"],
    "category": "Low water pressure",
    "priority": "Important",
    "description": "Pressure will be reduced between 2 PM and 4 PM.",
    "expected_restoration": "Today 04:30 PM"
  }
  ```

---

## 7. Resident Complaints & Grievance Desk (`/api/complaints`)

### 7.1 Register Complaint
`POST /api/complaints`
- **Body**:
  ```json
  {
    "category": "Leakage",
    "location": "House 42, School Road",
    "description": "Water leaking through cobblestones.",
    "resident_contact": "+91 98765 43210"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Water complaint registered successfully.",
    "complaintCode": "CMP-1043",
    "status": "Open"
  }
  ```

### 7.2 Track by Reference Code
`GET /api/complaints/track/CMP-1042`
- Returns step-by-step progress history:
  `Received → Assigned to Technician → Field Inspection → Resolved`

---

## 8. Real-Time WebSocket Telemetry (`/ws/telemetry`)
- Connect: `ws://localhost:4000/ws/telemetry`
- Server pushes updates every 3 seconds:
  ```json
  {
    "type": "TELEMETRY_UPDATE",
    "timestamp": "2026-11-08T15:00:00.000Z",
    "pump": {
      "status": "Running",
      "flowRate": 84.1,
      "pressure": 3.63,
      "current": 23.4,
      "power": 12.8,
      "motorTemp": 58.5
    },
    "branches": {
      "villageA": { "flow": 34.1, "pressure": 3.34 },
      "villageB": { "flow": 26.9, "pressure": 2.58 },
      "villageC": { "flow": 21.7, "pressure": 1.88 }
    },
    "tanks": {
      "Village A": 74.0,
      "Village B": 48.5,
      "Village C": 61.2
    }
  }
  ```
