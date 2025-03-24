/**
 * Game Room State Schema
 *
 * This file defines the schema for the game state that is synchronized
 * between the server and clients using Colyseus schema serialization.
 *
 * The schema is a hierarchical structure that represents the game state
 * and is automatically synchronized with connected clients.
 */

import { GameState, PlayerAnimation, Team } from "@workspace/shared";
import { MapSchema, Schema, type } from "@colyseus/schema";

/**
 * 3D Vector representation for positions and directions
 */
export class Vector3 extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") z = 0;
}

/**
 * Quaternion representation for rotations
 */
export class Quaternion extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") z = 0;
  @type("number") w = 1;
}

/**
 * Player statistics tracked during a match
 */
export class PlayerStats extends Schema {
  @type("number") kills = 0;
  @type("number") deaths = 0;
  @type("number") assists = 0;
  @type("number") shots = 0;
  @type("number") hits = 0;
  @type("number") accuracy = 0; // Store accuracy directly in the schema for synchronization

  /**
   * Calculate accuracy as a percentage
   * @returns Accuracy percentage (0-100)
   */
  getAccuracy(): number {
    if (this.shots === 0) return 0;
    return (this.hits / this.shots) * 100;
  }

  /**
   * Update the accuracy value based on current hits and shots
   */
  updateAccuracy(): void {
    this.accuracy = this.getAccuracy();
  }
}

/**
 * Player entity with position, rotation, team, and stats
 */
export class Player extends Schema {
  @type("string") id: string;
  @type("string") username = "Player";
  @type("string") team: Team = Team.SPECTATOR;
  @type(Vector3) position = new Vector3();
  @type(Quaternion) rotation = new Quaternion();
  @type("string") animation = PlayerAnimation.IDLE;
  @type("number") health = 100;
  @type("boolean") isAlive = true;
  @type("boolean") isReady = false;
  @type("number") loadingProgress = 0;
  @type(PlayerStats) stats = new PlayerStats();
  @type("number") respawnTime = 0;
  @type("boolean") connected = true;

  constructor(id: string, username = "Player") {
    super();
    this.id = id;
    this.username = username;
  }
}

/**
 * Projectile entity with position, direction, and owner information
 */
export class Projectile extends Schema {
  @type("string") id: string;
  @type(Vector3) position = new Vector3();
  @type(Vector3) direction = new Vector3();
  @type("string") color = "white";
  @type("string") ownerId: string;
  @type("string") ownerTeam: Team;
  @type("number") timestamp: number;
  @type("number") damage = 20; // Default damage value

  constructor(id: string, ownerId: string, ownerTeam: Team) {
    super();
    this.id = id;
    this.ownerId = ownerId;
    this.ownerTeam = ownerTeam;
    this.timestamp = Date.now();
  }
}

/**
 * Team score and player count tracking
 */
export class TeamScore extends Schema {
  @type("number") score = 0;
  @type("number") playerCount = 0;
}

/**
 * Main game room state containing all game entities and match information
 */
export class GameRoomState extends Schema {
  // Game state and timing
  @type("string") state: GameState = GameState.LOBBY;
  @type("number") matchDuration = 300; // 5 minutes in seconds
  @type("number") timeRemaining = 300;
  @type("number") countdownTime = 5; // 5 second countdown
  @type("string") matchId = "";
  @type("string") mode = "classic"; // Game mode (classic, ctf, etc.)

  // Game entities
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();

  // Team information
  @type(TeamScore) redTeam = new TeamScore();
  @type(TeamScore) blueTeam = new TeamScore();

  // Game configuration
  @type("number") maxPlayersPerTeam = 5;
  @type("boolean") matchmakingLocked = false;
}
