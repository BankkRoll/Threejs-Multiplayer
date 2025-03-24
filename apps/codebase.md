# Code Digest

## server\package.json

```json
     1: {
     2:   "name": "server",
     3:   "version": "1.0.0",
     4:   "description": "Colyseus server for FPS game",
     5:   "type": "module",
     6:   "main": "dist/index.js",
     7:   "scripts": {
     8:     "dev": "node --loader ts-node/esm src/index.ts",
     9:     "build": "tsc",
    10:     "start": "node dist/index.js",
    11:     "clean": "rimraf .turbo && rimraf node_modules && rimraf dist"
    12:   },
    13:   "dependencies": {
    14:     "@colyseus/core": "^0.15.0",
    15:     "@colyseus/monitor": "^0.16.6",
    16:     "@colyseus/schema": "^2.0.0",
    17:     "@colyseus/ws-transport": "^0.15.0",
    18:     "@workspace/ui": "workspace:*",
    19:     "@workspace/shared": "workspace:*",
    20:     "cors": "^2.8.5",
    21:     "express": "^4.18.2"
    22:   },
    23:   "devDependencies": {
    24:     "@types/cors": "^2.8.13",
    25:     "@types/express": "^4.17.17",
    26:     "@types/node": "^20.4.5",
    27:     "rimraf": "^5.0.5",
    28:     "ts-node": "^10.9.1",
    29:     "ts-node-dev": "^2.0.0",
    30:     "typescript": "^5.1.6"
    31:   }
    32: }
    33: 
    34: 
```

## web\app\layout.tsx

```tsx
     1: import { Geist, Geist_Mono } from "next/font/google";
     2: 
     3: import "@workspace/ui/globals.css";
     4: import { Providers } from "@/components/providers";
     5: 
     6: const fontSans = Geist({
     7:   subsets: ["latin"],
     8:   variable: "--font-sans",
     9: });
    10: 
    11: const fontMono = Geist_Mono({
    12:   subsets: ["latin"],
    13:   variable: "--font-mono",
    14: });
    15: 
    16: export default function RootLayout({
    17:   children,
    18: }: Readonly<{
    19:   children: React.ReactNode;
    20: }>) {
    21:   return (
    22:     <html lang="en" suppressHydrationWarning>
    23:       <body
    24:         className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
    25:       >
    26:         <Providers>{children}</Providers>
    27:       </body>
    28:     </html>
    29:   );
    30: }
    31: 
```

## web\components\game.tsx

```tsx
     1: "use client";
     2: 
     3: import * as THREE from "three";
     4: 
     5: import {
     6:   BrightnessContrast,
     7:   ChromaticAberration,
     8:   EffectComposer,
     9:   ToneMapping,
    10:   Vignette,
    11: } from "@react-three/postprocessing";
    12: import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
    13: import { Environment, PerspectiveCamera } from "@react-three/drei";
    14: import { Player, PlayerControls } from "@/game/player";
    15: import { folder, useControls } from "leva";
    16: 
    17: import { Ball } from "@/game/ball";
    18: import { BlendFunction } from "postprocessing";
    19: import { Canvas } from "@/components/canvas";
    20: import { ConnectionStatus } from "@/multiplayer/connection-status";
    21: import { Crosshair } from "@/components/crosshair";
    22: import { MultiplayerProvider } from "@/multiplayer/multiplayer-context";
    23: import { OtherPlayers } from "@/multiplayer/other-players";
    24: import { Platforms } from "@/game/platforms";
    25: import { SphereTool } from "@/game/sphere-tool";
    26: import { useLoadingAssets } from "@/hooks/use-loading-assets";
    27: import { useRef } from "react";
    28: import { useTexture } from "@react-three/drei";
    29: 
    30: const Scene = () => {
    31:   const texture = useTexture("/final-texture.png");
    32:   texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    33: 
    34:   // Ground texture (50x50)
    35:   const groundTexture = texture.clone();
    36:   groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    37:   groundTexture.repeat.set(12, 12); // 12 repeats to match ground size
    38: 
    39:   // Side walls texture (2x4)
    40:   const sideWallTexture = texture.clone();
    41:   sideWallTexture.wrapS = sideWallTexture.wrapT = THREE.RepeatWrapping;
    42:   sideWallTexture.repeat.set(12, 1); // 12 repeats horizontally to match wall length
    43: 
    44:   // Front/back walls texture (50x4)
    45:   const frontWallTexture = texture.clone();
    46:   frontWallTexture.wrapS = frontWallTexture.wrapT = THREE.RepeatWrapping;
    47:   frontWallTexture.repeat.set(12, 1); // 12 repeats horizontally to match wall width
    48: 
    49:   return (
    50:     <RigidBody type="fixed" position={[0, 0, 0]} colliders={false}>
    51:       {/* Ground collider */}
    52:       <CuboidCollider args={[25, 0.1, 25]} position={[0, -0.1, 0]} />
    53: 
    54:       {/* Wall colliders */}
    55:       <CuboidCollider position={[25, 2, 0]} args={[1, 2, 25]} />
    56:       <CuboidCollider position={[-25, 2, 0]} args={[1, 2, 25]} />
    57:       <CuboidCollider position={[0, 2, 25]} args={[25, 2, 1]} />
    58:       <CuboidCollider position={[0, 2, -25]} args={[25, 2, 1]} />
    59: 
    60:       <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
    61:         <planeGeometry args={[50, 50]} />
    62:         <meshStandardMaterial map={groundTexture} roughness={1} metalness={0} />
    63:       </mesh>
    64: 
    65:       {/* Border walls */}
    66:       <mesh position={[25, 2, 0]}>
    67:         <boxGeometry args={[2, 4, 50]} />
    68:         <meshStandardMaterial map={sideWallTexture} side={THREE.DoubleSide} />
    69:       </mesh>
    70:       <mesh position={[-25, 2, 0]}>
    71:         <boxGeometry args={[2, 4, 50]} />
    72:         <meshStandardMaterial map={sideWallTexture} side={THREE.DoubleSide} />
    73:       </mesh>
    74:       <mesh position={[0, 2, 25]}>
    75:         <boxGeometry args={[50, 4, 2]} />
    76:         <meshStandardMaterial map={frontWallTexture} side={THREE.DoubleSide} />
    77:       </mesh>
    78:       <mesh position={[0, 2, -25]}>
    79:         <boxGeometry args={[50, 4, 2]} />
    80:         <meshStandardMaterial map={frontWallTexture} side={THREE.DoubleSide} />
    81:       </mesh>
    82:     </RigidBody>
    83:   );
    84: };
    85: 
    86: export default function Game() {
    87:   const loading = useLoadingAssets();
    88:   const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    89: 
    90:   const { walkSpeed, runSpeed, jumpForce } = useControls(
    91:     "Character",
    92:     {
    93:       walkSpeed: { value: 0.11, min: 0.05, max: 0.2, step: 0.01 },
    94:       runSpeed: { value: 0.15, min: 0.1, max: 0.3, step: 0.01 },
    95:       jumpForce: { value: 0.5, min: 0.3, max: 0.8, step: 0.1 },
    96:     },
    97:     {
    98:       collapsed: true,
    99:       hidden: true,
   100:     }
   101:   );
   102: 
   103:   const {
   104:     fogEnabled,
   105:     fogColor,
   106:     fogNear,
   107:     fogFar,
   108:     ambientIntensity,
   109:     directionalIntensity,
   110:     directionalHeight,
   111:     directionalDistance,
   112:     enablePostProcessing,
   113:     vignetteEnabled,
   114:     vignetteOffset,
   115:     vignetteDarkness,
   116:     chromaticAberrationEnabled,
   117:     chromaticAberrationOffset,
   118:     brightnessContrastEnabled,
   119:     brightness,
   120:     contrast,
   121:     colorGradingEnabled,
   122:     toneMapping,
   123:     toneMappingExposure,
   124:   } = useControls(
   125:     {
   126:       fog: folder(
   127:         {
   128:           fogEnabled: true,
   129:           fogColor: "#dbdbdb",
   130:           fogNear: { value: 13, min: 0, max: 50, step: 1 },
   131:           fogFar: { value: 95, min: 0, max: 100, step: 1 },
   132:         },
   133:         { collapsed: true, hidden: true }
   134:       ),
   135:       lighting: folder(
   136:         {
   137:           ambientIntensity: { value: 1.3, min: 0, max: 2, step: 0.1 },
   138:           directionalIntensity: { value: 1, min: 0, max: 2, step: 0.1 },
   139:           directionalHeight: { value: 20, min: 5, max: 50, step: 1 },
   140:           directionalDistance: { value: 10, min: 5, max: 30, step: 1 },
   141:         },
   142:         { collapsed: true, hidden: true }
   143:       ),
   144:       postProcessing: folder(
   145:         {
   146:           enablePostProcessing: true,
   147:           vignetteEnabled: true,
   148:           vignetteOffset: { value: 0.5, min: 0, max: 1, step: 0.1 },
   149:           vignetteDarkness: { value: 0.5, min: 0, max: 1, step: 0.1 },
   150:           chromaticAberrationEnabled: true,
   151:           chromaticAberrationOffset: {
   152:             value: 0.0005,
   153:             min: 0,
   154:             max: 0.01,
   155:             step: 0.0001,
   156:           },
   157:           brightnessContrastEnabled: true,
   158:           brightness: { value: 0.1, min: -1, max: 1, step: 0.1 },
   159:           contrast: { value: 0.1, min: -1, max: 1, step: 0.1 },
   160:           colorGradingEnabled: true,
   161:           toneMapping: {
   162:             value: THREE.ACESFilmicToneMapping,
   163:             options: {
   164:               ACESFilmic: THREE.ACESFilmicToneMapping,
   165:               Reinhard: THREE.ReinhardToneMapping,
   166:               Cineon: THREE.CineonToneMapping,
   167:               Linear: THREE.LinearToneMapping,
   168:             },
   169:           },
   170:           toneMappingExposure: { value: 1.2, min: 0, max: 2, step: 0.1 },
   171:         },
   172:         { collapsed: true, hidden: true }
   173:       ),
   174:     },
   175:     {
   176:       collapsed: true,
   177:       hidden: true,
   178:     }
   179:   );
   180: 
   181:   return (
   182:     <MultiplayerProvider>
   183:       <div
   184:         style={{
   185:           position: "absolute",
   186:           top: "20px",
   187:           left: "50%",
   188:           transform: "translateX(-50%)",
   189:           color: "rgba(255, 255, 255, 0.75)",
   190:           fontSize: "13px",
   191:           fontFamily: "monospace",
   192:           userSelect: "none",
   193:           zIndex: 1000,
   194:         }}
   195:       >
   196:         <div
   197:           style={{
   198:             background: "rgba(255, 255, 255, 0.15)",
   199:             padding: "8px 12px",
   200:             borderRadius: "4px",
   201:             letterSpacing: "0.5px",
   202:             whiteSpace: "nowrap",
   203:           }}
   204:         >
   205:           WASD to move | SPACE to jump | SHIFT to run
   206:         </div>
   207:       </div>
   208: 
   209:       <div
   210:         id="ammo-display"
   211:         style={{
   212:           position: "absolute",
   213:           top: "10px",
   214:           right: "10px",
   215:           color: "rgba(255, 255, 255, 0.75)",
   216:           fontSize: "14px",
   217:           fontFamily: "monospace",
   218:           userSelect: "none",
   219:           zIndex: 1000,
   220:         }}
   221:       >
   222:         AMMO: 50/50
   223:       </div>
   224: 
   225:       <ConnectionStatus />
   226: 
   227:       <Canvas>
   228:         {fogEnabled && <fog attach="fog" args={[fogColor, fogNear, fogFar]} />}
   229:         <Environment
   230:           preset="sunset"
   231:           intensity={1}
   232:           background
   233:           blur={0.8}
   234:           resolution={256}
   235:         />
   236: 
   237:         <ambientLight intensity={ambientIntensity} />
   238:         <directionalLight
   239:           castShadow
   240:           position={[
   241:             directionalDistance,
   242:             directionalHeight,
   243:             directionalDistance,
   244:           ]}
   245:           ref={directionalLightRef}
   246:           intensity={directionalIntensity}
   247:           shadow-mapSize={[4096, 4096]}
   248:           shadow-camera-left={-30}
   249:           shadow-camera-right={30}
   250:           shadow-camera-top={30}
   251:           shadow-camera-bottom={-30}
   252:           shadow-camera-near={1}
   253:           shadow-camera-far={150}
   254:           shadow-bias={-0.0001}
   255:           shadow-normalBias={0.02}
   256:         />
   257: 
   258:         <Physics
   259:           debug={false}
   260:           paused={loading}
   261:           timeStep={1 / 60}
   262:           interpolate={true}
   263:           gravity={[0, -9.81, 0]}
   264:           substeps={2}
   265:           maxStabilizationIterations={10}
   266:           maxVelocityIterations={10}
   267:           maxVelocityFriction={1}
   268:         >
   269:           <PlayerControls>
   270:             <Player
   271:               position={[0, 7, 10]}
   272:               walkSpeed={walkSpeed}
   273:               runSpeed={runSpeed}
   274:               jumpForce={jumpForce}
   275:               onMove={(position) => {
   276:                 if (directionalLightRef.current) {
   277:                   const light = directionalLightRef.current;
   278:                   light.position.x = position.x + directionalDistance;
   279:                   light.position.z = position.z + directionalDistance;
   280:                   light.target.position.copy(position);
   281:                   light.target.updateMatrixWorld();
   282:                 }
   283:               }}
   284:             />
   285:           </PlayerControls>
   286: 
   287:           <OtherPlayers />
   288: 
   289:           <Platforms />
   290:           <Ball />
   291: 
   292:           <Scene />
   293:           <SphereTool />
   294:         </Physics>
   295: 
   296:         <PerspectiveCamera
   297:           makeDefault
   298:           position={[0, 10, 10]}
   299:           rotation={[0, 0, 0]}
   300:           near={0.1}
   301:           far={1000}
   302:         />
   303: 
   304:         {enablePostProcessing && (
   305:           <EffectComposer>
   306:             <>
   307:               {vignetteEnabled && (
   308:                 <Vignette
   309:                   offset={vignetteOffset}
   310:                   darkness={vignetteDarkness}
   311:                   eskil={false}
   312:                 />
   313:               )}
   314:               {chromaticAberrationEnabled && (
   315:                 <ChromaticAberration
   316:                   offset={
   317:                     new THREE.Vector2(
   318:                       chromaticAberrationOffset,
   319:                       chromaticAberrationOffset
   320:                     )
   321:                   }
   322:                   radialModulation={false}
   323:                   modulationOffset={0}
   324:                 />
   325:               )}
   326:               {brightnessContrastEnabled && (
   327:                 <BrightnessContrast
   328:                   brightness={brightness}
   329:                   contrast={contrast}
   330:                 />
   331:               )}
   332:               {colorGradingEnabled && (
   333:                 <ToneMapping
   334:                   blendFunction={BlendFunction.NORMAL}
   335:                   mode={toneMapping}
   336:                 />
   337:               )}
   338:             </>
   339:           </EffectComposer>
   340:         )}
   341:       </Canvas>
   342: 
   343:       <Crosshair />
   344:     </MultiplayerProvider>
   345:   );
   346: }
   347: 
```

