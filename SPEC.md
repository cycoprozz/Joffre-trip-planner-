# DriverPay Log - Product Requirements

## Project Overview
- **Name**: DriverPay Log
- **Type**: Mobile-first web app for driver payroll tracking
- **Core Functionality**: Document rides, track hours, auto-calculate pay with transparent breakdown
- **Target Users**: Professional chauffeurs/drivers with variable pay rates

## Pay Rules (Defaults - Configurable)
| Trip Type | Service Area | Rate |
|-----------|--------------|------|
| Point-to-Point | Atlanta (in perimeter) | $25 flat |
| Point-to-Point | Outside Atlanta | $38 flat |
| Directed/Hourly | N/A | $20/hour |
| Out-of-town Daily | N/A | $300/day |

## Data Model

### Trip
```
- id: UUID (primary key)
- user_id: UUID (foreign key)
- date: DATE
- trip_type: ENUM(POINT_TO_POINT, DIRECTED_HOURLY, OUT_OF_TOWN_DAILY)
- service_area: ENUM(ATLANTA_IN_PERIMETER, OUTSIDE_PERIMETER) [P2P only]
- pickup:
  - pickup_datetime: DATETIME (required)
  - pickup_location_name: STRING (optional)
  - pickup_address_line1: STRING
  - pickup_city: STRING
  - pickup_state: STRING
  - pickup_zip: STRING
  - pickup_lat: DECIMAL (optional)
  - pickup_lng: DECIMAL (optional)
- dropoff:
  - dropoff_datetime: DATETIME (optional)
  - dropoff_location_name: STRING (optional)
  - dropoff_address_line1: STRING (optional)
  - dropoff_city: STRING (optional)
  - dropoff_state: STRING (optional)
  - dropoff_zip: STRING (optional)
  - dropoff_lat: DECIMAL (optional)
  - dropoff_lng: DECIMAL (optional)
- hourly_tracking:
  - start_time: DATETIME
  - end_time: DATETIME (optional)
  - break_minutes: INTEGER (default 0)
  - computed_minutes: INTEGER (auto)
  - computed_hours: DECIMAL (auto)
  - rounding_rule: ENUM(EXACT, NEAREST_15_MIN, UP_TO_15_MIN)
- out_of_town:
  - out_of_town_location: STRING
  - day_count: INTEGER (default 1)
- admin:
  - client_name: STRING (optional)
  - dispatcher_source: STRING (optional)
  - confirmation_number: STRING (optional)
  - vehicle: STRING (optional)
  - notes: TEXT (optional)
- status: ENUM(SCHEDULED, COMPLETED, CANCELED, NO_SHOW)
- pay:
  - base_rate: DECIMAL (auto)
  - computed_pay: DECIMAL (auto)
  - adjustments_amount: DECIMAL (default 0)
  - final_pay: DECIMAL (auto)
  - pay_breakdown_json: JSONB
- metadata:
  - is_imported: BOOLEAN (default false)
  - created_at: DATETIME
  - updated_at: DATETIME
  - edited_at: DATETIME
```

### Settings
```
- user_id: UUID (primary key)
- rates:
  - p2p_atlanta_rate: DECIMAL (default 25)
  - p2p_outside_rate: DECIMAL (default 38)
  - hourly_rate: DECIMAL (default 20)
  - out_of_town_daily_rate: DECIMAL (default 300)
- rounding_default: ENUM(EXACT, NEAREST_15_MIN, UP_TO_15_MIN)
- privacy_mode: BOOLEAN (default false)
- created_at: DATETIME
- updated_at: DATETIME
```

### AuditLog
```
- id: UUID (primary key)
- trip_id: UUID (foreign key)
- user_id: UUID (foreign key)
- field_changed: STRING
- old_value: TEXT
- new_value: TEXT
- changed_at: DATETIME
```

### User
```
- id: UUID (primary key)
- email: STRING (unique)
- password_hash: STRING
- name: STRING
- created_at: DATETIME
- updated_at: DATETIME
```

## UI Screens (Mobile-First)

### 1. Login/Signup
- Email + password auth
- Clean, minimal form

### 2. Home Dashboard
- Today's total $ and hours
- Quick action buttons (one-tap):
  - "New P2P Atlanta"
  - "New P2P Outside"
  - "Start Hourly"
  - "New Out-of-town Day"
- Recent trips list (last 5)

### 3. New Trip (Fast Entry)
- Trip type selector (big buttons)
- Pickup: date/time picker + address fields
- Dropoff: optional for P2P
- Save in <15 seconds

### 4. Hourly Timer
- Start/Pause/Resume/End
- Break minutes input
- Live estimated pay display

### 5. Trip Detail
- All fields display
- Pay breakdown ("how calculated")
- Attachments upload
- Edit history

### 6. Reports
- Daily/Weekly/Monthly tabs
- Totals: gross, adjustments, final
- Breakdown by trip type
- Hours summary

### 7. Export
- CSV: date range selection
- PDF: pay report with totals

### 8. Settings
- Rate configuration
- Rounding behavior
- Privacy mode toggle

## Pay Engine

```typescript
computePay(trip, settings) → {
  base_rate: number,
  computed_pay: number,
  final_pay: number,
  pay_breakdown: {
    rule_used: string,
    calculation: string,
    input_values: object
  }
}
```

Rules:
1. P2P Atlanta: $25
2. P2P Outside: $38
3. Hourly: (end - start - break) → round → rate × hours
4. Out-of-town: rate × day_count
5. final = computed + adjustments

Edge Cases:
- Missing end_time → "in progress"
- Negative duration → block with error
- day_count < 1 → block with error

## CSV Import Format
Columns: pickup_datetime, pickup_address, dropoff_datetime, dropoff_address, trip_type, client_name, notes, confirmation_number
