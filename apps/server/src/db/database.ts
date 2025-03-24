import type { MatchResult, UserProfile } from "@workspace/shared";

import { Team } from "@workspace/shared";

// Interface for database operations
export interface Database {
  // User operations
  createUser(username: string, passwordHash: string): Promise<UserProfile>;
  getUserById(userId: string): Promise<UserProfile | null>;
  getUserByUsername(username: string): Promise<UserProfile | null>;
  updateUserStats(
    userId: string,
    matchResult: MatchResult,
  ): Promise<UserProfile>;

  // Match operations
  saveMatchResult(matchResult: MatchResult): Promise<void>;
  getMatchHistory(userId: string, limit?: number): Promise<MatchResult[]>;

  // Leaderboard operations
  getTopPlayers(limit?: number): Promise<UserProfile[]>;
}

// In-memory implementation (replace with a real database in production)
export class InMemoryDatabase implements Database {
  private users: Record<string, UserProfile> = {};
  private matches: MatchResult[] = [];

  async createUser(
    username: string,
    passwordHash: string,
  ): Promise<UserProfile> {
    const userId = `user_${Object.keys(this.users).length + 1}`;

    const user: UserProfile = {
      userId,
      username,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      totalKills: 0,
      totalDeaths: 0,
      kdRatio: 0,
      accuracy: 0,
      lastLogin: Date.now(),
    };

    this.users[userId] = user;
    return user;
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    return this.users[userId] || null;
  }

  async getUserByUsername(username: string): Promise<UserProfile | null> {
    return (
      Object.values(this.users).find((user) => user.username === username) ||
      null
    );
  }

  async updateUserStats(
    userId: string,
    matchResult: MatchResult,
  ): Promise<UserProfile> {
    const user = this.users[userId];
    if (!user) throw new Error("User not found");

    const playerStats = matchResult.playerStats[userId];
    if (!playerStats) throw new Error("Player stats not found in match result");

    // Update user stats
    user.totalMatches++;

    // Check if player's team won
    const playerTeam = playerStats.team as Team;
    if (matchResult.winningTeam === playerTeam) {
      user.wins++;
    } else {
      user.losses++;
    }

    user.totalKills += playerStats.kills;
    user.totalDeaths += playerStats.deaths;
    user.kdRatio =
      user.totalDeaths > 0
        ? user.totalKills / user.totalDeaths
        : user.totalKills;

    // Update accuracy (weighted average)
    const oldAccuracyWeight = user.totalMatches > 1 ? user.totalMatches - 1 : 0;
    const newAccuracyWeight = 1;
    const totalWeight = oldAccuracyWeight + newAccuracyWeight;

    // Calculate accuracy from player stats
    const playerAccuracy = playerStats.accuracy || 0;

    user.accuracy =
      (user.accuracy * oldAccuracyWeight + playerAccuracy * newAccuracyWeight) /
      totalWeight;

    return user;
  }

  async saveMatchResult(matchResult: MatchResult): Promise<void> {
    this.matches.push(matchResult);
  }

  async getMatchHistory(userId: string, limit = 10): Promise<MatchResult[]> {
    return this.matches
      .filter((match) => userId in match.playerStats)
      .sort((a, b) => b.duration - a.duration) // Sort by most recent
      .slice(0, limit);
  }

  async getTopPlayers(limit = 10): Promise<UserProfile[]> {
    return Object.values(this.users)
      .sort((a, b) => b.kdRatio - a.kdRatio)
      .slice(0, limit);
  }
}

// Export a singleton instance
export const db = new InMemoryDatabase();
