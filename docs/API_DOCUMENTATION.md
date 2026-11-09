# JalDrishti – REST & WebSocket API Documentation
**Smart Multi-Village Water Intelligence & Management System**
*Version 1.1.0 – Production-Hardened SCADA Specification*

---

## 1. Architecture & Protocol Overview
- **Base URL**: `http://localhost:4000/api`
- **Real-Time Telemetry Stream**: `ws://localhost:4000/ws/telemetry?token=<JWT>`
- **Authentication**: Bearer Token in `Authorization: Bearer <JWT>` header
- **CORS Whitelist**: Controlled via `ALLOWED_ORIGINS` environment variable
- **Rate Limiting**: Sliding-window rate limiter per IP with headers:
  - `X-RateLimit-Limit`: Maximum requests permitted in window
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `Retry-After`: Seconds to wait when rate limited (HTTP 429)
- **Role Enforcement (RBAC)**:
  - `Administrator`: Full access to all villages, user directory, audit trails, and policy publishing.
  - `Operating Staff`: Supervisory monitoring, safe simulated equipment controls, maintenance work orders, alarms, and incident draft submissions.
  - `Resident`: Strictly isolated to resident portal endpoints, village water schedules, notice boards, and complaint tracking. Any attempt to reach admin or operator routes returns `403 Forbidden` and logs a security audit violation.

---

## 2. Authentication Endpoints (`/api/auth`)

### 2.1 User Login
`POST /api/auth/login`
- **Rate Limit**: 30 requests per 15 minutes per IP
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
- **Rate Limit**: 15 requests per 10 minutes per IP
- **Body**:
  ```json
  {
    "name": "Harpreet Kaur",
    "email_or_mobile": "harpreet@demo.local",
    "password": "StrongPassword2026!",
    "village": "Village A"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Cryptographically generated OTP dispatched for resident registration.",
    "contact": "harpreet@demo.local",
    "simulatedOtp": "834192",
    "expiresInMinutes": 10
  }
  ```

### 2.3 Cryptographic OTP Verification (Step 2)
`POST /api/auth/otp/verify`
- **Rate Limit**: Max 5 attempts per OTP code
- **Body**:
  ```json
  {
    "email_or_mobile": "harpreet@demo.local",
    "otp": "834192"
  }
  ```
- **Response (200 OK)**: Account activated and signed JWT token issued.

### 2.4 Password Reset Request (Step 1)
`POST /api/auth/forgot-password`
- **Body**:
  ```json
  {
    "email_or_mobile": "resident@demo.local"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Password recovery OTP issued.",
    "contact": "resident@demo.local",
    "simulatedOtp": "592814",
    "expiresInMinutes": 10
  }
  ```

### 2.5 Password Reset Confirmation (Step 2)
`POST /api/auth/reset-password`
- **Body**:
  ```json
  {
    "email_or_mobile": "resident@demo.local",
    "otp": "592814",
    "new_password": "NewSecurePassword2026!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Password reset successfully. You may now sign in with your new credentials."
  }
  ```

---

## 3. Central Main Pump Station (`/api/pump`)

### 3.1 Get Pump Telemetry
`GET /api/pump`
- **Allowed Roles**: `Administrator`, `Operating Staff` (Blocked for `Resident` with 403)
- **Response (200 OK)**:
  ```json
  {
    "pump": {
      "id": 1,
      "name": "Central Main Pump Station (P-01)",
      "status": "Running",
      "voltage_v": 415.0,
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
    "command": "START",
    "frequency_hz": 48.5,
    "confirmation_override": true
  }
  ```
- **Allowed Commands**: `START`, `STOP`, `SET_FREQUENCY`, `RESET_INTERLOCKS`

---

## 4. AI Leakage Intelligence (`/api/leaks`)

### 4.1 Get Leakage Alerts & Mass Balance
`GET /api/leaks`
- **Allowed Roles**: `Administrator`, `Operating Staff`
- **Response (200 OK)**:
  ```json
  {
    "activeAlerts": [
      {
        "id": 1,
        "leak_code": "LEAK-C01",
        "village": "Village C",
        "suspected_location": "School Road, near Community Centre (Chainage 520m)",
        "pipeline_id": "PIPE-C01",
        "estimated_loss_lph": 1260.0,
        "anomaly_score": 88.5,
        "severity": "Critical",
        "classification": "Suspected Leak",
        "status": "Active"
      }
    ],
    "massBalanceTelemetry": {
      "pumpOutletFlowM3h": 84.0,
      "branchSumFlowM3h": 82.7,
      "instantaneousMismatchM3h": 1.3,
      "instantaneousMismatchLph": 1300,
      "methodology": "Transparent Rule-Based Mass-Balance & Hydraulic Gradient Analysis"
    }
  }
  ```

---

## 5. Water Balance & System Analytics (`/api/analytics`)

### 5.1 IWA Water Balance Calculations
`GET /api/analytics/water-balance?period=daily`
- **Parameters**: `period` (`daily`, `weekly`, `monthly`)
- **Allowed Roles**: `Administrator`, `Operating Staff`
- **Computations**: Aggregated dynamically from actual historical SCADA rows in `telemetry_history`.

### 5.2 Telemetry CSV Export
`GET /api/analytics/export-csv?period=daily`
- **Response**: RFC 4180 CSV attachment formatted for Excel and GIS import.

---

## 6. Real-Time Telemetry WebSocket Stream

- **URL**: `ws://localhost:4000/ws/telemetry?token=<JWT>`
- **In-band Authentication**:
  ```json
  { "type": "AUTH", "token": "<JWT>" }
  ```
- **Control Security Interlock**:
  Any client sending `{ "type": "PUMP_CONTROL", "command": "START" }` must possess verified `Administrator` or `Operating Staff` role. Residents and unauthenticated clients receive `{ "type": "ERROR", "error": "Forbidden..." }` and a security event is recorded in the audit trail.
- **Broadcast Payload**: Emits physical telemetry every 3 seconds including pump hydraulics, Darcy-Weisbach branch pressures, tank levels, and mass-balance anomaly severity.
