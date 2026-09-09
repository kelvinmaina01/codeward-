import { useEffect, useRef } from "react";

type Particle = {
  baseX: number;
  baseY: number;
  baseZ: number;
  x: number;
  y: number;
  z: number;
  size: number;
};

export const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Build a sphere of particles using a Fibonacci lattice
    const COUNT = 700;
    const particles: Particle[] = [];
    for (let i = 0; i < COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);
      particles.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        x,
        y,
        z,
        size: 0.8 + Math.random() * 1.2,
      });
    }

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouse.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", resize);

    let raf = 0;
    let t = 0;
    const render = () => {
      t += 0.0025;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Sphere positioned to the left side of the hero
      const cx = width * 0.32;
      const cy = height * 0.5;
      const radius = Math.min(width, height) * 0.55;

      const ry = t + mouse.x * 0.6;
      const rx = Math.sin(t * 0.7) * 0.15 + mouse.y * 0.3;

      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // rotate Y
        const x1 = p.baseX * cosY - p.baseZ * sinY;
        const z1 = p.baseX * sinY + p.baseZ * cosY;
        // rotate X
        const y2 = p.baseY * cosX - z1 * sinX;
        const z2 = p.baseY * sinX + z1 * cosX;

        const depth = (z2 + 1) / 2; // 0 = back, 1 = front
        const px = cx + x1 * radius;
        const py = cy + y2 * radius;
        const size = p.size * (0.4 + depth * 1.4);
        const alpha = 0.15 + depth * 0.75;

        ctx.beginPath();
        ctx.fillStyle = `rgba(120, 160, 255, ${alpha})`;
        ctx.shadowColor = "rgba(80, 130, 255, 0.9)";
        ctx.shadowBlur = 8 * depth;
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
};
