/**
 * 5v5 Team Deathmatch Game Server
 *
 * This is the main entry point for the Colyseus server that handles
 * matchmaking, team-based gameplay, and real-time multiplayer synchronization.
 */

import "dotenv/config";

import { Server, matchMaker } from "@colyseus/core";

import { GameRoom } from "./rooms/GameRoom.js";
import { LobbyRoom } from "./rooms/LobbyRoom.js";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { auth } from "./auth/auth.js";
import basicAuth from "express-basic-auth";
import cors from "cors";
import { createServer } from "http";
import express from "express";
import { monitor } from "@colyseus/monitor";

// Load environment variables
const port = Number(process.env.PORT || 3001);
const debug = process.env.DEBUG === "true";
const httpBaseUrl = process.env.SERVER_URL || `http://localhost:${port}`;
const wsBaseUrl = process.env.WS_SERVER_URL || `ws://localhost:${port}`;

// Create Express app
const app = express();

// Apply CORS middleware to allow cross-origin requests
app.use(cors());

// Add authentication middleware for user management
app.use("/auth", auth);

// Add password protection to the Colyseus Monitor
const basicAuthMiddleware = basicAuth({
  users: { admin: process.env.MONITOR_PASSWORD || "password" }, // Use env variable or default to "password"
  challenge: true, // Prompt for credentials if not provided
});

// Add Colyseus Monitor with all metadata columns and authentication
app.use(
  "/monitor",
  basicAuthMiddleware,
  monitor({
    columns: [
      "roomId", // Unique room identifier
      "name", // Room name (e.g., "game_room")
      "clients", // Total connected clients
      { metadata: "mode" }, // Game mode (e.g., "classic")
      { metadata: "gameState" }, // Current game state (e.g., "lobby", "playing")
      { metadata: "redTeamCount" }, // Number of players on red team
      { metadata: "blueTeamCount" }, // Number of players on blue team
      { metadata: "spectators" }, // Number of spectators
      { metadata: "redScore" }, // Red team score
      { metadata: "blueScore" }, // Blue team score
      { metadata: "readyPlayers" }, // Number of players ready (non-spectators)
      { metadata: "alivePlayers" }, // Number of alive players (non-spectators)
      { metadata: "totalPlayers" }, // Total players (including spectators)
      { metadata: "projectileCount" }, // Number of active projectiles
      { metadata: "timeRemaining" }, // Time remaining in the match (seconds)
      { metadata: "matchId" }, // Unique match identifier
      { metadata: "locked" }, // Room lock status (true/false)
      { metadata: "players" }, // Condensed player list (array of player objects)
      "elapsedTime", // Time since room creation
    ],
  }),
);

// Create HTTP server
const httpServer = createServer(app);

// Create a Colyseus server using the same HTTP server
const server = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
    pingInterval: 8000,
  }),
  devMode: process.env.NODE_ENV !== "production",
});

// Register the game rooms
server.define("lobby", LobbyRoom).enableRealtimeListing();
server.define("game_room", GameRoom).filterBy(["mode"]).enableRealtimeListing();

// Add basic health check endpoint
app.get("/health", async (req, res) => {
  const rooms = await matchMaker.query(); // Fetch room data
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    rooms: {
      count: rooms.length,
      lobby: rooms.filter((room) => room.name === "lobby").length,
      game: rooms.filter((room) => room.name === "game_room").length,
    },
  });
});

// Start the server using the shared HTTP server
httpServer.listen(port, () => {
  console.log(`🚀 Server running on ${httpBaseUrl} (WebSocket: ${wsBaseUrl})`);
  console.log(`🎮 Colyseus monitor available at ${httpBaseUrl}/monitor`);
  console.log(`🔐 Auth endpoints available at ${httpBaseUrl}/auth`);
  if (debug) console.log(`🐛 Debug mode enabled`);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");

  server
    .gracefullyShutdown()
    .then(() => {
      console.log("Colyseus server shut down successfully");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error during shutdown:", err);
      process.exit(1);
    });
});
