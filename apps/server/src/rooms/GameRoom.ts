/**
 * Game Room Implementation
 *
 * This file contains the core game logic for the 5v5 team deathmatch game.
 * It handles player connections, game state transitions, projectile physics,
 * hit detection, scoring, and match flow.
 */

import { GameRoomState, Player, Projectile } from "../schema/GameRoomState.js";
import {
  GameState,
  type MatchResult,
  PlayerAnimation,
  type PlayerInput,
  type ProjectileInput,
  type ReadyStatus,
  Team,
} from "@workspace/shared";

import type { Client } from "@colyseus/core";
import { Room } from "@colyseus/core";
import { v4 as uuidv4 } from "uuid";

// Debug mode flag for verbose logging
const DEBUG = process.env.DEBUG === "true";

/**
 * Player authentication information
 */
interface PlayerAuth {
  userId: string;
  username: string;
}

/**
 * Main game room implementation for 5v5 team deathmatch
 */
export class GameRoom extends Room<GameRoomState> {
  // Counter for generating unique projectile IDs
  private projectileIdCounter = 0;

  // Game configuration constants
  private readonly PROJECTILE_LIFETIME_MS = 10000; // 10 seconds
  private readonly RESPAWN_TIME_SECONDS = 5;
  private readonly MATCH_DURATION_SECONDS = 300; // 5 minutes
  private readonly POINTS_PER_KILL = 1;
  private maxScore = 50; // First team to 50 kills wins (not readonly to allow configuration)
  private readonly MAX_PLAYERS_PER_TEAM = 5;

  // Timers and intervals
  private gameLoopInterval: NodeJS.Timeout | null = null;
  private countdownInterval: NodeJS.Timeout | null = null;

  // Player authentication mapping
  private userProfiles: Map<string, PlayerAuth> = new Map();

  // Performance metrics
  private lastUpdateTime = Date.now();
  private updateTimes: number[] = [];

  /**
   * Called when the room is created
   * Initializes the game state and sets up message handlers
   */
  onCreate(options?: any) {
    // Initialize room state
    this.setState(new GameRoomState());

    // Set up match details
    this.state.matchId = uuidv4();
    this.state.matchDuration = this.MATCH_DURATION_SECONDS;
    this.state.timeRemaining = this.MATCH_DURATION_SECONDS;
    this.state.maxPlayersPerTeam = this.MAX_PLAYERS_PER_TEAM;

    // Set maximum number of clients (players + spectators)
    this.maxClients = this.MAX_PLAYERS_PER_TEAM * 2 + 10; // 10 extra slots for spectators

    // Apply custom options if provided
    if (options) {
      if (options.matchDuration && typeof options.matchDuration === "number") {
        this.state.matchDuration = options.matchDuration;
        this.state.timeRemaining = options.matchDuration;
      }

      if (options.maxScore && typeof options.maxScore === "number") {
        this.maxScore = options.maxScore;
      }

      if (
        options.maxPlayersPerTeam &&
        typeof options.maxPlayersPerTeam === "number"
      ) {
        this.state.maxPlayersPerTeam = options.maxPlayersPerTeam;
      }

      if (options.mode && typeof options.mode === "string") {
        this.state.mode = options.mode;
      }
    }

    // Set metadata for room listing
    this.updateMetadata();

    // Set up message handlers
    this.setupMessageHandlers();

    // Set up simulation interval for game physics and logic (30fps)
    this.setSimulationInterval(
      (deltaTime) => this.gameSimulation(deltaTime),
      1000 / 30,
    );

    // Set patch rate for state synchronization (20fps)
    this.setPatchRate(1000 / 20);

    if (DEBUG) {
      console.log(
        `Game room created: ${this.roomId} with match ID: ${this.state.matchId}`,
      );
      console.log(`Game mode: ${this.state.mode}`);
    }
  }

