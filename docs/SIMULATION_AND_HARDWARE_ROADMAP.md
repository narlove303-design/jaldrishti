# JalDrishti – Engineering Simulation & Hardware Integration Roadmap
**Fluid Mechanics Formulation, Mathematical SCADA Engine & IoT Deployment Architecture**
*Version 1.1.0*

---

## 1. Mathematical Simulation Formulation

The JalDrishti simulation engine replaces arbitrary random jitter with exact first-principles fluid mechanics, electrical engineering equations, and mass conservation laws.

### 1.1 Fluid Properties & Physical Constants
All internal calculations are conducted in standard SI units:
- **Water Density**: $\rho = 1000.0\text{ kg/m}^3$
- **Gravitational Acceleration**: $g = 9.81\text{ m/s}^2$
- **Dynamic Viscosity ($\mu$)**: $1.002 \times 10^{-3}\text{ Pa}\cdot\text{s}$ (at 20°C)
- **Pressure Conversion**: $1\text{ bar} = 100,000\text{ Pa} \implies \Delta P\text{ (bar)} = \frac{\rho g h_f}{10^5}$

---

### 1.2 Pipeline Friction & Head Loss (Darcy-Weisbach)

Head loss $h_f$ (in meters of water head) across any pipe segment of length $L$ and internal diameter $D$ is governed by:

$$h_f = f \cdot \frac{L}{D} \cdot \frac{v^2}{2g}$$

Where flow velocity $v$ (in $\text{m/s}$) for volumetric flow rate $Q$ (in $\text{m}^3/\text{s}$) is:

$$v = \frac{4Q}{\pi D^2}$$

#### Reynolds Number & Flow Regimes:
$$Re = \frac{\rho v D}{\mu}$$

- **Laminar Flow ($Re < 2300$)**:
  $$f = \frac{64}{Re}$$
- **Turbulent Flow ($Re \ge 2300$)**: Evaluated using the **Swamee-Jain explicit formulation** of the implicit Colebrook-White equation:
  $$f = \frac{0.25}{\left[\log_{10}\left(\frac{\varepsilon}{3.7 D} + \frac{5.74}{Re^{0.9}}\right)\right]^2}$$
  Where $\varepsilon$ is the absolute hydraulic pipe roughness.

#### Network Geometry & Roughness Specifications:
| Pipeline Segment | Tag | Length ($L$) | Diameter ($D$) | Material | Roughness ($\varepsilon$) | Nominal Velocity ($v$) | Head Loss ($h_f$) | $\Delta P$ (bar) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Feeder Main** | `MAIN-01` | $450\text{ m}$ | $200\text{ mm}$ ($0.20\text{ m}$) | Ductile Iron | $0.025\text{ mm}$ | $0.74\text{ m/s}$ | $1.10\text{ m}$ | $0.11\text{ bar}$ |
| **Branch A** | `PIPE-A01` | $780\text{ m}$ | $160\text{ mm}$ ($0.16\text{ m}$) | HDPE PE100 | $0.0015\text{ mm}$ | $0.47\text{ m/s}$ | $1.05\text{ m}$ | $0.10\text{ bar}$ |
| **Branch B** | `PIPE-B01` | $610\text{ m}$ | $110\text{ mm}$ ($0.11\text{ m}$) | uPVC Class 4 | $0.0015\text{ mm}$ | $0.79\text{ m/s}$ | $3.23\text{ m}$ | $0.32\text{ bar}$ |
| **Branch C** | `PIPE-C01` | $850\text{ m}$ | $110\text{ mm}$ ($0.11\text{ m}$) | HDPE PE100 | $0.0015\text{ mm}$ | $0.63\text{ m/s}$ | $3.07\text{ m}$ | $0.30\text{ bar}$ |

---

### 1.3 Centrifugal Pump Hydraulics & Electrical Consumption

#### Total Dynamic Head ($H$):
$$H = \frac{P_{\text{discharge}} - P_{\text{suction}}}{\rho g}$$

#### Hydraulic Power ($P_{\text{hyd}}$):
$$P_{\text{hyd}} = \rho g Q H = (P_{\text{discharge}} - P_{\text{suction}}) \cdot Q$$

#### Electrical Shaft Power ($P_{\text{elec}}$):
$$P_{\text{elec}} = \frac{P_{\text{hyd}}}{\eta_{\text{pump}} \cdot \eta_{\text{motor}}}$$
- $\eta_{\text{pump}} \approx 0.76$ (centrifugal pump hydraulic efficiency)
- $\eta_{\text{motor}} = 0.91$ (IE3 premium efficiency induction motor)

#### 3-Phase Line Current ($I$):
$$I = \frac{P_{\text{elec}}}{\sqrt{3} \cdot V_{\text{line}} \cdot \cos\phi}$$
Where $V_{\text{line}} = 415\text{ V}$ and operating power factor $\cos\phi = 0.86$.

