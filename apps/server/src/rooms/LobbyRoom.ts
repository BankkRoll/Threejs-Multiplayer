/**
 * Lobby Room Implementation
 *
 * This room serves as a matchmaking hub where players can find and join
 * active game rooms. It provides information about available rooms and
 * helps players connect to appropriate games.
 */

import { Room, type Client } from "@colyseus/core";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { matchMaker } from "@colyseus/core";

// Debug mode flag for verbose logging
const DEBUG = process.env.DEBUG === "true";

/**
 * Lobby state schema for synchronizing data with clients
 */
class LobbyState extends Schema {
  @type({ map: "string" }) clients = new MapSchema<string>();
  @type("number") roomsCount = 0;
}

/**
 * Lobby room implementation for matchmaking
 */
export class LobbyRoom extends Room<LobbyState> {
  // Maximum number of clients in the lobby
  maxClients = 100;

  /**
   * Called when the room is created
   * Initializes the lobby state and sets up message handlers
   */
  onCreate(options?: any) {
    console.log("Lobby room created");

    this.setState(new LobbyState());

    // Update rooms count every 5 seconds
    this.setSimulationInterval(() => this.updateRoomsCount(), 5000);

    // Handle matchmaking request
    this.onMessage("matchmaking", (client, options) => {
      try {
        this.handleMatchmaking(client, options);
      } catch (error) {
        this.handleError(client, "matchmaking", error);
      }
    });

    // Handle room list request
    this.onMessage("get_rooms", (client) => {
      try {
        this.sendAvailableRooms(client);
      } catch (error) {
        this.handleError(client, "get_rooms", error);
      }
    });

    // Handle create room request
    this.onMessage("create_room", (client, options) => {
      try {
        this.handleCreateRoom(client, options);
      } catch (error) {
        this.handleError(client, "create_room", error);
      }
    });
  }

  /**
   * Called when a client joins the lobby
   */
  onJoin(client: Client, options?: any) {
    const username = options?.username || "Anonymous";
    this.state.clients.set(client.sessionId, username);

    console.log(`Client joined lobby: ${username} (${client.sessionId})`);

    // Send current rooms to the client
    this.sendAvailableRooms(client);
  }

  /**
   * Called when a client leaves the lobby
   */
  onLeave(client: Client, consented?: boolean) {
    const username = this.state.clients.get(client.sessionId) || "Unknown";
    this.state.clients.delete(client.sessionId);

    console.log(`Client left lobby: ${username} (${client.sessionId})`);
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
   * Updates the count of available game rooms
   */
  private async updateRoomsCount() {
    try {
      const rooms = await this.presence.smembers("rooms");
      const gameRooms = rooms.filter((room) => room.startsWith("game_room"));
      this.state.roomsCount = gameRooms.length;

      if (DEBUG) {
        console.log(`Updated rooms count: ${this.state.roomsCount}`);
      }
    } catch (error) {
      console.error("Error updating rooms count:", error);
    }
  }

  /**
   * Sends the list of available game rooms to a client
   */
  private async sendAvailableRooms(client: Client) {
    try {
      const rooms = await this.presence.smembers("rooms");
      const gameRooms = rooms.filter((room) => room.startsWith("game_room"));

      // Get detailed information about each room
      const roomDetails = await Promise.all(
        gameRooms.map(async (roomId) => {
          try {
            const roomData = await this.presence.hget(roomId, "metadata");
            if (roomData) {
              const metadata = JSON.parse(roomData);
              return {
                roomId,
                clients: metadata.clients,
                maxClients: metadata.maxClients,
                state: metadata.state,
                locked: metadata.locked,
                mode: metadata.mode || "classic",
                redTeam: metadata.redTeam || 0,
                blueTeam: metadata.blueTeam || 0,
              };
            }
            return null;
          } catch (error) {
            console.error(`Error getting metadata for room ${roomId}:`, error);
            return null;
          }
        }),
      );

      // Filter out null values and send to client
      const validRooms = roomDetails.filter((room) => room !== null);
      client.send("rooms", { rooms: validRooms });

      if (DEBUG) {
        console.log(
          `Sent ${validRooms.length} rooms to client ${client.sessionId}`,
        );
      }
    } catch (error) {
      console.error("Error sending available rooms:", error);
      client.send("error", { message: "Failed to retrieve room list" });
    }
  }

  /**
   * Handles matchmaking requests from clients
   * Finds an appropriate game room or suggests creating a new one
   */
  private async handleMatchmaking(client: Client, options: any) {
    try {
      // Find available game rooms
      const rooms = await this.presence.smembers("rooms");
      const gameRooms = rooms.filter((room) => room.startsWith("game_room"));

      if (DEBUG) {
        console.log(
          `Matchmaking request from ${client.sessionId}, found ${gameRooms.length} game rooms`,
        );
        console.log(`Matchmaking options:`, options);
      }

      let targetRoom = null;

      // Find a room that's in LOBBY state and not full
      for (const roomId of gameRooms) {
        try {
          const roomData = await this.presence.hget(roomId, "metadata");
          if (!roomData) continue;

          const metadata = JSON.parse(roomData);

          // Check if room matches the requested mode
          if (options.mode && metadata.mode !== options.mode) {
            continue;
          }

          if (
            metadata.state === "lobby" &&
            metadata.clients < metadata.maxClients &&
            !metadata.locked
          ) {
            targetRoom = roomId;

            if (DEBUG) {
              console.log(
                `Found suitable room for ${client.sessionId}: ${roomId}`,
              );
            }

            break;
          }
        } catch (error) {
          console.error(`Error processing room ${roomId}:`, error);
          continue;
        }
      }

      // If no suitable room found, create a new one
      if (!targetRoom) {
        // Let the client know they should create a new room
        client.send("create_room", {
          message: "No suitable rooms found, create a new one",
          options: {
            mode: options.mode || "classic",
          },
        });

        console.log(
          `No suitable rooms found for ${client.sessionId}, suggesting to create a new one`,
        );
      } else {
        // Send the room ID to the client
        client.send("join_room", { roomId: targetRoom });

        console.log(`Directing ${client.sessionId} to join room ${targetRoom}`);
      }
    } catch (error) {
      console.error("Error during matchmaking:", error);
      client.send("error", { message: "Matchmaking failed, please try again" });
    }
  }

  /**
   * Handles create room requests from clients
   */
  private async handleCreateRoom(client: Client, options: any) {
    try {
      // Create a new room with the specified options
      const room = await matchMaker.createRoom("game_room", {
        mode: options?.mode || "classic",
        maxPlayersPerTeam: options?.maxPlayersPerTeam || 5,
        matchDuration: options?.matchDuration || 300,
      });

      // Send the room ID to the client
      client.send("join_room", { roomId: room.roomId });

      console.log(`Created new room ${room.roomId} for ${client.sessionId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      client.send("error", {
        message: "Failed to create room, please try again",
      });
    }
  }
}