  /**
   * Updates the room metadata with detailed game information
   */
  private updateMetadata() {
    const spectatorCount = Array.from(this.state.players.values()).filter(
      (player) => player.team === Team.SPECTATOR,
    ).length;

    const readyPlayers = Array.from(this.state.players.values()).filter(
      (player) => player.isReady && player.team !== Team.SPECTATOR,
    ).length;

    const alivePlayers = Array.from(this.state.players.values()).filter(
      (player) => player.isAlive && player.team !== Team.SPECTATOR,
    ).length;

    const playerList = Array.from(this.state.players.values()).map(
      (player) => ({
        id: player.id,
        username: player.username,
        team: player.team,
        kills: player.stats.kills,
        deaths: player.stats.deaths,
      }),
    );

    this.setMetadata({
      mode: this.state.mode, // Game mode (e.g., "classic")
      gameState: this.state.state, // Current game state (e.g., "lobby", "playing")
      redTeamCount: this.state.redTeam.playerCount, // Red team player count
      blueTeamCount: this.state.blueTeam.playerCount, // Blue team player count
      spectators: spectatorCount, // Number of spectators
      redScore: this.state.redTeam.score, // Red team score
      blueScore: this.state.blueTeam.score, // Blue team score
      readyPlayers: readyPlayers, // Number of players ready
      alivePlayers: alivePlayers, // Number of alive players
      totalPlayers: this.state.players.size, // Total players (including spectators)
      projectileCount: this.state.projectiles.size, // Number of active projectiles
      timeRemaining: this.state.timeRemaining, // Time left in the match
      matchId: this.state.matchId, // Unique match identifier
      locked: this.locked, // Room lock status
      players: playerList, // List of players with basic stats
    });
  }

  /**
   * Sets up all message handlers for client-server communication
   */
  private setupMessageHandlers() {
    // Player authentication and profile
    this.onMessage("auth", (client, message: PlayerAuth) => {
      try {
        this.handlePlayerAuth(client, message);
      } catch (error) {
        this.handleError(client, "auth", error);
      }
    });

    // Player ready status for loading screen
    this.onMessage("player:ready", (client, message: ReadyStatus) => {
      try {
        this.handlePlayerReady(client, message);
      } catch (error) {
        this.handleError(client, "player:ready", error);
      }
    });

    // Team selection
    this.onMessage("player:select-team", (client, { team }: { team: Team }) => {
      try {
        this.handleTeamSelection(client, team);
      } catch (error) {
        this.handleError(client, "player:select-team", error);
      }
    });

    // Player movement and rotation updates
    this.onMessage("player:move", (client, message: PlayerInput) => {
      try {
        this.handlePlayerMovement(client, message);
      } catch (error) {
        this.handleError(client, "player:move", error);
      }
    });

    // Projectile creation
    this.onMessage("projectile:create", (client, message: ProjectileInput) => {
      try {
        this.handleProjectileCreation(client, message);
      } catch (error) {
        this.handleError(client, "projectile:create", error);
      }
    });

    // Player hit detection (client-side reporting with server validation)
    this.onMessage(
      "player:hit",
      (
        client,
        { projectileId, targetId }: { projectileId: string; targetId: string },
      ) => {
        try {
          this.handlePlayerHit(client, projectileId, targetId);
        } catch (error) {
          this.handleError(client, "player:hit", error);
        }
      },
    );

    // Chat messages
    this.onMessage("chat", (client, message: string) => {
      try {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        // Sanitize message (basic)
        const sanitizedMessage = message.substring(0, 100).trim();
        if (!sanitizedMessage) return;

        // Broadcast to all clients
        this.broadcast(
          "chat",
          {
            sender: player.username,
            team: player.team,
            message: sanitizedMessage,
            timestamp: Date.now(),
          },
          {
            except: player.team === Team.SPECTATOR ? [] : undefined, // Spectator messages go to everyone
          },
        );
      } catch (error) {
        this.handleError(client, "chat", error);
      }
    });

    // Debug commands (only in debug mode)
    if (DEBUG) {
      this.onMessage("debug:state", (client) => {
        client.send("debug:state", {
          state: this.state.state,
          players: this.state.players.size,
          projectiles: this.state.projectiles.size,
          redTeam: {
            score: this.state.redTeam.score,
            players: this.state.redTeam.playerCount,
          },
          blueTeam: {
            score: this.state.blueTeam.score,
            players: this.state.blueTeam.playerCount,
          },
          timeRemaining: this.state.timeRemaining,
          performance: {
            averageUpdateTime: this.getAverageUpdateTime(),
            updateCount: this.updateTimes.length,
          },
        });
      });

      this.onMessage(
        "debug:force-state",
        (client, { state }: { state: GameState }) => {
          // Only allow admins to force state changes
          const profile = this.userProfiles.get(client.sessionId);
          if (profile && profile.userId === "admin") {
            this.state.state = state;
            console.log(`[DEBUG] Forced state change to ${state}`);

            // Handle special cases
            if (state === GameState.PLAYING) {
              this.startGame();
            } else if (state === GameState.ENDED) {
              this.endGame();
            }
          }
        },
      );
    }
  }