## web\game\player.tsx

```tsx
     1: "use client";
     2: 
     3: import type React from "react";
     4: 
     5: import type Rapier from "@dimforge/rapier3d-compat";
     6: import {
     7:   KeyboardControls,
     8:   PointerLockControls,
     9:   useAnimations,
    10:   useGLTF,
    11:   useKeyboardControls,
    12: } from "@react-three/drei";
    13: import { useFrame, useThree } from "@react-three/fiber";
    14: import {
    15:   CapsuleCollider,
    16:   RigidBody,
    17:   type RigidBodyProps,
    18:   useBeforePhysicsStep,
    19:   useRapier,
    20: } from "@react-three/rapier";
    21: import { useControls } from "leva";
    22: import { useEffect, useRef, useState } from "react";
    23: import * as THREE from "three";
    24: import { PlayerAnimation } from "@workspace/shared/index";
    25: import { useGamepad } from "@/hooks/use-gamepad";
    26: import { useMultiplayer } from "@/multiplayer/multiplayer-context";
    27: import { Component, Entity, type EntityType } from "./ecs";
    28: 
    29: const _direction = new THREE.Vector3();
    30: const _frontVector = new THREE.Vector3();
    31: const _sideVector = new THREE.Vector3();
    32: const _characterLinvel = new THREE.Vector3();
    33: const _characterTranslation = new THREE.Vector3();
    34: const _cameraWorldDirection = new THREE.Vector3();
    35: const _cameraPosition = new THREE.Vector3();
    36: 
    37: const normalFov = 90;
    38: const sprintFov = 100;
    39: 
    40: const characterShapeOffset = 0.1;
    41: const autoStepMaxHeight = 2;
    42: const autoStepMinWidth = 0.05;
    43: const accelerationTimeAirborne = 0.2;
    44: const accelerationTimeGrounded = 0.025;
    45: const timeToJumpApex = 2;
    46: const maxJumpHeight = 0.5;
    47: const minJumpHeight = 0.2;
    48: const velocityXZSmoothing = 0.1;
    49: const velocityXZMin = 0.0001;
    50: const jumpGravity = -(2 * maxJumpHeight) / Math.pow(timeToJumpApex, 2);
    51: const maxJumpVelocity = Math.abs(jumpGravity) * timeToJumpApex;
    52: const minJumpVelocity = Math.sqrt(2 * Math.abs(jumpGravity) * minJumpHeight);
    53: 
    54: const up = new THREE.Vector3(0, 1, 0);
    55: 
    56: export type PlayerControls = {
    57:   children: React.ReactNode;
    58: };
    59: 
    60: type PlayerProps = RigidBodyProps & {
    61:   onMove?: (position: THREE.Vector3) => void;
    62:   walkSpeed?: number;
    63:   runSpeed?: number;
    64:   jumpForce?: number;
    65: };
    66: 
    67: export const Player = ({
    68:   onMove,
    69:   walkSpeed = 0.1,
    70:   runSpeed = 0.15,
    71:   jumpForce = 0.5,
    72:   ...props
    73: }: PlayerProps) => {
    74:   const playerRef = useRef<EntityType>(null!);
    75:   const gltf = useGLTF("/fps.glb");
    76:   const { actions } = useAnimations(gltf.animations, gltf.scene);
    77:   const { room } = useMultiplayer();
    78: 
    79:   const { x, y, z } = useControls(
    80:     "Arms Position",
    81:     {
    82:       x: { value: 0.1, min: -1, max: 1, step: 0.1 },
    83:       y: { value: -0.62, min: -1, max: 1, step: 0.1 },
    84:       z: { value: -0.2, min: -2, max: 0, step: 0.1 },
    85:     },
    86:     {
    87:       collapsed: true,
    88:       order: 998,
    89:       hidden: true,
    90:     },
    91:   );
    92: 
    93:   const rapier = useRapier();
    94:   const camera = useThree((state) => state.camera);
    95:   const clock = useThree((state) => state.clock);
    96: 
    97:   const characterController = useRef<Rapier.KinematicCharacterController>(
    98:     null!,
    99:   );
   100: 
   101:   const [, getKeyboardControls] = useKeyboardControls();
   102:   const gamepadState = useGamepad();
   103: 
   104:   const horizontalVelocity = useRef({ x: 0, z: 0 });
   105:   const jumpVelocity = useRef(0);
   106:   const holdingJump = useRef(false);
   107:   const jumpTime = useRef(0);
   108:   const jumping = useRef(false);
   109: 
   110:   // Animation states
   111:   const [isWalking, setIsWalking] = useState(false);
   112:   const [isRunning, setIsRunning] = useState(false);
   113: 
   114:   useEffect(() => {
   115:     const { world } = rapier;
   116: 
   117:     characterController.current =
   118:       world.createCharacterController(characterShapeOffset);
   119:     characterController.current.enableAutostep(
   120:       autoStepMaxHeight,
   121:       autoStepMinWidth,
   122:       true,
   123:     );
   124:     characterController.current.setSlideEnabled(true);
   125:     characterController.current.enableSnapToGround(0.1);
   126:     characterController.current.setApplyImpulsesToDynamicBodies(true);
   127: 
   128:     // Stop all animations initially
   129:     Object.values(actions).forEach((action) => action?.stop());
   130: 
   131:     return () => {
   132:       world.removeCharacterController(characterController.current);
   133:       characterController.current = null!;
   134:     };
   135:   }, []);
   136: 
   137:   // Handle shooting animation
   138:   useEffect(() => {
   139:     const handleShoot = () => {
   140:       if (document.pointerLockElement) {
   141:         const fireAction = actions["Rig|Saiga_Fire"];
   142:         if (fireAction) {
   143:           fireAction.setLoop(THREE.LoopOnce, 1);
   144:           fireAction.reset().play();
   145:         }
   146:       }
   147:     };
   148: 
   149:     window.addEventListener("pointerdown", handleShoot);
   150:     return () => window.removeEventListener("pointerdown", handleShoot);
   151:   }, [actions, camera, room]);
   152: 
   153:   useBeforePhysicsStep(() => {
   154:     const characterRigidBody = playerRef.current.rigidBody;
   155: 
   156:     if (!characterRigidBody) return;
   157: 
   158:     const characterCollider = characterRigidBody.collider(0);
   159: 
   160:     const { forward, backward, left, right, jump, sprint } =
   161:       getKeyboardControls() as KeyControls;
   162: 
   163:     // Combine keyboard and gamepad input
   164:     const moveForward = forward || gamepadState.leftStick.y < 0;
   165:     const moveBackward = backward || gamepadState.leftStick.y > 0;
   166:     const moveLeft = left || gamepadState.leftStick.x < 0;
   167:     const moveRight = right || gamepadState.leftStick.x > 0;
   168:     const isJumping = jump || gamepadState.buttons.jump;
   169:     const isSprinting = sprint || gamepadState.buttons.leftStickPress;
   170: 
   171:     const speed = walkSpeed * (isSprinting ? runSpeed / walkSpeed : 1);
   172: 
   173:     // Update movement state for animations
   174:     const isMoving = moveForward || moveBackward || moveLeft || moveRight;
   175:     setIsWalking(isMoving && !isSprinting);
   176:     setIsRunning(isMoving && isSprinting);
   177: 
   178:     const grounded = characterController.current.computedGrounded();
   179: 
   180:     // x and z movement
   181:     _frontVector.set(0, 0, Number(moveBackward) - Number(moveForward));
   182:     _sideVector.set(Number(moveLeft) - Number(moveRight), 0, 0);
   183: 
   184:     const cameraWorldDirection = camera.getWorldDirection(
   185:       _cameraWorldDirection,
   186:     );
   187:     const cameraYaw = Math.atan2(
   188:       cameraWorldDirection.x,
   189:       cameraWorldDirection.z,
   190:     );
   191: 
   192:     _direction
   193:       .subVectors(_frontVector, _sideVector)
   194:       .normalize()
   195:       .multiplyScalar(speed);
   196:     _direction.applyAxisAngle(up, cameraYaw).multiplyScalar(-1);
   197: 
   198:     const horizontalVelocitySmoothing =
   199:       velocityXZSmoothing *
   200:       (grounded ? accelerationTimeGrounded : accelerationTimeAirborne);
   201:     const horizontalVelocityLerpFactor =
   202:       1 - Math.pow(horizontalVelocitySmoothing, 0.116);
   203:     horizontalVelocity.current = {
   204:       x: THREE.MathUtils.lerp(
   205:         horizontalVelocity.current.x,
   206:         _direction.x,
   207:         horizontalVelocityLerpFactor,
   208:       ),
   209:       z: THREE.MathUtils.lerp(
   210:         horizontalVelocity.current.z,
   211:         _direction.z,
   212:         horizontalVelocityLerpFactor,
   213:       ),
   214:     };
   215: 
   216:     if (Math.abs(horizontalVelocity.current.x) < velocityXZMin) {
   217:       horizontalVelocity.current.x = 0;
   218:     }
   219:     if (Math.abs(horizontalVelocity.current.z) < velocityXZMin) {
   220:       horizontalVelocity.current.z = 0;
   221:     }
   222: 
   223:     // jumping and gravity
   224:     if (isJumping && grounded) {
   225:       jumping.current = true;
   226:       holdingJump.current = true;
   227:       jumpTime.current = clock.elapsedTime;
   228:       jumpVelocity.current = maxJumpVelocity * (jumpForce / 0.5); // Scale jump velocity based on jumpForce
   229:     }
   230: 
   231:     if (!isJumping && grounded) {
   232:       jumping.current = false;
   233:     }
   234: 
   235:     if (jumping.current && holdingJump.current && !isJumping) {
   236:       if (jumpVelocity.current > minJumpVelocity) {
   237:         jumpVelocity.current = minJumpVelocity;
   238:       }
   239:     }
   240: 
   241:     if (!isJumping && grounded) {
   242:       jumpVelocity.current = 0;
   243:     } else {
   244:       jumpVelocity.current += jumpGravity * 0.116;
   245:     }
   246: 
   247:     holdingJump.current = isJumping;
   248: 
   249:     // compute movement direction
   250:     const movementDirection = {
   251:       x: horizontalVelocity.current.x,
   252:       y: jumpVelocity.current,
   253:       z: horizontalVelocity.current.z,
   254:     };
   255: 
   256:     // compute collider movement and update rigid body
   257:     characterController.current.computeColliderMovement(
   258:       characterCollider,
   259:       movementDirection,
   260:     );
   261: 
   262:     const translation = characterRigidBody.translation();
   263:     const newPosition = _characterTranslation.copy(
   264:       translation as THREE.Vector3,
   265:     );
   266:     const movement = characterController.current.computedMovement();
   267:     newPosition.add(movement);
   268: 
   269:     characterRigidBody.setNextKinematicTranslation(newPosition);
   270:   });
   271: 
   272:   useFrame((_, delta) => {
   273:     const characterRigidBody = playerRef.current.rigidBody;
   274:     if (!characterRigidBody) {
   275:       return;
   276:     }
   277: 
   278:     _characterLinvel.copy(characterRigidBody.linvel() as THREE.Vector3);
   279:     const currentSpeed = _characterLinvel.length();
   280: 
   281:     const { forward, backward, left, right } =
   282:       getKeyboardControls() as KeyControls;
   283:     const isMoving = forward || backward || left || right;
   284:     const isSprinting =
   285:       getKeyboardControls().sprint || gamepadState.buttons.leftStickPress;
   286: 
   287:     const translation = characterRigidBody.translation();
   288:     onMove?.(translation as THREE.Vector3);
   289: 
   290:     // Send position to server
   291:     if (room) {
   292:       room.send("player:move", {
   293:         position: {
   294:           x: translation.x,
   295:           y: translation.y,
   296:           z: translation.z,
   297:         },
   298:         rotation: {
   299:           x: camera.rotation.x,
   300:           y: camera.rotation.y,
   301:           z: camera.rotation.z,
   302:         },
   303:         animation: isMoving ? PlayerAnimation.WALKING : PlayerAnimation.IDLE,
   304:       });
   305:     }
   306: 
   307:     const cameraPosition = _cameraPosition.set(
   308:       translation.x,
   309:       translation.y + 1,
   310:       translation.z,
   311:     );
   312:     const cameraEuler = new THREE.Euler().setFromQuaternion(
   313:       camera.quaternion,
   314:       "YXZ",
   315:     );
   316: 
   317:     // Different sensitivities for horizontal and vertical aiming
   318:     const CAMERA_SENSITIVITY_X = 0.04;
   319:     const CAMERA_SENSITIVITY_Y = 0.03;
   320: 
   321:     // Apply gamepad right stick for camera rotation
   322:     if (
   323:       gamepadState.connected &&
   324:       (Math.abs(gamepadState.rightStick.x) > 0 ||
   325:         Math.abs(gamepadState.rightStick.y) > 0)
   326:     ) {
   327:       // Update Euler angles
   328:       cameraEuler.y -= gamepadState.rightStick.x * CAMERA_SENSITIVITY_X;
   329:       cameraEuler.x = THREE.MathUtils.clamp(
   330:         cameraEuler.x - gamepadState.rightStick.y * CAMERA_SENSITIVITY_Y,
   331:         -Math.PI / 2,
   332:         Math.PI / 2,
   333:       );
   334: 
   335:       // Apply the new rotation while maintaining up vector
   336:       camera.quaternion.setFromEuler(cameraEuler);
   337:     }
   338: 
   339:     camera.position.lerp(cameraPosition, delta * 30);
   340: 
   341:     // FOV change for sprint
   342:     if (camera instanceof THREE.PerspectiveCamera) {
   343:       camera.fov = THREE.MathUtils.lerp(
   344:         camera.fov,
   345:         isSprinting && currentSpeed > 0.1 ? sprintFov : normalFov,
   346:         10 * delta,
   347:       );
   348:       camera.updateProjectionMatrix();
   349:     }
   350:   });
   351: 
   352:   // Handle movement animations
   353:   useEffect(() => {
   354:     const walkAction = actions["Rig|Saiga_Walk"];
   355:     const runAction = actions["Rig|Saiga_Run"];
   356: 
   357:     if (isRunning) {
   358:       walkAction?.stop();
   359:       runAction?.play();
   360:     } else if (isWalking) {
   361:       runAction?.stop();
   362:       walkAction?.play();
   363:     } else {
   364:       walkAction?.stop();
   365:       runAction?.stop();
   366:     }
   367:   }, [isWalking, isRunning, actions]);
   368: 
   369:   return (
   370:     <>
   371:       <Entity isPlayer ref={playerRef}>
   372:         <Component name="rigidBody">
   373:           <RigidBody
   374:             {...props}
   375:             colliders={false}
   376:             mass={1}
   377:             type="kinematicPosition"
   378:             enabledRotations={[false, false, false]}
   379:           >
   380:             <object3D name="player" />
   381:             <CapsuleCollider args={[1, 0.5]} />
   382:           </RigidBody>
   383:         </Component>
   384:       </Entity>
   385:       <primitive
   386:         object={gltf.scene}
   387:         position={[x, y, z]}
   388:         rotation={[0, Math.PI, 0]}
   389:         scale={0.7}
   390:         parent={camera}
   391:       />
   392:     </>
   393:   );
   394: };
   395: 
   396: type KeyControls = {
   397:   forward: boolean;
   398:   backward: boolean;
   399:   left: boolean;
   400:   right: boolean;
   401:   sprint: boolean;
   402:   jump: boolean;
   403: };
   404: 
   405: const controls = [
   406:   { name: "forward", keys: ["ArrowUp", "w", "W"] },
   407:   { name: "backward", keys: ["ArrowDown", "s", "S"] },
   408:   { name: "left", keys: ["ArrowLeft", "a", "A"] },
   409:   { name: "right", keys: ["ArrowRight", "d", "D"] },
   410:   { name: "jump", keys: ["Space"] },
   411:   { name: "sprint", keys: ["Shift"] },
   412: ];
   413: 
   414: export const PlayerControls = ({ children }: PlayerControls) => {
   415:   return (
   416:     <KeyboardControls map={controls}>
   417:       {children}
   418:       <PointerLockControls makeDefault />
   419:     </KeyboardControls>
   420:   );
   421: };
   422: 
   423: // Preload the model to ensure it's cached
   424: useGLTF.preload("/fps.glb");
   425: 
```

