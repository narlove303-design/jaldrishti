# JalDrishti – Hardware Integration & Simulation Roadmap

## 1. Features Currently Operating in Demonstration Mode

| System Component | Demonstration Behavior | Safety / Operational Rationale |
| :--- | :--- | :--- |
| **Central Pump & VFD Starter** | Software simulation of 415V, 23A, 12.8kW, and 3.6 bar pressure. | **Zero Hardware Risk**: Never sends electrical impulses to real contactors or switchgear during evaluation. |
| **Physical Sensor Telemetry** | Mathematical dynamic model generating physical stochastic variations ($\pm 0.3\%$). | Allows complete offline evaluation and demonstration without physical flow loops. |
| **AI Leakage Anomaly Detection** | Rule-based mass-balance and hydraulic gradient comparison ($Q_{\text{pump}} - \sum Q_{\text{village}}$). | Transparent engineering logic without claiming fabricated black-box ML model accuracy. |
| **SMS / Mobile OTP Verification** | Fixed simulated verification code: `123456`. | Avoids requiring paid external Twilio or telecom gateway credentials. |
| **Water Quality Testing** | Indicative chlorine, pH, and turbidity telemetry. | **Explicit disclaimer**: Does not certify potable safety without statutory laboratory pathogen culture tests. |

---

## 2. Hardware Integration Architecture (Production Deployment)

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
   Set `SIMULATION_MODE=false` in `.env` and provide `MQTT_BROKER_URL`. The backend will subscribe to `jaldrishti/station/+/telemetry` instead of running the mathematical timer.
2. **Deploy Edge Gateways**:
   Connect ESP32 / industrial PLCs using Modbus RTU over RS-485 to read holding registers for voltage, current, pressure, and frequency.
3. **SMS Gateway Activation**:
   Configure SMS provider API keys in backend environment variables to dispatch genuine cellular text messages for resident OTPs and emergency water interruption bulletins.
