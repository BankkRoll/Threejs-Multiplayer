// Player animation states
export enum PlayerAnimation {
  IDLE = "idle",
  WALKING = "walking",
  RUNNING = "running",
  JUMPING = "jumping",
  SHOOTING = "shooting",
  DEAD = "dead",
}

// Team designation
export enum Team {
  RED = "red",
  BLUE = "blue",
  SPECTATOR = "spectator", // For players waiting to join
}

// Game states
export enum GameState {
  LOBBY = "lobby", // Players joining, team selection
  LOADING = "loading", // Loading assets, checking player readiness
  COUNTDOWN = "countdown", // Pre-game countdown
  PLAYING = "playing", // Active gameplay
  ENDED = "ended", // Game over, showing results
}

// Player input message structure
export interface PlayerInput {
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  animation: PlayerAnimation;
}

// Projectile input message structure
export interface ProjectileInput {
  position: {
    x: number;
    y: number;
    z: number;
  };
  direction: {
    x: number;
    y: number;
    z: number;
  };
  color?: string;
}

// Player stats for a single match
export interface MatchStats {
  kills: number;
  deaths: number;
  assists: number;
  shots: number;
  hits: number;
  team: Team;
  accuracy: number;
}

// User profile data
export interface UserProfile {
  userId: string;
  username: string;
  totalMatches: number;
  wins: number;
  losses: number;
  totalKills: number;
  totalDeaths: number;
  kdRatio: number;
  accuracy: number;
  lastLogin: number;
}

// Match result data
export interface MatchResult {
  matchId: string;
  winningTeam: Team;
  duration: number;
  redTeamScore: number;
  blueTeamScore: number;
  playerStats: Record<string, MatchStats>;
  mvpId: string; // ID of the most valuable player
}

// Ready status for loading screen
export interface ReadyStatus {
  ready: boolean;
  loadingProgress: number; // 0-100
}
