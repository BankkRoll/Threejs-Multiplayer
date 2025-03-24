"use client";

import { Client, type Room } from "colyseus.js";
import type React from "react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

interface MultiplayerContextType {
  connected: boolean;
  room: Room | null;
  clientId: string;
}

const defaultContext: MultiplayerContextType = {
  connected: false,
  room: null,
  clientId: "",
};

const MultiplayerContext =
  createContext<MultiplayerContextType>(defaultContext);

export const useMultiplayer = () => useContext(MultiplayerContext);

interface MultiplayerProviderProps {
  children: ReactNode;
}

export const MultiplayerProvider: React.FC<MultiplayerProviderProps> = ({
  children,
}) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState("");
  const clientRef = useRef<Client | null>(null);
  const connectionAttempts = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    const wsServerUrl =
      process.env.NEXT_PUBLIC_WS_SERVER_URL || "ws://localhost:3001";

    if (!clientRef.current) {
      clientRef.current = new Client(wsServerUrl);
    }

    const connectToServer = async () => {
      if (!clientRef.current) return;

      try {
        console.log("Connecting to game server...");
        connectionAttempts.current += 1;

        // Use joinOrCreate with proper error handling
        const joinedRoom =
          await clientRef.current.joinOrCreate<Room>("game_room");

        console.log("Connected to room:", joinedRoom.id);
        setRoom(joinedRoom);
        setConnected(true);
        setClientId(joinedRoom.sessionId);
        connectionAttempts.current = 0;

        // Handle disconnection
        joinedRoom.onLeave((code) => {
          console.log("Left room", code);
          setConnected(false);
          setRoom(null);
        });
      } catch (error) {
        console.error("Could not connect to server:", error);
        setConnected(false);

        // Retry connection with exponential backoff if under max retries
        if (connectionAttempts.current < maxRetries) {
          const backoffTime = Math.pow(2, connectionAttempts.current) * 1000;
          console.log(
            `Retrying connection in ${backoffTime / 1000} seconds...`,
          );
          setTimeout(connectToServer, backoffTime);
        } else {
          console.error(
            "Max connection attempts reached. Please check if the server is running.",
          );
        }
      }
    };

    if (!connected && !room) {
      connectToServer();
    }

    return () => {
      if (room) {
        room.leave();
      }
    };
  }, [connected, room]);

  return (
    <MultiplayerContext.Provider
      value={{
        connected,
        room,
        clientId,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
};