## web\hooks\use-loading-assets.ts

```typescript
     1: "use client";
     2: 
     3: import { useEffect, useState } from "react";
     4: import { useProgress } from "@react-three/drei";
     5: 
     6: export function useLoadingAssets() {
     7:   const { active } = useProgress();
     8:   const [loading, setLoading] = useState(true);
     9: 
    10:   useEffect(() => {
    11:     // Wait a bit after the loading progress completes
    12:     if (!active) {
    13:       const timeout = setTimeout(() => {
    14:         setLoading(false);
    15:       }, 500);
    16:       return () => clearTimeout(timeout);
    17:     } else {
    18:       setLoading(true);
    19:     }
    20:   }, [active]);
    21: 
    22:   return loading;
    23: }
    24: 
```

## web\multiplayer\other-players.tsx

```tsx
     1: "use client";
     2: 
     3: import { useAnimations, useGLTF } from "@react-three/drei";
     4: import type React from "react";
     5: import { useEffect, useState } from "react";
     6: import * as THREE from "three";
     7: import { useMultiplayer } from "./multiplayer-context";
     8: 
     9: // Avatar representation of other players
    10: const PlayerAvatar = ({
    11:   position,
    12:   rotation,
    13: }: {
    14:   position: THREE.Vector3;
    15:   rotation?: THREE.Vector3;
    16: }) => {
    17:   const { scene, animations } = useGLTF("/avatar.glb");
    18:   const { actions } = useAnimations(animations, scene);
    19: 
    20:   // Use a default if rotation isn't provided
    21:   const r = rotation || new THREE.Vector3(0, 0, 0);
    22: 
    23:   // This is how to get just y correctly
    24:   let correctedY = r.y;
    25:   const threshold = Math.PI / 2;
    26:   if (Math.abs(r.x) > threshold || Math.abs(r.z) > threshold) {
    27:     correctedY = -1 * (Math.PI + r.y);
    28:   }
    29: 
    30:   return (
    31:     <group position={[position.x, position.y, position.z]}>
    32:       <primitive
    33:         object={scene}
    34:         scale={0.7}
    35:         position={[0, -1.6, 0]}
    36:         rotation={[0, correctedY, 0]}
    37:       />
    38:     </group>
    39:   );
    40: };
    41: 
    42: export const OtherPlayers: React.FC = () => {
    43:   const { room, clientId } = useMultiplayer();
    44:   const [players, setPlayers] = useState<{
    45:     [key: string]: {
    46:       position: THREE.Vector3;
    47:       rotation?: THREE.Quaternion;
    48:     };
    49:   }>({});
    50: 
    51:   useEffect(() => {
    52:     if (!room) return;
    53: 
    54:     // Update player positions when state changes
    55:     const handleStateChange = (state: any) => {
    56:       // Update players
    57:       const newPlayers: {
    58:         [key: string]: {
    59:           position: THREE.Vector3;
    60:           rotation?: THREE.Quaternion;
    61:         };
    62:       } = {};
    63: 
    64:       state.players.forEach((player: any, id: string) => {
    65:         // Don't include the current player
    66:         if (id !== clientId) {
    67:           newPlayers[id] = {
    68:             position: new THREE.Vector3(
    69:               player.position.x,
    70:               player.position.y,
    71:               player.position.z,
    72:             ),
    73:             // Add rotation if available
    74:             rotation: player.rotation,
    75:           };
    76:         }
    77:       });
    78: 
    79:       setPlayers(newPlayers);
    80:     };
    81: 
    82:     room.onStateChange(handleStateChange);
    83: 
    84:     // Initial state
    85:     if (room.state) {
    86:       handleStateChange(room.state);
    87:     }
    88: 
    89:     return () => {
    90:       // No cleanup needed as Colyseus handles this
    91:     };
    92:   }, [room, clientId]);
    93: 
    94:   return (
    95:     <>
    96:       {/* Render other players */}
    97:       {Object.entries(players).map(([id, player]) => (
    98:         <PlayerAvatar
    99:           key={`player-${id}`}
   100:           position={player.position}
   101:           rotation={player.rotation}
   102:         />
   103:       ))}
   104:     </>
   105:   );
   106: };
   107: 
   108: // Preload the model to ensure it's cached
   109: useGLTF.preload("/avatar.glb");
   110: 
```

