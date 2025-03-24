"use client";

import { Canvas as ThreeCanvas } from "@react-three/fiber";
import type { ReactNode } from "react";

type CanvasProps = {
  children: ReactNode;
};

export function Canvas({ children }: CanvasProps) {
  return (
    <ThreeCanvas
      shadows
      camera={{ position: [0, 0, 5], fov: 90 }}
      gl={{ antialias: true }}
    >
      {children}
    </ThreeCanvas>
  );
}
