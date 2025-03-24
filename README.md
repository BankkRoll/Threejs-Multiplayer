# FPS Three Game Monorepo

A multiplayer 3D first-person shooter game built with Next.js, React Three Fiber, and Colyseus.

## Overview

This project is a full-featured multiplayer 3D game with physics, real-time networking, and modern rendering techniques. It's structured as a monorepo using Turborepo and pnpm, allowing for code sharing between the frontend and backend while maintaining a clean separation of concerns.

## Project Structure

The project follows a standard Turborepo structure:

- `apps/` - Contains the application code
  - `web/` - Next.js frontend application
  - `server/` - Colyseus multiplayer game server
- `packages/` - Contains shared libraries and configurations
  - `ui/` - Shared UI components using shadcn/ui
  - `shared/` - Shared types and utilities
  - `typescript-config/` - Shared TypeScript configurations
  - `eslint-config/` - Shared ESLint configurations

## Features

- 🎮 First-person shooter gameplay with physics
- 🌐 Real-time multiplayer using Colyseus
- 🎛️ Gamepad support
- 🎨 Post-processing effects
- 🏗️ Modern component architecture
- 🔄 Shared types between client and server
- 📦 Monorepo structure for code organization

## Technologies

### Frontend (apps/web)

- **Next.js 15** - App Router for routing and server components
- **React 18** - UI framework
- **React Three Fiber** - React bindings for Three.js
- **React Three Rapier** - Physics engine for 3D interactions
- **Colyseus.js** - Client for multiplayer functionality
- **Tailwind CSS** - For styling
- **shadcn/ui** - Component library

### Backend (apps/server)

- **Colyseus** - Multiplayer game server framework
- **Express** - Web server
- **TypeScript** - Type safety

## Getting Started

### Prerequisites

- Node.js 20 or later
- pnpm 10.4.1 or later

### Installation

```bash
# Clone the repository
git clone https://github.com/BankkRoll/Threejs-Multiplayer.git
cd Threejs-Multiplayer

# Install dependencies
pnpm install-all
```

### Development

```bash
# Start both client and server in development mode
pnpm dev:all

# Start only the client
pnpm dev:client

# Start only the server
pnpm dev:server
```

### Building

```bash
# Build everything
pnpm build:all

# Build only the client
pnpm build:client

# Build only the server
pnpm build:server
```

### Production

```bash
# Build everything and start the server
pnpm build:all
pnpm start
```

## Game Controls

- **WASD** - Movement
- **Mouse** - Look around
- **Left Click** - Shoot
- **Space** - Jump
- **Shift** - Sprint
- **Gamepad** - Full controller support

## Adding UI Components

This project uses shadcn/ui for UI components. To add components to your app, run:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the UI components in the `packages/ui/src/components` directory.

### Using UI Components

To use the components in your app, import them from the `ui` package:

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Multiplayer Architecture

The multiplayer system uses Colyseus for real-time communication.

### Server-side:

- `GameRoom` handles player connections, movement updates, and projectile creation.
- `GameRoomState` defines the schema for synchronized state.
- Players and projectiles are tracked in `MapSchema` collections.

### Client-side:

- `MultiplayerProvider` establishes connection to the server.
- `useMultiplayer` hook provides access to the connection state.
- Components like `Player` and `SphereTool` send updates to the server.
- `OtherPlayers` renders other connected players based on server state.

## Game Physics

The game uses React Three Rapier for physics:

- Character controller for player movement
- Rigid bodies for physical objects
- Colliders for collision detection
- Physics-based projectiles

## Scripts

The root `package.json` contains scripts to manage the monorepo:

```bash
pnpm dev:all      # Start both client and server
pnpm dev:client   # Start only the client
pnpm dev:server   # Start only the server
pnpm build:all    # Build everything
pnpm build:client # Build only the client
pnpm build:server # Build only the server
pnpm start        # Start the server in production mode
pnpm lint         # Run linting
pnpm format       # Format code
```

## License

MIT
