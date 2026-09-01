# Living Product + Technical Specification

**Last Updated:** 2026-09-01 (initial version)

## Goal
Deliver a basic real-time chat application that supports real-time messaging for up to hundreds of concurrent users. Messages are stored in-memory (lost on restart). The app must be built exclusively with Node.js, Express, and Socket.IO.

## Users
- End users who join chat rooms and exchange messages in real time.
- No authentication or user management required for this basic version.

## Features
- Real-time messaging (send and receive messages instantly via WebSockets).
- Multiple chat rooms (default "general" room; users can join others by name).
- Display of connected users count per room.
- Simple web UI for sending/receiving messages and joining rooms.
- In-memory message history per room (last 100 messages retained).

## Workflows
1. User loads the web page, enters a username and optional room name, and joins.
2. User sends a message → broadcast to all users in the same room in real time.
3. New users see recent message history upon joining a room.
4. Users see live count of participants in their current room.
5. On disconnect, the user count updates for others.

## Data Model
- **Message**: `{ id: string, username: string, text: string, timestamp: Date, room: string }`
- **Room**: In-memory map with key = room name, value = array of up to 100 recent Messages + Set of connected socket IDs.
- No persistence (data lost on server restart).

## Business Rules
- Messages are broadcast only to users in the same room.
- Username must be provided and non-empty.
- Room names are trimmed and default to "general".
- Maximum 100 messages retained per room (oldest dropped on overflow).
- No profanity filtering or moderation in this basic version.

## Constraints
- In-memory storage only (no database, no files).
- Node.js with Express + Socket.IO only.
- Support hundreds of concurrent users (Socket.IO handles this efficiently; no custom scaling required).
- No authentication, no private rooms, no file uploads, no emojis beyond basic text.

## Non-Functional Requirements
- Real-time latency < 500ms under hundreds of users.
- Simple, responsive HTML/CSS/JS frontend served statically.
- Server must bind to 0.0.0.0 for sandbox preview compatibility.
- Clean console logging for connections, messages, and disconnections.
- No external dependencies beyond Express and Socket.IO.

## Edge Cases
- User joins with empty username → reject with error message.
- Rapid message sending (rate limiting not enforced in basic version).
- Server restart → all history and users lost (as specified).
- Many users joining/leaving simultaneously → correct live user count.
- Long messages or special characters → handled as plain text.
- Disconnection during active chat → others see updated count immediately.

## Acceptance Criteria
- [ ] Server starts on port 3000 and serves the chat UI.
- [ ] Real-time messaging works: message sent by one client appears instantly on others in same room.
- [ ] Joining a room shows last 100 messages.
- [ ] Live user count updates correctly on join/leave.
- [ ] In-memory storage behaves as described (verified via multiple clients).
- [ ] App supports at least 10 concurrent simulated users without error (scalable to hundreds).
- [ ] No TODOs, stubs, or placeholder logic remain.
- [ ] `npm start` launches a working server; UI is fully interactive.

## Non-Goals
- Persistent storage (Redis, MongoDB, files, etc.).
- User authentication or authorization.
- Private/direct messages.
- Message editing, deletion, reactions, or threading.
- Admin features, moderation, or rate limiting.
- Mobile-native app or advanced UI/UX (basic responsive web UI suffices).
- Production deployment, Docker, CI/CD, or scaling beyond single Node process.

**Intent Lock** (schema v1):
- task_id: T32652e8f
- user_goal: create a basic chat application with real-time messaging using Node.js + Express/Socket.IO and in-memory storage
- accepted_constraints: ["in-memory only", "Node.js/Express/Socket.IO only", "hundreds concurrent users", "data lost on restart"]
- non_goals: ["persistence", "auth", "private messaging", "moderation"]
- acceptance_criteria: ["real-time broadcast works", "history shown on join", "live user count", "npm start works"]
- assumptions: ["simple rooms suffice", "no rate limiting needed for basic version", "Socket.IO scales to hundreds on single process"]
- files_expected_to_change: ["package.json", "server.js", "public/index.html", "public/script.js", "public/styles.css"]
- created_at: 2026-09-01T08:00:00Z
- invalidated_by_event_id: null

This spec is the source of truth (after latest_user_input). It will be updated if behavior changes during implementation.