## web\tsconfig.json

```json
     1: {
     2:   "extends": "@workspace/typescript-config/nextjs.json",
     3:   "compilerOptions": {
     4:     "baseUrl": ".",
     5:     "paths": {
     6:       "@/*": ["./*"],
     7:       "@workspace/ui/*": ["../../packages/ui/src/*"],
     8:       "@workspace/shared/*": ["../../packages/shared/src/*"],
     9:       "@workspace/shared": ["../../packages/shared/src"]
    10:     },
    11:     "plugins": [
    12:       {
    13:         "name": "next"
    14:       }
    15:     ]
    16:   },
    17:   "include": [
    18:     "next-env.d.ts",
    19:     "next.config.ts",
    20:     "**/*.ts",
    21:     "**/*.tsx",
    22:     ".next/types/**/*.ts"
    23:   ],
    24:   "exclude": ["node_modules"]
    25: }
    26: 
```

## web\app\page.tsx

```tsx
     1: import Game from "@/components/game";
     2: 
     3: export default function Home() {
     4:   return (
     5:     <main className="h-screen w-full overflow-hidden">
     6:       <Game />
     7:     </main>
     8:   );
     9: }
    10: 
```

## web\components\providers.tsx

```tsx
     1: "use client";
     2: 
     3: import * as React from "react";
     4: import { ThemeProvider as NextThemesProvider } from "next-themes";
     5: 
     6: export function Providers({ children }: { children: React.ReactNode }) {
     7:   return (
     8:     <NextThemesProvider
     9:       attribute="class"
    10:       defaultTheme="system"
    11:       enableSystem
    12:       disableTransitionOnChange
    13:       enableColorScheme
    14:     >
    15:       {children}
    16:     </NextThemesProvider>
    17:   );
    18: }
    19: 
```

## server\src\index.ts

