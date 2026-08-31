# Delivery Agent Chat System v2

## Goal
Real-time chat and tracking platform for delivery agents and customers. Supports live location updates, ETA calculation (Haversine + speed model), Socket.io messaging, and push-style notifications.

## Users
- **Customers**: View agent location on map, chat in real-time, receive ETA/notifications.
- **Agents**: Update location, receive customer messages, see live ETA.

## Features
- Real-time agent location tracking (click map to simulate).
- Dynamic ETA calculation (distance-based, ~40km/h model).
- Bidirectional chat via Socket.io.
- In-app notifications for new messages/updates.
- Responsive map (Leaflet) + clean sidebar UI.
- REST endpoints for location and health.

## Workflows
1. Customer opens app → joins via Socket.
2. Agent updates location (POST or Socket) → ETA recalculated and broadcast.
3. Customer clicks map or sends message → updates reflected instantly.
4. Notifications auto-dismiss after 8s.

## Data Model
- Agent: `{ agentId, location: {latitude, longitude}, status, eta, destination, updated }`
- Message: `{ from, to, message, timestamp, agentId }`

## Non-Functional
- Low-latency real-time (<500ms updates).
- No external API keys required (uses open OSM tiles).
- Runs on Node 18+.

## Acceptance Criteria
- [x] Backend serves on :5000 with /health and location endpoints.
- [x] Frontend builds and runs with interactive map + chat.
- [x] Location updates propagate in <2s.
- [x] ETA updates on movement.
- [x] Chat and notifications functional.

## How to Run
```bash
npm install
npm run install-all
npm start          # starts backend on 5000
# In another terminal:
npm run client     # starts React on 3000
```

**Live on GitHub**: pravallikachejerla/delivery-agent-chat-system-v2 (pushed from feature branch).

This is the living specification — updated with every behavior change.