  /**
   * Centralized error handler for message processing
   */
  private handleError(client: Client, messageType: string, error: any) {
    console.error(
      `Error handling message ${messageType} from ${client.sessionId}:`,
      error,
    );

    // Send error to client
    client.send("error", {
      message: "An error occurred processing your request",
      type: messageType,
      details: DEBUG ? error.message : undefined,
    });
  }

  /**
   * Handles player authentication
   */
  private handlePlayerAuth(client: Client, auth: PlayerAuth) {
    if (!auth.userId || !auth.username) {
      throw new Error("Invalid authentication data");
    }

    // Store user profile info
    this.userProfiles.set(client.sessionId, auth);

    // Update player username if they're already in the game
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.username = auth.username;
    }

    // Send current game state to the client
    client.send("game:state", {
      state: this.state.state,
      timeRemaining: this.state.timeRemaining,
      redScore: this.state.redTeam.score,
      blueScore: this.state.blueTeam.score,
      mode: this.state.mode,
    });

    if (DEBUG) {
      console.log(`Player authenticated: ${auth.username} (${auth.userId})`);
    }
  }

  /**
   * Handles player ready status updates during loading phase
   */
  private handlePlayerReady(client: Client, status: ReadyStatus) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      throw new Error("Player not found");
    }

    player.isReady = status.ready;
    player.loadingProgress = status.loadingProgress;

    if (DEBUG) {
      console.log(
        `Player ${player.username} ready status: ${status.ready} (${status.loadingProgress}%)`,
      );
    }

    // Check if all players are ready when in LOADING state
    if (this.state.state === GameState.LOADING) {
      this.checkAllPlayersReady();
    }
  }

  /**
   * Handles team selection requests from players
   */
  private handleTeamSelection(client: Client, team: Team) {
    // Only allow team selection in LOBBY state
    if (this.state.state !== GameState.LOBBY) {
      throw new Error("Cannot change team after game has started");
    }

    const player = this.state.players.get(client.sessionId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Check team balance
    if (
      team === Team.RED &&
      this.state.redTeam.playerCount >= this.state.maxPlayersPerTeam
    ) {
      throw new Error("Red team is full");
    }

    if (
      team === Team.BLUE &&
      this.state.blueTeam.playerCount >= this.state.maxPlayersPerTeam
    ) {
      throw new Error("Blue team is full");
    }

    // Update team counts
    if (player.team === Team.RED) {
      this.state.redTeam.playerCount--;
    } else if (player.team === Team.BLUE) {
      this.state.blueTeam.playerCount--;
    }

    // Assign new team
    player.team = team;

    // Update team counts
    if (team === Team.RED) {
      this.state.redTeam.playerCount++;
    } else if (team === Team.BLUE) {
      this.state.blueTeam.playerCount++;
    }

    if (DEBUG) {
      console.log(`Player ${player.username} joined team ${team}`);
      console.log(
        `Team counts - Red: ${this.state.redTeam.playerCount}, Blue: ${this.state.blueTeam.playerCount}`,
      );
    }

    // Check if we can start the game (at least 1 player on each team)
    this.checkGameReadyToStart();
  }

  /**
   * Handles player movement and animation updates
   */
  private handlePlayerMovement(client: Client, message: PlayerInput) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return; // Silent fail for performance reasons
    }

    if (!player.isAlive) {
      return; // Dead players can't move
    }

    // Update player position
    player.position.x = message.position.x;
    player.position.y = message.position.y;
    player.position.z = message.position.z;

    // Update player rotation
    player.rotation.x = message.rotation.x;
    player.rotation.y = message.rotation.y;
    player.rotation.z = message.rotation.z;

    // Update animation state
    player.animation = message.animation;
  }

  /**
   * Handles projectile creation requests from players
   */
  private handleProjectileCreation(client: Client, message: ProjectileInput) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      throw new Error("Player not found");
    }

    if (!player.isAlive) {
      throw new Error("Dead players cannot shoot");
    }

    if (this.state.state !== GameState.PLAYING) {
      throw new Error("Cannot shoot outside of active gameplay");
    }

    // Increment shots fired for stats
    player.stats.shots++;
    player.stats.updateAccuracy();

    // Use provided ID or generate one
    const projectileId = `${client.sessionId}_${this.projectileIdCounter++}`;
    const projectile = new Projectile(
      projectileId,
      client.sessionId,
      player.team,
    );

    // Set projectile position
    projectile.position.x = message.position.x;
    projectile.position.y = message.position.y;
    projectile.position.z = message.position.z;

    // Set projectile direction
    projectile.direction.x = message.direction.x;
    projectile.direction.y = message.direction.y;
    projectile.direction.z = message.direction.z;

    // Set projectile color based on team
    projectile.color = player.team === Team.RED ? "#ff4d4d" : "#4d4dff";
    if (message.color) {
      projectile.color = message.color;
    }

    // Add projectile to state
    this.state.projectiles.set(projectileId, projectile);

    // Remove projectile after a certain time
    setTimeout(() => {
      if (this.state.projectiles.has(projectileId)) {
        this.state.projectiles.delete(projectileId);
      }
    }, this.PROJECTILE_LIFETIME_MS);

    if (DEBUG) {
      console.log(`Player ${player.username} fired projectile ${projectileId}`);
    }
  }

  /**
   * Handles player hit reports from clients with server-side validation
   */
  private handlePlayerHit(
    client: Client,
    projectileId: string,
    targetId: string,
  ) {
    // Validate the hit
    const projectile = this.state.projectiles.get(projectileId);
    const shooter = this.state.players.get(client.sessionId);
    const target = this.state.players.get(targetId);

    // Basic validation
    if (!projectile) {
      throw new Error("Projectile not found");
    }

    if (!shooter) {
      throw new Error("Shooter not found");
    }

    if (!target) {
      throw new Error("Target not found");
    }

    if (!target.isAlive) {
      throw new Error("Target is already dead");
    }

    if (projectile.ownerId !== client.sessionId) {
      throw new Error("Only the shooter can report hits");
    }

    if (shooter.team === target.team) {
      throw new Error("No friendly fire allowed");
    }

    // Remove the projectile
    this.state.projectiles.delete(projectileId);

    // Update hit stats
    shooter.stats.hits++;
    shooter.stats.updateAccuracy();

    // Apply damage to target
    target.health -= projectile.damage;

    if (DEBUG) {
      console.log(
        `Hit: ${shooter.username} hit ${target.username} for ${projectile.damage} damage (health: ${target.health})`,
      );
    }

    // Check if target is killed
    if (target.health <= 0) {
      this.handlePlayerDeath(target, shooter);
    }
  }

  /**
   * Handles player death logic, scoring, and respawn timers
   */
  private handlePlayerDeath(target: Player, killer: Player) {
    // Update player state
    target.isAlive = false;
    target.animation = PlayerAnimation.DEAD;
    target.health = 0;

    // Update stats
    target.stats.deaths++;
    killer.stats.kills++;

    // Update team score
    if (killer.team === Team.RED) {
      this.state.redTeam.score += this.POINTS_PER_KILL;
    } else if (killer.team === Team.BLUE) {
      this.state.blueTeam.score += this.POINTS_PER_KILL;
    }

    // Set respawn timer
    target.respawnTime = this.RESPAWN_TIME_SECONDS;

    // Broadcast kill feed
    this.broadcast("kill:feed", {
      killer: killer.username,
      killerTeam: killer.team,
      victim: target.username,
      victimTeam: target.team,
    });

    console.log(
      `Kill: ${killer.username} killed ${target.username} (${killer.team} ${this.state.redTeam.score} - ${this.state.blueTeam.score} ${target.team})`,
    );

    // Check win conditions
    this.checkWinConditions();
  }

  /**
   * Respawns a player at their team's spawn point
   */
  private respawnPlayer(player: Player) {
    player.isAlive = true;
    player.health = 100;
    player.animation = PlayerAnimation.IDLE;

    // Set spawn position based on team
    if (player.team === Team.RED) {
      player.position.x = -20 + Math.random() * 5;
    } else {
      player.position.x = 15 + Math.random() * 5;
    }

    player.position.y = 1;
    player.position.z = -20 + Math.random() * 40;

    if (DEBUG) {
      console.log(
        `Player ${player.username} respawned at (${player.position.x}, ${player.position.y}, ${player.position.z})`,
      );
    }
  }

  /**
   * Checks if all players are ready to start the game
   */
  private checkAllPlayersReady() {
    let allReady = true;
    let totalPlayers = 0;

    this.state.players.forEach((player) => {
      if (player.team !== Team.SPECTATOR) {
        totalPlayers++;
        if (!player.isReady) {
          allReady = false;
        }
      }
    });

    // Need at least 2 players (1 per team minimum)
    if (allReady && totalPlayers >= 2) {
      console.log(`All players ready (${totalPlayers}), starting countdown`);
      this.startGameCountdown();
    } else if (DEBUG) {
      console.log(
        `Waiting for players to be ready: ${totalPlayers} total, all ready: ${allReady}`,
      );
    }
  }

  /**
   * Checks if the game is ready to transition from lobby to loading
   */
  private checkGameReadyToStart() {
    // Only proceed if we're in LOBBY state
    if (this.state.state !== GameState.LOBBY) return;

    // Check if we have at least one player on each team
    if (
      this.state.redTeam.playerCount > 0 &&
      this.state.blueTeam.playerCount > 0
    ) {
      console.log(`Both teams have players, transitioning to loading state`);
      this.transitionToLoading();
    }
  }

  /**
   * Transitions the game to the loading state
   */
  private transitionToLoading() {
    this.state.state = GameState.LOADING;
    this.broadcast("game:loading");

    // Lock the room to prevent new players from joining during loading
    this.lock();

    console.log(`Game state changed to LOADING`);

    // Reset player ready status
    this.state.players.forEach((player) => {
      player.isReady = false;
      player.loadingProgress = 0;
    });
  }

  /**
   * Starts the pre-game countdown
   */
  private startGameCountdown() {
    this.state.state = GameState.COUNTDOWN;
    this.state.countdownTime = 5;

    console.log(
      `Game state changed to COUNTDOWN (${this.state.countdownTime}s)`,
    );

    this.broadcast("game:countdown", { time: this.state.countdownTime });

    // Clear any existing countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      this.state.countdownTime--;

      console.log(`Countdown: ${this.state.countdownTime}`);

      if (this.state.countdownTime <= 0) {
        clearInterval(this.countdownInterval!);
        this.countdownInterval = null;
        this.startGame();
      } else {
        this.broadcast("game:countdown", { time: this.state.countdownTime });
      }
    }, 1000);
  }

  /**
   * Starts the actual gameplay
   */
  private startGame() {
    this.state.state = GameState.PLAYING;
    this.state.timeRemaining = this.state.matchDuration;

    console.log(`Game state changed to PLAYING (${this.state.matchDuration}s)`);

    // Reset scores
    this.state.redTeam.score = 0;
    this.state.blueTeam.score = 0;

    // Spawn all players
    this.state.players.forEach((player) => {
      if (player.team !== Team.SPECTATOR) {
        player.health = 100;
        player.isAlive = true;
        player.stats.kills = 0;
        player.stats.deaths = 0;
        player.stats.assists = 0;
        player.stats.shots = 0;
        player.stats.hits = 0;
        player.stats.accuracy = 0;

        // Set spawn position based on team
        if (player.team === Team.RED) {
          player.position.x = -20 + Math.random() * 5;
        } else {
          player.position.x = 15 + Math.random() * 5;
        }

        player.position.y = 1;
        player.position.z = -20 + Math.random() * 40;
      }
    });

    this.broadcast("game:started");

    // Clear any existing game loop
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }

    // Start game timer
    this.gameLoopInterval = setInterval(() => {
      this.updateGameTimer();
    }, 1000);
  }

  /**
   * Updates the game timer and checks for time-based end conditions
   */
  private updateGameTimer() {
    if (this.state.state !== GameState.PLAYING) return;

    this.state.timeRemaining--;

    // Check for time-based game end
    if (this.state.timeRemaining <= 0) {
      console.log(`Match time expired, ending game`);
      this.endGame();
    } else if (this.state.timeRemaining % 60 === 0) {
      // Log remaining time every minute
      console.log(
        `Match time remaining: ${Math.floor(this.state.timeRemaining / 60)}:00`,
      );
    }
  }

  /**
   * Checks if either team has reached the win condition
   */
  private checkWinConditions() {
    // Check score-based win condition
    if (this.state.redTeam.score >= this.maxScore) {
      console.log(
        `Red team reached max score (${this.state.redTeam.score}), ending game`,
      );
      this.endGame(Team.RED);
    } else if (this.state.blueTeam.score >= this.maxScore) {
      console.log(
        `Blue team reached max score (${this.state.blueTeam.score}), ending game`,
      );
      this.endGame(Team.BLUE);
    }
  }

  /**
   * Ends the game and transitions to the results screen
   */
  private endGame(winningTeam?: Team) {
    // Stop game timer
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }

    // Determine winning team if not provided
    if (!winningTeam) {
      winningTeam =
        this.state.redTeam.score > this.state.blueTeam.score
          ? Team.RED
          : Team.BLUE;

      // Handle tie
      if (this.state.redTeam.score === this.state.blueTeam.score) {
        // In case of tie, team with fewer players wins (harder challenge)
        winningTeam =
          this.state.redTeam.playerCount <= this.state.blueTeam.playerCount
            ? Team.RED
            : Team.BLUE;
      }
    }

    // Update game state
    this.state.state = GameState.ENDED;

    console.log(`Game state changed to ENDED (Winner: ${winningTeam})`);

    // Prepare match results
    const playerStats: Record<string, any> = {};
    let mvpId = "";
    let maxKills = -1;

    this.state.players.forEach((player, id) => {
      playerStats[id] = {
        username: player.username,
        team: player.team,
        kills: player.stats.kills,
        deaths: player.stats.deaths,
        assists: player.stats.assists,
        accuracy: player.stats.getAccuracy(),
      };

      // Find MVP (most kills)
      if (player.stats.kills > maxKills) {
        maxKills = player.stats.kills;
        mvpId = id;
      }
    });

    const matchResult: MatchResult = {
      matchId: this.state.matchId,
      winningTeam,
      duration: this.MATCH_DURATION_SECONDS - this.state.timeRemaining,
      redTeamScore: this.state.redTeam.score,
      blueTeamScore: this.state.blueTeam.score,
      playerStats: playerStats as any,
      mvpId,
    };

    // Broadcast match results
    this.broadcast("game:ended", matchResult);

    // Log match results
    console.log(
      `Match results: ${matchResult.redTeamScore}-${matchResult.blueTeamScore}, MVP: ${this.state.players.get(mvpId)?.username || "unknown"}`,
    );

    // Reset room after a delay to allow clients to view results
    setTimeout(() => {
      this.resetRoom();
    }, 15000); // 15 seconds to view results
  }

  /**
   * Resets the room to lobby state for the next match
   */
  private resetRoom() {
    // Clear all projectiles
    this.state.projectiles.clear();

    // Reset game state
    this.state.state = GameState.LOBBY;
    this.state.matchId = uuidv4();
    this.state.timeRemaining = this.MATCH_DURATION_SECONDS;
    this.state.redTeam.score = 0;
    this.state.blueTeam.score = 0;

    // Unlock the room to allow new players to join
    this.unlock();

    console.log(
      `Room reset to LOBBY state with new match ID: ${this.state.matchId}`,
    );

    // Reset players but keep them in their teams
    this.state.players.forEach((player) => {
      player.health = 100;
      player.isAlive = true;
      player.isReady = false;
      player.loadingProgress = 0;
      player.stats.kills = 0;
      player.stats.deaths = 0;
      player.stats.assists = 0;
      player.stats.shots = 0;
      player.stats.hits = 0;
      player.stats.accuracy = 0;
    });

    // Broadcast room reset
    this.broadcast("game:reset");
  }

  /**
   * Main game simulation loop that runs at 30fps
   * Handles physics, respawn timers, and cleanup
   */
  private gameSimulation(deltaTime: number) {
    const now = Date.now();

    // Track performance metrics in debug mode
    if (DEBUG) {
      const startTime = performance.now();

      // Perform simulation
      this.runSimulation(deltaTime);

      // Record update time
      const updateTime = performance.now() - startTime;
      this.updateTimes.push(updateTime);

      // Keep only the last 100 update times
      if (this.updateTimes.length > 100) {
        this.updateTimes.shift();
      }
    } else {
      // Just run the simulation without metrics
      this.runSimulation(deltaTime);
    }
  }

  /**
   * Actual simulation logic separated for performance measurement
   */
  private runSimulation(deltaTime: number) {
    // Handle respawn timers
    if (this.state.state === GameState.PLAYING) {
      this.state.players.forEach((player) => {
        if (!player.isAlive && player.respawnTime > 0) {
          player.respawnTime -= deltaTime;

          if (player.respawnTime <= 0) {
            this.respawnPlayer(player);
          }
        }
      });
    }

    // Clean up projectiles
    this.cleanupProjectiles();
  }

  /**
   * Calculate average update time for performance monitoring
   */
  private getAverageUpdateTime(): number {
    if (this.updateTimes.length === 0) return 0;
    const sum = this.updateTimes.reduce((a, b) => a + b, 0);
    return sum / this.updateTimes.length;
  }

  /**
   * Removes expired projectiles from the game state
   */
  private cleanupProjectiles() {
    const now = Date.now();

    // Remove projectiles that have exceeded their lifetime
    this.state.projectiles.forEach((projectile, key) => {
      if (now - projectile.timestamp > this.PROJECTILE_LIFETIME_MS) {
        this.state.projectiles.delete(key);
      }
    });
  }

  /**
   * Removes all projectiles owned by a specific player
   */
  private cleanupPlayerProjectiles(playerId: string) {
    // Remove all projectiles owned by the player who left
    this.state.projectiles.forEach((projectile, key) => {
      if (projectile.ownerId === playerId) {
        this.state.projectiles.delete(key);
      }
    });
  }

  /**
   * Called when a client joins the room
   * Creates a new player and assigns them to a team
   */
  onJoin(client: Client, options?: any) {
    console.log(`Client joined: ${client.sessionId}`);

    // Get username from options or use default
    const username =
      options?.username || `Player${Math.floor(Math.random() * 1000)}`;

    // Create a new player
    const player = new Player(client.sessionId, username);

    // Set initial position (in spectator area)
    player.position.x = 0;
    player.position.y = 10;
    player.position.z = 0;

    // Set initial animation
    player.animation = PlayerAnimation.IDLE;

    // Add player to the room state
    this.state.players.set(client.sessionId, player);

    // Auto-assign team if game hasn't started yet
    if (this.state.state === GameState.LOBBY) {
      // Assign to team with fewer players
      if (
        this.state.redTeam.playerCount <= this.state.blueTeam.playerCount &&
        this.state.redTeam.playerCount < this.state.maxPlayersPerTeam
      ) {
        player.team = Team.RED;
        this.state.redTeam.playerCount++;
      } else if (
        this.state.blueTeam.playerCount < this.state.maxPlayersPerTeam
      ) {
        player.team = Team.BLUE;
        this.state.blueTeam.playerCount++;
      }

      console.log(`Player ${username} auto-assigned to team ${player.team}`);

      // Check if we can start the game
      this.checkGameReadyToStart();
    } else {
      // If game is in progress, player starts as spectator
      player.team = Team.SPECTATOR;
      console.log(`Player ${username} joined as spectator (game in progress)`);
    }

    // Send welcome message to the client
    client.send("welcome", {
      matchId: this.state.matchId,
      gameState: this.state.state,
      team: player.team,
      redScore: this.state.redTeam.score,
      blueScore: this.state.blueTeam.score,
      timeRemaining: this.state.timeRemaining,
      mode: this.state.mode,
    });
  }

  /**
   * Called when a client leaves the room
   * Removes the player and their projectiles
   */
  async onLeave(client: Client, consented: boolean) {
    console.log(`Client left: ${client.sessionId} (consented: ${consented})`);

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // If the player disconnected unexpectedly and the game is in progress,
    // give them a chance to reconnect
    if (!consented && this.state.state === GameState.PLAYING) {
      // Mark the player as disconnected
      player.connected = false;

      console.log(
        `Player ${player.username} disconnected. Waiting for reconnection...`,
      );

      try {
        // Wait for the player to reconnect
        await this.allowReconnection(client, 30);

        // Player reconnected
        player.connected = true;
        console.log(`Player ${player.username} reconnected!`);

        return;
      } catch (e) {
        // Player didn't reconnect within the time limit
        console.log(
          `Player ${player.username} did not reconnect within the time limit`,
        );
      }
    }

    // Update team counts
    if (player.team === Team.RED) {
      this.state.redTeam.playerCount--;
    } else if (player.team === Team.BLUE) {
      this.state.blueTeam.playerCount--;
    }

    console.log(`Player ${player.username} left team ${player.team}`);

    // Remove player from the room state
    this.state.players.delete(client.sessionId);

    // Clean up any projectiles owned by this player
    this.cleanupPlayerProjectiles(client.sessionId);

    // Check if we need to end the game due to lack of players
    if (this.state.state === GameState.PLAYING) {
      if (this.state.redTeam.playerCount === 0) {
        console.log(`Red team has no players, blue team wins by default`);
        this.endGame(Team.BLUE);
      } else if (this.state.blueTeam.playerCount === 0) {
        console.log(`Blue team has no players, red team wins by default`);
        this.endGame(Team.RED);
      }
    }

    // Remove from user profiles
    this.userProfiles.delete(client.sessionId);
  }

  /**
   * Called when the room is about to be destroyed
   * Cleans up all resources
   */
  onDispose() {
    console.log(`Room ${this.roomId} disposing...`);

    // Clear all intervals
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    // Log final stats
    console.log(
      `Final room stats - Players: ${this.state.players.size}, Red: ${this.state.redTeam.playerCount}, Blue: ${this.state.blueTeam.playerCount}`,
    );
  }

  /**
   * Called before the server shuts down
   * Gives players a chance to save their progress
   */
  onBeforeShutdown() {
    console.log(`Room ${this.roomId} is shutting down...`);

    // Notify all clients that the server is shutting down
    this.broadcast("server:shutdown", {
      message:
        "Server is shutting down for maintenance. Your progress will be saved.",
    });

    // If a match is in progress, save the results
    if (this.state.state === GameState.PLAYING) {
      // Determine the current winner
      const winningTeam =
        this.state.redTeam.score > this.state.blueTeam.score
          ? Team.RED
          : Team.BLUE;

      // End the game with the current winner
      this.endGame(winningTeam);
    }
  }

  /**
   * Called when an uncaught exception occurs in the room
   */
  onUncaughtException(err: Error, methodName: string) {
    console.error(`Uncaught exception in ${methodName}:`, err);

    // Notify clients of the error
    this.broadcast("error", {
      message: "An unexpected error occurred on the server",
      code: "INTERNAL_ERROR",
    });

    // If in development mode, provide more details
    if (DEBUG) {
      console.error(`Stack trace:`, err.stack);
    }
  }
}
