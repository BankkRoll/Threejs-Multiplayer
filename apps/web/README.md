# FPS Three Game - Game Client

## Overview

Welcome to the Game Client, a real-time multiplayer server built with Colyseus for an intense FPS experience.

The server manages matchmaking, game rooms, player synchronization, and authentication for a fast-paced, team-based shooter where two teams (Red and Blue) compete to reach a target score or outlast the match duration.

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