```typescript
     1: import { GameRoom } from "./rooms/GameRoom.js";
     2: import { Server } from "@colyseus/core";
     3: import { WebSocketTransport } from "@colyseus/ws-transport";
     4: import cors from "cors";
     5: import { createServer } from "http";
     6: import express from "express";
     7: import { monitor } from "@colyseus/monitor";
     8: 
     9: const port = Number(process.env.PORT || 3001);
    10: const app = express();
    11: 
    12: // Apply CORS middleware
    13: app.use(cors());
    14: 
    15: // Add Colyseus Monitor
    16: app.use("/monitor", monitor());
    17: 
    18: // Create HTTP server
    19: const httpServer = createServer(app);
    20: 
    21: // Create a Colyseus server using the same HTTP server
    22: const server = new Server({
    23:   transport: new WebSocketTransport({
    24:     server: httpServer,
    25:   }),
    26: });
    27: 
    28: // Register the game room
    29: server.define("game_room", GameRoom);
    30: 
    31: // Start the server using the shared HTTP server
    32: httpServer.listen(port, () => {
    33:   console.log(`🚀 Server running on http://localhost:${port}`);
    34: });
    35: 
```

## web\hooks\use-mobile.ts

```typescript
     1: import * as React from "react";
     2: 
     3: const MOBILE_BREAKPOINT = 768;
     4: 
     5: export function useIsMobile() {
     6:   const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
     7:     undefined,
     8:   );
     9: 
    10:   React.useEffect(() => {
    11:     const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    12:     const onChange = () => {
    13:       setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    14:     };
    15:     mql.addEventListener("change", onChange);
    16:     setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    17:     return () => mql.removeEventListener("change", onChange);
    18:   }, []);
    19: 
    20:   return !!isMobile;
    21: }
    22: 
```

## web\next-env.d.ts

```typescript
     1: /// <reference types="next" />
     2: /// <reference types="next/image-types/global" />
     3: 
     4: // NOTE: This file should not be edited
     5: // see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
     6: 
```

## web\game\sphere-tool.tsx

```tsx
     1: "use client";
     2: 
     3: import { useThree } from "@react-three/fiber";
     4: import { RigidBody } from "@react-three/rapier";
     5: import { useEffect, useRef, useState } from "react";
     6: import * as THREE from "three";
     7: import { useGamepad } from "@/hooks/use-gamepad";
     8: import { useMultiplayer } from "@/multiplayer/multiplayer-context";
     9: 
    10: const RAINBOW_COLORS = [
    11:   "#FF0000", // Red
    12:   "#FF7F00", // Orange
    13:   "#FFFF00", // Yellow
    14:   "#00FF00", // Green
    15:   "#0000FF", // Blue
    16:   "#4B0082", // Indigo
    17:   "#9400D3", // Violet
    18: ];
    19: 
    20: const SHOOT_FORCE = 45; // Speed factor for projectiles
    21: const SPHERE_OFFSET = {
    22:   x: 0.12, // Slightly to the right
    23:   y: -0.27, // Lower below crosshair
    24:   z: -1.7, // Offset even further back
    25: };
    26: 
    27: type SphereProps = {
    28:   id: string;
    29:   position: [number, number, number];
    30:   direction: [number, number, number];
    31:   color: string;
    32:   radius: number;
    33: };
    34: 
    35: // Sphere with physics
    36: const Sphere = ({ position, direction, color, radius }: SphereProps) => {
    37:   return (
    38:     <RigidBody
    39:       position={position}
    40:       friction={1}
    41:       angularDamping={0.2}
    42:       linearDamping={0.1}
    43:       restitution={0.5}
    44:       colliders="ball"
    45:       mass={1}
    46:       ccd={true}
    47:       linearVelocity={[
    48:         direction[0] * SHOOT_FORCE,
    49:         direction[1] * SHOOT_FORCE,
    50:         direction[2] * SHOOT_FORCE,
    51:       ]}
    52:     >
    53:       <mesh castShadow receiveShadow>
    54:         <sphereGeometry args={[radius, 32, 32]} />
    55:         <meshStandardMaterial color={color} />
    56:       </mesh>
    57:     </RigidBody>
    58:   );
    59: };
    60: 
    61: export const SphereTool = () => {
    62:   const sphereRadius = 0.11;
    63:   const MAX_AMMO = 50;
    64:   const PROJECTILE_LIFETIME = 10000; // 10 seconds
    65: 
    66:   const camera = useThree((s) => s.camera);
    67:   const [spheres, setSpheres] = useState<{ [key: string]: SphereProps }>({});
    68:   const [ammoCount, setAmmoCount] = useState(MAX_AMMO);
    69:   const [isReloading, setIsReloading] = useState(false);
    70:   const shootingInterval = useRef<number>();
    71:   const isPointerDown = useRef(false);
    72:   const gamepadState = useGamepad();
    73:   const { room, clientId } = useMultiplayer();
    74: 
    75:   // Listen for all spheres from the server
    76:   useEffect(() => {
    77:     if (!room) return;
    78: 
    79:     const handleStateChange = (state: any) => {
    80:       const updatedSpheres: { [key: string]: SphereProps } = {};
    81: 
    82:       state.projectiles.forEach((projectile: any, id: string) => {
    83:         updatedSpheres[id] = {
    84:           id,
    85:           position: [
    86:             projectile.position.x,
    87:             projectile.position.y,
    88:             projectile.position.z,
    89:           ],
    90:           direction: [
    91:             projectile.direction.x,
    92:             projectile.direction.y,
    93:             projectile.direction.z,
    94:           ],
    95:           color: projectile.color || RAINBOW_COLORS[0],
    96:           radius: sphereRadius,
    97:         };
    98:       });
    99: 
   100:       setSpheres(updatedSpheres);
   101:     };
   102: 
   103:     room.onStateChange(handleStateChange);
   104: 
   105:     // Initial state
   106:     if (room.state) {
   107:       handleStateChange(room.state);
   108:     }
   109: 
   110:     return () => {
   111:       // No cleanup needed as Colyseus handles this
   112:     };
   113:   }, [room]);
   114: 
   115:   // Clean up old spheres
   116:   useEffect(() => {
   117:     const cleanupInterval = setInterval(() => {
   118:       // We rely on the server to clean up old projectiles
   119:       // This is just to ensure our local state stays in sync
   120:     }, 1000);
   121: 
   122:     return () => clearInterval(cleanupInterval);
   123:   }, []);
   124: 
   125:   const reload = () => {
   126:     if (isReloading) return;
   127: 
   128:     setIsReloading(true);
   129:     // Simulate reload time
   130:     setTimeout(() => {
   131:       setAmmoCount(MAX_AMMO);
   132:       setIsReloading(false);
   133:     }, 1000);
   134:   };
   135: 
   136:   const shootSphere = () => {
   137:     const pointerLocked =
   138:       document.pointerLockElement !== null || gamepadState.connected;
   139:     if (!pointerLocked || isReloading || ammoCount <= 0 || !room) return;
   140: 
   141:     setAmmoCount((prev) => {
   142:       const newCount = prev - 1;
   143:       if (newCount <= 0) {
   144:         reload();
   145:       }
   146:       return newCount;
   147:     });
   148: 
   149:     const direction = camera.getWorldDirection(new THREE.Vector3());
   150: 
   151:     // Create offset vector in camera's local space
   152:     const offset = new THREE.Vector3(
   153:       SPHERE_OFFSET.x,
   154:       SPHERE_OFFSET.y,
   155:       SPHERE_OFFSET.z,
   156:     );
   157:     offset.applyQuaternion(camera.quaternion);
   158: 
   159:     const position = camera.position.clone().add(offset);
   160: 
   161:     // Normalize direction
   162:     direction.normalize();
   163: 
   164:     const randomColor =
   165:       RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];
   166: 
   167:     // Send to server for all clients
   168:     room.send("projectile:create", {
   169:       position: {
   170:         x: position.x,
   171:         y: position.y,
   172:         z: position.z,
   173:       },
   174:       direction: {
   175:         x: direction.x,
   176:         y: direction.y,
   177:         z: direction.z,
   178:       },
   179:       color: randomColor,
   180:     });
   181:   };
   182: 
   183:   const startShooting = () => {
   184:     isPointerDown.current = true;
   185:     shootSphere();
   186:     shootingInterval.current = window.setInterval(shootSphere, 80);
   187:   };
   188: 
   189:   const stopShooting = () => {
   190:     isPointerDown.current = false;
   191:     if (shootingInterval.current) {
   192:       clearInterval(shootingInterval.current);
   193:     }
   194:   };
   195: 
   196:   useEffect(() => {
   197:     window.addEventListener("pointerdown", startShooting);
   198:     window.addEventListener("pointerup", stopShooting);
   199: 
   200:     // Handle gamepad shooting
   201:     if (gamepadState.buttons.shoot) {
   202:       if (!isPointerDown.current) {
   203:         startShooting();
   204:       }
   205:     } else if (isPointerDown.current) {
   206:       stopShooting();
   207:     }
   208: 
   209:     return () => {
   210:       window.removeEventListener("pointerdown", startShooting);
   211:       window.removeEventListener("pointerup", stopShooting);
   212:     };
   213:   }, [camera, gamepadState.buttons.shoot]);
   214: 
   215:   // Show ammo counter
   216:   useEffect(() => {
   217:     const ammoDisplay = document.getElementById("ammo-display");
   218:     if (ammoDisplay) {
   219:       ammoDisplay.textContent = isReloading
   220:         ? "RELOADING..."
   221:         : `AMMO: ${ammoCount}/${MAX_AMMO}`;
   222:     }
   223:   }, [ammoCount, isReloading]);
   224: 
   225:   return (
   226:     <group>
   227:       {/* Render all spheres */}
   228:       {Object.values(spheres).map((props) => (
   229:         <Sphere key={`sphere-${props.id}`} {...props} />
   230:       ))}
   231:     </group>
   232:   );
   233: };
   234: 