#### Motor Thermal Model (Joule Heating vs Newton Cooling):
$$\frac{dT}{dt} = k_{\text{heat}} \left(\frac{I}{I_{\text{rated}}}\right)^2 - k_{\text{cool}} (T_{\text{motor}} - T_{\text{ambient}})$$
- $I_{\text{rated}} = 34.0\text{ A}$
- $T_{\text{ambient}} = 28.0^\circ\text{C}$

---

### 1.4 Elevated Storage Tank Mass Balance

Each village reservoir level is updated by integrating mass conservation over simulation time step $\Delta t$:

$$\frac{dV}{dt} = Q_{\text{in}} - Q_{\text{out}}$$

$$\Delta V = (Q_{\text{in}} - Q_{\text{out}}) \cdot \frac{\Delta t}{3600} \cdot 1000\text{ (Liters)}$$

$$V(t + \Delta t) = \max\left(0, \min(V_{\text{capacity}}, V(t) + \Delta V)\right)$$

$$\text{Tank Level (\%)} = \left(\frac{V(t + \Delta t)}{V_{\text{capacity}}}\right) \times 100$$

$$\text{Water Height } h = h_{\text{max}} \cdot \left(\frac{V(t + \Delta t)}{V_{\text{capacity}}}\right)$$

---

### 1.5 Mass-Balance Leakage Detection & Anomaly Model

#### Instantaneous Inflow vs Delivered Outflow Discrepancy:
$$\Delta Q_{\text{loss}} = \max\left(0, Q_{\text{pump}} - \sum_{i \in \{A, B, C\}} Q_{\text{village\_i}}\right)$$

$$\text{Water Loss (L/h)} = \Delta Q_{\text{loss}} \times 1000$$

$$\text{Water Loss (\%)} = \left(\frac{\Delta Q_{\text{loss}}}{Q_{\text{pump}}}\right) \times 100$$

#### Pressure Gradient Deficit:
$$\Delta P_{\text{deficit}} = \max(0, P_{\text{expected}} - P_{\text{observed}})$$

#### Unified Anomaly Severity Thresholds:
- **Normal**: Loss $< 3\%$ ($< 250\text{ L/h}$) and $\Delta P_{\text{deficit}} < 0.3\text{ bar}$.
- **Warning**: Loss between $3\% - 10\%$ ($250 - 800\text{ L/h}$).
- **Critical**: Loss $> 10\%$ ($> 800\text{ L/h}$) or localized pressure collapse $\Delta P_{\text{deficit}} > 1.0\text{ bar}$. Automatically updates active leakage alerts and creates municipal maintenance work orders.

---

## 2. Transition from Simulation to Physical Hardware Deployment

```
[Physical Water Assets]
   ├── Kirloskar 18.5 kW Centrifugal Pump Station (P-01)
   │     └── Danfoss VLT Aqua Drive FC 202 (RS-485 Modbus RTU)
   ├── Main Distribution Junction (J-01)
   │     ├── Krohne Optisonic Ultrasonic Flow Meter (4-20mA / Modbus)
   │     └── WIKA A-10 Pressure Transducer (0-10 bar, 4-20mA)
   └── Three Elevated Village Tanks (A, B, C)
         ├── Ultrasonic Liquid Level Transmitters (EchoTREK 0-6m)
         └── Endress+Hauser Liquiline Water Quality Nodes (Free Chlorine, pH, Turbidity)
                     │
                     ▼
[Industrial IoT Edge Gateways (Advantech / ESP32-WROOM-32 / Raspberry Pi CM4)]
   ├── Protocol Conversion: Modbus RTU/TCP & Analog 4-20mA -> MQTT over TLS
   ├── Local Safety Interlocks: Dry-run trip < 0.2 bar suction pressure
   └── Cellular Fallback (4G LTE / LoRaWAN)
                     │
                     ▼ (MQTT Broker: Mosquitto / AWS IoT Core)
[JalDrishti Node.js / FastAPI Backend Telemetry Ingestion Layer]
   ├── MQTT Client Bridge -> Database Time-Series Ingestion
   ├── Mass-Balance Anomaly Engine Execution
   └── WebSocket Real-Time Dashboard Broadcasting
```

### Steps to Connect Physical Hardware:
1. **Configure MQTT Ingestion Bridge**:
   Set `SIMULATION_MODE=false` in `.env` and configure `MQTT_BROKER_URL`. The backend subscribes to `jaldrishti/station/+/telemetry`.
2. **Deploy Edge Gateways**:
   Connect ESP32 / industrial PLCs using Modbus RTU over RS-485 to read holding registers for voltage, current, pressure, and frequency.
3. **SMS Gateway Activation**:
   Configure SMS provider API credentials in backend environment variables to dispatch genuine cellular text messages for resident OTPs and emergency water interruption bulletins.
