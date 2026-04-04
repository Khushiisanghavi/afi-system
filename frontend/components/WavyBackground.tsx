"use client";
import { useEffect, useRef } from "react";

export default function WavyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let time = 0;
    let animationFrameId: number;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", resize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Using screen blending to create bright, additive glowing intersections
      ctx.globalCompositeOperation = "screen";

      const lines = 18;
      for (let i = 0; i < lines; i++) {
        ctx.beginPath();

        for (let x = 0; x <= width; x += 15) {
          let y = height / 2;

          // The core undulating wave structure that twists and narrows over time
          let spread = Math.sin(time * 0.4 + x / 400) * (height * 0.25);
          let yOffset = Math.sin(time * 0.8 + x / 300 + i * 0.12) * spread;

          if (x === 0) ctx.moveTo(x, y + yOffset);
          else ctx.lineTo(x, y + yOffset);
        }

        // Color mapping from deep blue to purple and hot pink to mimic reference image
        let hue = 250 + (i / lines) * 75; // 250 to 325
        ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 0.18)`;
        ctx.lineWidth = 2.5;

        // Soft, diffused glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${hue}, 100%, 65%, 0.2)`;

        ctx.stroke();
      }

      time += 0.012;
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.85,
        mixBlendMode: "screen",
      }}
    />
  );
}