```

## web\types.d.ts

```typescript
     1: import { ThreeElements } from "@react-three/fiber";
     2: 
     3: declare global {
     4:   namespace React {
     5:     namespace JSX {
     6:       interface IntrinsicElements extends ThreeElements {}
     7:     }
     8:   }
     9: }
    10: 
```

## web\components.json

```json
     1: {
     2:   "$schema": "https://ui.shadcn.com/schema.json",
     3:   "style": "new-york",
     4:   "rsc": true,
     5:   "tsx": true,
     6:   "tailwind": {
     7:     "config": "",
     8:     "css": "../../packages/ui/src/styles/globals.css",
     9:     "baseColor": "neutral",
    10:     "cssVariables": true
    11:   },
    12:   "iconLibrary": "lucide",
    13:   "aliases": {
    14:     "components": "@/components",
    15:     "hooks": "@/hooks",
    16:     "lib": "@/lib",
    17:     "utils": "@workspace/ui/lib/utils",
    18:     "ui": "@workspace/ui/components"
    19:   }
    20: }
    21: 
```

## web\eslint.config.js

```javascript
     1: import { nextJsConfig } from "@workspace/eslint-config/next-js"
     2: 
     3: /** @type {import("eslint").Linter.Config} */
     4: export default nextJsConfig
     5: 
```

## web\next.config.mjs

```javascript
     1: /** @type {import('next').NextConfig} */
     2: const nextConfig = {
     3:   transpilePackages: ["@workspace/ui",  "@workspace/shared"],
     4:     reactStrictMode: false,
     5: }
     6: 
     7: export default nextConfig
     8: 
```

## server\src\rooms\GameRoom.ts

```typescript
     1: import { GameRoomState, Player, Projectile } from "../schema/GameRoomState.js";
     2: import type { PlayerInput, ProjectileInput } from "@workspace/shared";
     3: 
     4: import type { Client } from "@colyseus/core";
     5: import { PlayerAnimation } from "@workspace/shared";
     6: import { Room } from "@colyseus/core";
     7: 
     8: export class GameRoom extends Room<GameRoomState> {
     9:   private projectileIdCounter = 0;
    10:   private readonly PROJECTILE_LIFETIME_MS = 10000; // 10 seconds
    11: 
    12:   onCreate() {
    13:     this.setState(new GameRoomState());
    14: 
    15:     // Handle player movement and rotation updates
    16:     this.onMessage("player:move", (client, message: PlayerInput) => {
    17:       const player = this.state.players.get(client.sessionId);
    18:       if (!player) return;
    19: 
    20:       // Update player position
    21:       player.position.x = message.position.x;
    22:       player.position.y = message.position.y;
    23:       player.position.z = message.position.z;
    24: 
    25:       // Update player rotation
    26:       player.rotation.x = message.rotation.x;
    27:       player.rotation.y = message.rotation.y;
    28:       player.rotation.z = message.rotation.z;
    29: 
    30:       // Update animation state
    31:       player.animation = message.animation;
    32:     });
    33: 
    34:     // Handle projectile creation
    35:     this.onMessage(
    36:       "projectile:create",
    37:       (client, message: ProjectileInput & { id?: string }) => {
    38:         // Use provided ID or generate one
    39:         const projectileId =
    40:           message.id || `${client.sessionId}_${this.projectileIdCounter++}`;
    41:         const projectile = new Projectile(projectileId, client.sessionId);
    42: 
    43:         // Set projectile position
    44:         projectile.position.x = message.position.x;
    45:         projectile.position.y = message.position.y;
    46:         projectile.position.z = message.position.z;
    47: 
    48:         // Set projectile direction
    49:         projectile.direction.x = message.direction.x;
    50:         projectile.direction.y = message.direction.y;
    51:         projectile.direction.z = message.direction.z;
    52: 
    53:         // Set projectile color
    54:         projectile.color = message.color;
    55: 
    56:         // Add projectile to state
    57:         this.state.projectiles.set(projectileId, projectile);
    58: 
    59:         // Remove projectile after a certain time
    60:         setTimeout(() => {
    61:           if (this.state.projectiles.has(projectileId)) {
    62:             this.state.projectiles.delete(projectileId);
    63:           }
    64:         }, this.PROJECTILE_LIFETIME_MS);
    65:       },
    66:     );
    67: 
    68:     // Set up a regular cleanup for projectiles
    69:     this.setSimulationInterval(() => this.cleanupProjectiles(), 1000);
    70:   }
    71: 
    72:   onJoin(client: Client) {
    73:     console.log(`Client joined: ${client.sessionId}`);
    74: 
    75:     // Create a new player
    76:     const player = new Player(client.sessionId);
    77: 
    78:     // Set initial position (random position within the arena)
    79:     player.position.x = Math.random() * 40 - 20; // -20 to 20
    80:     player.position.y = 1;
    81:     player.position.z = Math.random() * 40 - 20; // -20 to 20
    82: 
    83:     // Set initial animation
    84:     player.animation = PlayerAnimation.IDLE;
    85: 
    86:     // Add player to the room state
    87:     this.state.players.set(client.sessionId, player);
    88:   }
    89: 
    90:   onLeave(client: Client) {
    91:     console.log(`Client left: ${client.sessionId}`);
    92: 
    93:     // Remove player from the room state
    94:     if (this.state.players.has(client.sessionId)) {
    95:       this.state.players.delete(client.sessionId);
    96:     }
    97: 
    98:     // Clean up any projectiles owned by this player
    99:     this.cleanupPlayerProjectiles(client.sessionId);
   100:   }
   101: 
   102:   private cleanupProjectiles() {
   103:     const now = Date.now();
   104: 
   105:     // Remove projectiles that have exceeded their lifetime
   106:     this.state.projectiles.forEach((projectile, key) => {
   107:       if (now - projectile.timestamp > this.PROJECTILE_LIFETIME_MS) {
   108:         this.state.projectiles.delete(key);
   109:       }
   110:     });
   111:   }
   112: 
   113:   private cleanupPlayerProjectiles(playerId: string) {
   114:     // Remove all projectiles owned by the player who left
   115:     this.state.projectiles.forEach((projectile, key) => {
   116:       if (projectile.ownerId === playerId) {
   117:         this.state.projectiles.delete(key);
   118:       }
   119:     });
   120:   }
   121: }
   122: 
```

## web\lib\.gitkeep

```
     1: 
```

## web\hooks\.gitkeep

```
     1: 
```

## web\package.json

```json
     1: {
     2:   "name": "web",
     3:   "version": "0.0.1",
     4:   "type": "module",
     5:   "private": true,
     6:   "scripts": {
     7:     "dev": "next dev --turbopack",
     8:     "build": "next build",
     9:     "start": "next start",
    10:     "lint": "next lint",
    11:     "lint:fix": "next lint --fix",
    12:     "typecheck": "tsc --noEmit"
    13:   },
    14:   "dependencies": {
    15:     "@colyseus/schema": "^2.0.0",
    16:     "@dimforge/rapier3d-compat": "^0.11.2",
    17:     "@hookform/resolvers": "^4.1.3",
    18:     "@radix-ui/react-accordion": "^1.2.3",
    19:     "@radix-ui/react-alert-dialog": "^1.1.6",
    20:     "@radix-ui/react-aspect-ratio": "^1.1.2",
    21:     "@radix-ui/react-avatar": "^1.1.3",
    22:     "@radix-ui/react-checkbox": "^1.1.4",
    23:     "@radix-ui/react-collapsible": "^1.1.3",
    24:     "@radix-ui/react-context-menu": "^2.2.6",
    25:     "@radix-ui/react-dialog": "^1.1.6",
    26:     "@radix-ui/react-dropdown-menu": "^2.1.6",
    27:     "@radix-ui/react-hover-card": "^1.1.6",
    28:     "@radix-ui/react-label": "^2.1.2",
    29:     "@radix-ui/react-menubar": "^1.1.6",
    30:     "@radix-ui/react-navigation-menu": "^1.2.5",
    31:     "@radix-ui/react-popover": "^1.1.6",
    32:     "@radix-ui/react-progress": "^1.1.2",
    33:     "@radix-ui/react-radio-group": "^1.2.3",
    34:     "@radix-ui/react-scroll-area": "^1.2.3",
    35:     "@radix-ui/react-select": "^2.1.6",
    36:     "@radix-ui/react-separator": "^1.1.2",
    37:     "@radix-ui/react-slider": "^1.2.3",
    38:     "@radix-ui/react-slot": "^1.1.2",
    39:     "@radix-ui/react-switch": "^1.1.3",
    40:     "@radix-ui/react-tabs": "^1.1.3",
    41:     "@radix-ui/react-toggle": "^1.1.2",
    42:     "@radix-ui/react-toggle-group": "^1.1.2",
    43:     "@radix-ui/react-tooltip": "^1.1.8",
    44:     "@react-three/drei": "^9.88.0",
    45:     "@react-three/fiber": "^9.1.0",
    46:     "@react-three/postprocessing": "^3.0.4",
    47:     "@react-three/rapier": "^1.1.1",
    48:     "@workspace/shared": "workspace:*",
    49:     "@workspace/ui": "workspace:*",
    50:     "arancini": "^8.0.0",
    51:     "class-variance-authority": "^0.7.1",
    52:     "clsx": "^2.0.0",
    53:     "cmdk": "1.0.4",
    54:     "colyseus.js": "^0.15.27",
    55:     "date-fns": "^4.1.0",
    56:     "embla-carousel-react": "^8.5.2",
    57:     "input-otp": "^1.4.2",
    58:     "leva": "^0.10.0",
    59:     "lucide-react": "^0.475.0",
    60:     "next": "^15.2.0",
    61:     "next-themes": "^0.4.4",
    62:     "postprocessing": "^6.33.4",
    63:     "react": "^18.2.0",
    64:     "react-day-picker": "8.10.1",
    65:     "react-dom": "^18.2.0",
    66:     "react-hook-form": "^7.54.2",
    67:     "react-resizable-panels": "^2.1.7",
    68:     "recharts": "^2.15.1",
    69:     "sonner": "^2.0.1",
    70:     "three": "^0.157.0",
    71:     "vaul": "^1.1.2",
    72:     "zod": "^3.24.2"
    73:   },
    74:   "devDependencies": {
    75:     "@types/node": "^20",
    76:     "@types/react": "^18.3.5",
    77:     "@types/react-dom": "^18.3.0",
    78:     "@types/three": "^0.157.2",
    79:     "@workspace/eslint-config": "workspace:^",
    80:     "@workspace/typescript-config": "workspace:*",
    81:     "typescript": "^5.7.3"
    82:   }
    83: }
    84: 
