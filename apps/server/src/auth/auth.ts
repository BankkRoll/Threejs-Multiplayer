/**
 * Authentication Module
 *
 * This module provides basic user authentication and profile management.
 * In a production environment, this should be replaced with a more secure
 * authentication system and a persistent database.
 */

import { Router } from "express";
import type { Team } from "@workspace/shared";
import type { UserProfile } from "@workspace/shared";
import express from "express";
import { v4 as uuidv4 } from "uuid";

// Debug mode flag for verbose logging
const DEBUG = process.env.DEBUG === "true";

// In-memory user database (replace with a real database in production)
const users: Record<string, UserProfile & { passwordHash?: string }> = {};

export const auth: Router = Router();

// Middleware to parse JSON bodies
auth.use(express.json());

/**
 * Register a new user
 * POST /auth/register
 * Body: { username: string, password: string }
 */
auth.post("/register", (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
      return res.status(400).json({
        error:
          "Username must be 3-16 characters and contain only letters, numbers, and underscores",
      });
    }

    // Check if username already exists
    const userExists = Object.values(users).some(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
    if (userExists) {
      return res.status(409).json({ error: "Username already exists" });
    }

    // Create new user
    const userId = uuidv4();
    const now = Date.now();

    // In a real app, you would hash the password
    // const passwordHash = await bcrypt.hash(password, 10)
    const passwordHash = `mock_hash_${password}`; // Mock hash for demo

    users[userId] = {
      userId,
      username,
      totalMatches: 0,
      wins: 0,
      losses: 0,
      totalKills: 0,
      totalDeaths: 0,
      kdRatio: 0,
      accuracy: 0,
      lastLogin: now,
      passwordHash, // This would be stored securely in a real app
    };

    if (DEBUG) {
      console.log(`User registered: ${username} (${userId})`);
    }

    return res.status(201).json({
      userId,
      username,
      token: generateToken(userId),
    });
  } catch (error) {
    console.error("Error in user registration:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Login with username and password
 * POST /auth/login
 * Body: { username: string, password: string }
 */
auth.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Find user by username (case insensitive)
    const user = Object.values(users).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // In a real app, you would verify the password hash
    // const passwordValid = await bcrypt.compare(password, user.passwordHash)
    const passwordValid = user.passwordHash === `mock_hash_${password}`; // Mock verification

    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    users[user.userId].lastLogin = Date.now();

    if (DEBUG) {
      console.log(`User logged in: ${username} (${user.userId})`);
    }

    return res.status(200).json({
      userId: user.userId,
      username: user.username,
      token: generateToken(user.userId),
    });
  } catch (error) {
    console.error("Error in user login:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get user profile by ID
 * GET /auth/profile/:userId
 */
auth.get("/profile/:userId", (req, res) => {
  try {
    const { userId } = req.params;

    if (!users[userId]) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user profile without sensitive data
    const { passwordHash, ...userProfile } = users[userId];
    return res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update user stats after a match
 * POST /auth/stats/update
 * Body: { userId: string, matchResult: MatchResult }
 */
auth.post("/stats/update", (req, res) => {
  try {
    const { userId, matchResult } = req.body;

    if (!userId || !matchResult) {
      return res
        .status(400)
        .json({ error: "User ID and match result are required" });
    }

    if (!users[userId]) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[userId];
    const playerStats = matchResult.playerStats[userId];

    if (!playerStats) {
      return res
        .status(400)
        .json({ error: "Player stats not found in match result" });
    }

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

    if (DEBUG) {
      console.log(`Updated stats for user ${user.username} (${userId})`);
    }

    // Return user profile without sensitive data
    const { passwordHash, ...userProfile } = user;
    return res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error updating user stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get leaderboard of top players
 * GET /auth/leaderboard?limit=10&sort=kdRatio
 */
auth.get("/leaderboard", (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit as string) || 10;
    const sort = (req.query.sort as string) || "kdRatio";

    // Validate sort parameter
    const validSortFields = [
      "kdRatio",
      "totalKills",
      "totalMatches",
      "wins",
      "accuracy",
    ];

    if (!validSortFields.includes(sort)) {
      return res.status(400).json({ error: "Invalid sort parameter" });
    }

    // Get users sorted by the requested field
    const leaderboard = Object.values(users)
      .map(({ passwordHash, ...user }) => user) // Remove sensitive data
      .sort((a, b) => {
        // @ts-ignore - Dynamic property access
        return b[sort] - a[sort];
      })
      .slice(0, limit);

    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error("Error retrieving leaderboard:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Simple token generation (use a proper JWT in production)
 * @param userId User ID to encode in the token
 * @returns Base64 encoded token
 */
function generateToken(userId: string): string {
  const tokenData = {
    userId,
    timestamp: Date.now(),
    expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  return Buffer.from(JSON.stringify(tokenData)).toString("base64");
}
