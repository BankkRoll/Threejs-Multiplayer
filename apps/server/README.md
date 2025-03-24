# FPS Three Game - Game Server

Welcome to the Game Server, a real-time multiplayer server built with Colyseus for an intense FPS experience. This server manages matchmaking, game rooms, player synchronization, and authentication for a fast-paced, team-based shooter where two teams (Red and Blue) compete to reach a target score or outlast the match duration.

## Features

### Core Gameplay

- **Teams:** Red vs. Blue, with a maximum of 5 players per team.
- **Spectators:** Up to 10 additional spectators can watch any game.
- **Objective:** First team to 50 kills wins, or highest score after 5 minutes.
- **Respawn:** Players respawn after 5 seconds upon death.
- **Projectiles:** Shots have a 10-second lifetime and deal 20 damage by default.
- **Game States:** Lobby → Loading → Countdown → Playing → Ended → Lobby (reset).

### Server Components

- **`src/index.ts`**: Main entry point, sets up the Colyseus server, Express app, and monitor panel.
- **`src/rooms/GameRoom.ts`**: Core game logic for 5v5 matches, including player management, physics, and win conditions.
- **`src/rooms/LobbyRoom.ts`**: Matchmaking hub for players to join or create game rooms.
- **`src/auth/auth.ts`**: User authentication and profile management (in-memory for now).
- **`src/schema/GameRoomState.ts`**: Synchronized game state schema for players, projectiles, and teams.
- **`src/db/database.ts`**: In-memory database interface (placeholder for future persistence).

### Monitor Panel

- **Access:** `http://localhost:3001/monitor` (password-protected with "admin" and `MONITOR_PASSWORD`).
- **Columns:**
  - `roomId`, `name`, `clients`: Basic room info.
  - `mode`, `gameState`: Game mode and current state.
  - `redTeamCount`, `blueTeamCount`, `spectators`: Player counts.
  - `redScore`, `blueScore`: Team scores.
  - `readyPlayers`, `alivePlayers`, `totalPlayers`: Player status.
  - `projectileCount`, `timeRemaining`, `matchId`, `locked`: Game details.
  - `players`: List of players with usernames, teams, kills, and deaths.
  - `elapsedTime`: Room uptime.

## Authentication

### Endpoints

- `POST /auth/register`: Create a new user.
- `POST /auth/login`: Log in and get a token.
- `GET /auth/profile/:userId`: Fetch user profile.
- `POST /auth/stats/update`: Update stats after a match.
- `GET /auth/leaderboard`: Get top players by K/D ratio or other metrics.

## Prerequisites

- **Node.js:** v16+ (LTS recommended).
- **pnpm:** v8+ (comes with Node.js).
- **TypeScript:** Installed globally or locally via pnpm.

## Installation

### Clone the Repository

```bash
git clone https://github.com/BankkRoll/Threejs-Multiplayer.git
cd Threejs-Multiplayer
```

### Install Dependencies

```bash
pnpm install
```

### Set Up Environment Variables

Create a `.env` file in the root directory:

```
# Development (default)
WS_SERVER_URL=ws://localhost:3001
SERVER_URL=http://localhost:3001  # For HTTP endpoints like /auth
PORT=3001
DEBUG=true
MONITOR_PASSWORD=secret
NODE_ENV=development

# Production Example (uncomment and adjust when deploying)
# WS_SERVER_URL=wss://mygame.com
# SERVER_URL=https://mygame.com
# PORT=443
```

### Build the Project

```bash
pnpm run build
```

### Run the Server

#### Development (with hot-reloading)

```bash
pnpm run dev
```

#### Production

```bash
pnpm start
```

## Client Integration

### Authentication

#### Register a User

```javascript
fetch("http://localhost:3001/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "Player1", password: "mypassword" }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log(data); // { userId, username, token }
  });
```

#### Log In

```javascript
fetch("http://localhost:3001/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "Player1", password: "mypassword" }),
})
  .then((res) => res.json())
  .then((data) => {
    console.log(data); // { userId, username, token }
    localStorage.setItem("token", data.token); // Store token
  });
```

### Game Actions (Examples)

#### Move Player

```javascript
gameRoom.send("player:move", {
  position: { x: 10, y: 1, z: 5 },
  rotation: { x: 0, y: 0.5, z: 0 },
  animation: "RUNNING",
});
```

#### Shoot Projectile

```javascript
gameRoom.send("projectile:create", {
  position: { x: 10, y: 1, z: 5 },
  direction: { x: 1, y: 0, z: 0 },
  color: "#ff0000",
});
```

#### Chat

```javascript
gameRoom.send("chat", "Let's win this!");
gameRoom.onMessage("chat", (msg) => {
  console.log(`${msg.sender} (${msg.team}): ${msg.message}`);
});
```