```

## server\src\schema\GameRoomState.ts

```typescript
     1: import { MapSchema, Schema, type } from "@colyseus/schema";
     2: 
     3: class Vector3 extends Schema {
     4:   @type("number") x = 0;
     5:   @type("number") y = 0;
     6:   @type("number") z = 0;
     7: }
     8: 
     9: class Quaternion extends Schema {
    10:   @type("number") x = 0;
    11:   @type("number") y = 0;
    12:   @type("number") z = 0;
    13:   @type("number") w = 1;
    14: }
    15: 
    16: export class Player extends Schema {
    17:   @type("string") id: string;
    18:   @type(Vector3) position = new Vector3();
    19:   @type(Quaternion) rotation = new Quaternion();
    20:   @type("string") animation = "idle";
    21: 
    22:   constructor(id: string) {
    23:     super();
    24:     this.id = id;
    25:   }
    26: }
    27: 
    28: export class Projectile extends Schema {
    29:   @type("string") id: string;
    30:   @type(Vector3) position = new Vector3();
    31:   @type(Vector3) direction = new Vector3();
    32:   @type("string") color = "white"; // Initialize with a default value
    33:   @type("string") ownerId: string;
    34:   @type("number") timestamp: number;
    35: 
    36:   constructor(id: string, ownerId: string) {
    37:     super();
    38:     this.id = id;
    39:     this.ownerId = ownerId;
    40:     this.timestamp = Date.now();
    41:   }
    42: }
    43: 
    44: export class GameRoomState extends Schema {
    45:   @type({ map: Player }) players = new MapSchema<Player>();
    46:   @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
    47: }
    48: 
```

## web\game\ball.tsx

```tsx
     1: "use client";
     2: 
     3: import { RigidBody } from "@react-three/rapier";
     4: import { useTexture } from "@react-three/drei";
     5: import * as THREE from "three";
     6: 
     7: export const Ball = () => {
     8:   const texture = useTexture("/final-texture.png");
     9:   texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    10:   texture.repeat.set(1, 1);
    11: 
    12:   return (
    13:     <RigidBody
    14:       colliders="ball"
    15:       restitution={0.5}
    16:       friction={0.3}
    17:       position={[0, 3, -15]}
    18:       linearDamping={0.05}
    19:       angularDamping={0.05}
    20:       mass={0.5}
    21:     >
    22:       <mesh castShadow receiveShadow>
    23:         <sphereGeometry args={[2, 32, 32]} />
    24:         <meshStandardMaterial map={texture} roughness={0.9} metalness={0} />
    25:       </mesh>
    26:     </RigidBody>
    27:   );
    28: };
    29: 
```

## web\components\.gitkeep

```
     1: 
```

## web\hooks\use-const.ts

```typescript
     1: "use client";
     2: 
     3: import { useRef } from "react";
     4: 
     5: export function useConst<T>(factory: () => T): T {
     6:   const ref = useRef<{ value: T }>();
     7: 
     8:   if (ref.current === undefined) {
     9:     ref.current = { value: factory() };
    10:   }
    11: 
    12:   return ref.current.value;
    13: }
    14: 
```

## web\postcss.config.mjs

```javascript
     1: export { default } from "@workspace/ui/postcss.config";
```

## server\tsconfig.json

```json
     1: {
     2:   "compilerOptions": {
     3:     "target": "es5",
     4:     "module": "esnext",
     5:     "moduleResolution": "bundler",
     6:     "esModuleInterop": true,
     7:     "strict": true,
     8:     "outDir": "dist",
     9:     "sourceMap": true,
    10:     "declaration": true,
    11:     "experimentalDecorators": true,
    12:     "emitDecoratorMetadata": true,
    13:     "skipLibCheck": true,
    14:     "forceConsistentCasingInFileNames": true,
    15:     "baseUrl": ".",
    16:     "paths": {
    17:       "@/*": ["./src/*"],
    18:       "@workspace/shared": ["../../packages/shared/src"],
    19:       "@workspace/shared/*": ["../../packages/shared/src/*"]
    20:     }
    21:   },
    22:   "ts-node": {
    23:     "esm": true,
    24:     "experimentalSpecifierResolution": "node"
    25:   },
    26:   "include": ["src/**/*"],
    27:   "exclude": ["node_modules", "dist"]
    28: }
    29: 
    30: 
```

## web\game\ecs.ts

```typescript
     1: "use client";
     2: 
     3: import type { RapierRigidBody } from "@react-three/rapier";
     4: import { World } from "arancini";
     5: import { createReactAPI } from "arancini/react";
     6: import type * as THREE from "three";
     7: 
     8: export type EntityType = {
     9:   isPlayer?: true;
    10:   three?: THREE.Object3D;
    11:   rigidBody?: RapierRigidBody;
    12: };
    13: 
    14: export const world = new World<EntityType>();
    15: 
    16: export const playerQuery = world.query((e) => e.has("isPlayer", "rigidBody"));
    17: 
    18: const { Entity, Component } = createReactAPI(world);
    19: 
    20: export { Component, Entity };
    21: 
```

## web\multiplayer\.gitkeep

```
     1: 
```

## web\components\canvas.tsx

```tsx
     1: "use client";
     2: 
     3: import { Canvas as ThreeCanvas } from "@react-three/fiber";
     4: import type { ReactNode } from "react";
     5: 
     6: type CanvasProps = {
     7:   children: ReactNode;
     8: };
     9: 
    10: export function Canvas({ children }: CanvasProps) {
    11:   return (
    12:     <ThreeCanvas
    13:       shadows
    14:       camera={{ position: [0, 0, 5], fov: 90 }}
    15:       gl={{ antialias: true }}
    16:     >
    17:       {children}
    18:     </ThreeCanvas>
    19:   );
    20: }
    21: 
```

## web\hooks\use-gamepad.ts

```typescript
     1: "use client";
     2: 
     3: import { useEffect, useRef, useState } from "react";
     4: import { useFrame } from "@react-three/fiber";
     5: 
     6: // Optimized deadzone values for better control
     7: const STICK_DEADZONE = 0.15;
     8: const TRIGGER_DEADZONE = 0.1;
     9: 
    10: // Stick response curve for more precise aiming
    11: const applyCurve = (value: number): number => {
    12:   const sign = Math.sign(value);
    13:   const abs = Math.abs(value);
    14:   return sign * Math.pow(abs, 1.5); // Exponential response curve for better precision
    15: };
    16: 
    17: export type GamepadState = {
    18:   leftStick: { x: number; y: number };
    19:   rightStick: { x: number; y: number };
    20:   buttons: {
    21:     jump: boolean;
    22:     leftStickPress: boolean;
    23:     shoot: boolean;
    24:   };
    25:   connected: boolean;
    26: };
    27: 
    28: export function useGamepad() {
    29:   const [gamepadState, setGamepadState] = useState<GamepadState>({
    30:     leftStick: { x: 0, y: 0 },
    31:     rightStick: { x: 0, y: 0 },
    32:     buttons: {
    33:       jump: false,
    34:       shoot: false,
    35:       leftStickPress: false,
    36:     },
    37:     connected: false,
    38:   });
    39: 
    40:   const previousButtonStates = useRef({
    41:     jump: false,
    42:     sprint: false,
    43:     leftStickPress: false,
    44:     shoot: false,
    45:   });
    46: 
    47:   useFrame(() => {
    48:     const gamepad = navigator.getGamepads()[0];
    49:     if (!gamepad) return;
    50: 
    51:     // Process movement stick with deadzone
    52:     const leftX =
    53:       Math.abs(gamepad.axes[0]) > STICK_DEADZONE ? gamepad.axes[0] : 0;
    54:     const leftY =
    55:       Math.abs(gamepad.axes[1]) > STICK_DEADZONE ? gamepad.axes[1] : 0;
    56: 
    57:     // Process aim stick with response curve for better precision
    58:     const rightX =
    59:       Math.abs(gamepad.axes[2]) > STICK_DEADZONE
    60:         ? applyCurve(gamepad.axes[2])
    61:         : 0;
    62:     const rightY =
    63:       Math.abs(gamepad.axes[3]) > STICK_DEADZONE
    64:         ? applyCurve(gamepad.axes[3])
    65:         : 0;
    66: 
    67:     // Map gamepad buttons to actions
    68:     const jumpButton = gamepad.buttons[0].pressed; // A button
    69:     const leftStickPress = gamepad.buttons[10].pressed; // L3 button
    70:     const shootButton = gamepad.buttons[7].value > TRIGGER_DEADZONE; // RT button with analog support
    71: 
    72:     setGamepadState({
    73:       leftStick: { x: leftX, y: leftY },
    74:       rightStick: { x: rightX, y: rightY },
    75:       buttons: {
    76:         jump: jumpButton,
    77:         leftStickPress: leftStickPress,
    78:         shoot: shootButton,
    79:       },
    80:       connected: true,
    81:     });
    82: 
    83:     // Store current button states for next frame
    84:     previousButtonStates.current = {
    85:       jump: jumpButton,
    86:       leftStickPress: leftStickPress,
    87:       shoot: shootButton,
    88:       sprint: false,
    89:     };
    90:   });
    91: 
    92:   useEffect(() => {
    93:     const handleGamepadConnected = (e: GamepadEvent) => {
    94:       console.log("Gamepad connected:", e.gamepad.id);
    95:     };
    96: 
    97:     const handleGamepadDisconnected = (e: GamepadEvent) => {
    98:       console.log("Gamepad disconnected:", e.gamepad.id);
    99:       setGamepadState((prev) => ({ ...prev, connected: false }));
   100:     };
   101: 
   102:     window.addEventListener("gamepadconnected", handleGamepadConnected);
   103:     window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
   104: 
   105:     return () => {
   106:       window.removeEventListener("gamepadconnected", handleGamepadConnected);
   107:       window.removeEventListener(
   108:         "gamepaddisconnected",
   109:         handleGamepadDisconnected,
   110:       );
   111:     };
   112:   }, []);
   113: 
   114:   return gamepadState;
   115: }
   116: 
```

## web\game\platforms.tsx

```tsx
     1: "use client";
     2: 
     3: import { RigidBody } from "@react-three/rapier";
     4: import * as THREE from "three";
     5: import { useTexture } from "@react-three/drei";
     6: 
     7: type BoxDimensions = [width: number, height: number, depth: number];
     8: 
     9: const boxes = [
    10:   { position: [5, 0, -5] as const, size: [4, 4, 4] as BoxDimensions },
    11:   { position: [-5, 0, -5] as const, size: [4, 4, 4] as BoxDimensions },
    12:   { position: [15, 0, 5] as const, size: [4, 4, 4] as BoxDimensions },
    13:   { position: [-15, 0, 5] as const, size: [4, 4, 4] as BoxDimensions },
    14:   { position: [0, 0, 15] as const, size: [4, 4, 4] as BoxDimensions },
    15:   { position: [10, 0, -15] as const, size: [4, 4, 4] as BoxDimensions },
    16:   { position: [-10, 0, -15] as const, size: [4, 4, 4] as BoxDimensions },
    17: ];
    18: 
    19: export function Platforms() {
    20:   const texture = useTexture("/final-texture.png");
    21:   texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    22: 
    23:   const platformTexture = texture.clone();
    24:   platformTexture.wrapS = platformTexture.wrapT = THREE.RepeatWrapping;
    25:   platformTexture.repeat.set(1, 1); // Scale texture to match each face of the 4x4x4 boxes
    26: 
    27:   return (
    28:     <group>
    29:       {boxes.map(({ position, size }, index) => (
    30:         <RigidBody
    31:           key={index}
    32:           type="fixed"
    33:           position={position}
    34:           colliders="cuboid"
    35:           friction={0.1}
    36:           restitution={0}
    37:         >
    38:           <mesh castShadow receiveShadow>
    39:             <boxGeometry args={size} />
    40:             <meshStandardMaterial
    41:               map={platformTexture}
    42:               side={THREE.DoubleSide}
    43:               roughness={0.8}
    44:               metalness={0.1}
    45:             />
    46:           </mesh>
    47:         </RigidBody>
    48:       ))}
    49:     </group>
    50:   );
    51: }
    52: 
```

## web\multiplayer\connection-status.tsx

```tsx
     1: "use client";
     2: 
     3: import type React from "react";
     4: import { useEffect, useState } from "react";
     5: import { useMultiplayer } from "./multiplayer-context";
     6: 
     7: export const ConnectionStatus: React.FC = () => {
     8:   const { connected, room, clientId } = useMultiplayer();
     9:   const [playerCount, setPlayerCount] = useState(0);
    10: 
    11:   useEffect(() => {
    12:     if (room) {
    13:       // Update player count when state changes
    14:       const handleStateChange = (state: any) => {
    15:         setPlayerCount(state.players.size);
    16:       };
    17: 
    18:       room.onStateChange(handleStateChange);
    19: 
    20:       // Initial player count
    21:       if (room.state && room.state.players) {
    22:         setPlayerCount(room.state.players.size);
    23:       }
    24:     }
    25:   }, [room]);
    26: 
    27:   return (
    28:     <div
    29:       style={{
    30:         position: "absolute",
    31:         top: "50px",
    32:         left: "10px",
    33:         background: "rgba(0, 0, 0, 0.5)",
    34:         color: "white",
    35:         padding: "10px",
    36:         borderRadius: "5px",
    37:         fontFamily: "monospace",
    38:         zIndex: 1000,
    39:       }}
    40:     >
    41:       <div>Connection: {connected ? "✅ Connected" : "❌ Disconnected"}</div>
    42:       <div>Room ID: {room?.id || "None"}</div>
    43:       <div>Client ID: {clientId || "None"}</div>
    44:       <div>Players in room: {playerCount}</div>
    45:     </div>
    46:   );
    47: };
    48: 
```

## web\components\crosshair.tsx

```tsx
     1: "use client";
     2: 
     3: export function Crosshair() {
     4:   return (
     5:     <>
     6:       <div
     7:         style={{
     8:           position: "absolute",
     9:           top: "50%",
    10:           marginTop: "10px",
    11:           left: "50%",
    12:           transform: "translate(-50%, -50%) rotate(45deg)",
    13:           width: "12px",
    14:           height: "2px",
    15:           background: "rgba(255, 255, 255, 0.5)",
    16:           pointerEvents: "none",
    17:         }}
    18:       />
    19:       <div
    20:         style={{
    21:           position: "absolute",
    22:           top: "50%",
    23:           marginTop: "10px",
    24:           left: "50%",
    25:           transform: "translate(-50%, -50%) rotate(-45deg)",
    26:           width: "12px",
    27:           height: "2px",
    28:           background: "rgba(255, 255, 255, 0.5)",
    29:           pointerEvents: "none",
    30:         }}
    31:       />
    32:     </>
    33:   );
    34: }
    35: 
```

## web\hooks\use-interval.ts

```typescript
     1: "use client";
     2: 
     3: import { useEffect, useRef } from "react";
     4: 
     5: export function useInterval(callback: () => void, delay: number) {
     6:   const savedCallback = useRef<() => void>();
     7: 
     8:   // Remember the latest callback
     9:   useEffect(() => {
    10:     savedCallback.current = callback;
    11:   }, [callback]);
    12: 
    13:   // Set up the interval
    14:   useEffect(() => {
    15:     function tick() {
    16:       savedCallback.current?.();
    17:     }
    18:     if (delay !== null) {
    19:       const id = setInterval(tick, delay);
    20:       return () => clearInterval(id);
    21:     }
    22:   }, [delay]);
    23: }
    24: 
```

## web\multiplayer\multiplayer-context.tsx

```tsx
     1: "use client";
     2: 
     3: import { Client, type Room } from "colyseus.js";
     4: import type React from "react";
     5: import {
     6:   createContext,
     7:   type ReactNode,
     8:   useContext,
     9:   useEffect,
    10:   useState,
    11: } from "react";
    12: 
    13: interface MultiplayerContextType {
    14:   connected: boolean;
    15:   room: Room | null;
    16:   clientId: string;
    17: }
    18: 
    19: const defaultContext: MultiplayerContextType = {
    20:   connected: false,
    21:   room: null,
    22:   clientId: "",
    23: };
    24: 
    25: const MultiplayerContext =
    26:   createContext<MultiplayerContextType>(defaultContext);
    27: 
    28: export const useMultiplayer = () => useContext(MultiplayerContext);
    29: 
    30: interface MultiplayerProviderProps {
    31:   children: ReactNode;
    32: }
    33: 
    34: export const MultiplayerProvider: React.FC<MultiplayerProviderProps> = ({
    35:   children,
    36: }) => {
    37:   const [client] = useState(new Client("ws://localhost:3001"));
    38:   const [room, setRoom] = useState<Room | null>(null);
    39:   const [connected, setConnected] = useState(false);
    40:   const [clientId, setClientId] = useState("");
    41: 
    42:   useEffect(() => {
    43:     const connectToServer = async () => {
    44:       try {
    45:         console.log("Connecting to game server...");
    46:         const joinedRoom = await client.joinOrCreate("game_room");
    47:         console.log("Connected to room:", joinedRoom.id);
    48: 
    49:         setRoom(joinedRoom);
    50:         setConnected(true);
    51:         setClientId(joinedRoom.sessionId);
    52: 
    53:         // Handle disconnection
    54:         joinedRoom.onLeave((code) => {
    55:           console.log("Left room", code);
    56:           setConnected(false);
    57:           setRoom(null);
    58:         });
    59:       } catch (error) {
    60:         console.error("Could not connect to server:", error);
    61:         setConnected(false);
    62:       }
    63:     };
    64: 
    65:     connectToServer();
    66: 
    67:     return () => {
    68:       if (room) {
    69:         room.leave();
    70:       }
    71:     };
    72:   }, [client]);
    73: 
    74:   return (
    75:     <MultiplayerContext.Provider
    76:       value={{
    77:         connected,
    78:         room,
    79:         clientId,
    80:       }}
    81:     >
    82:       {children}
    83:     </MultiplayerContext.Provider>
    84:   );
    85: };
    86: 
```

