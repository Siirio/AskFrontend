import { useEffect, useRef } from "react";
import { useMotion } from "../../app/providers/MotionProvider";

const RADIUS = 160;
const TILE_SIZE = 9;
const TILE_GAP = 7;
const LERP = 0.16;

export function HomeCursorSurface() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reduced } = useMotion();

  useEffect(() => {
    if (reduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!finePointer.matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let targetPresence = 0;
    let presence = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const handleMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        targetPresence = 0;
        return;
      }
      targetX = x;
      targetY = y;
      targetPresence = 1;
    };

    const handleLeave = () => {
      targetPresence = 0;
    };

    const drawTile = (x: number, y: number, distance: number, angle: number) => {
      const force = Math.max(0, 1 - distance / RADIUS);
      const eased = force * force * presence;
      if (eased < 0.015) return;

      const repel = eased * 14;
      const lift = eased * 10;
      const size = TILE_SIZE + eased * 3;
      const drawX = x + Math.cos(angle) * repel;
      const drawY = y + Math.sin(angle) * repel - lift;
      const alpha = Math.min(0.52, eased * 0.58);
      const radius = 2 + eased * 2;

      context.save();
      context.translate(drawX, drawY);
      context.rotate(Math.sin(angle) * eased * 0.22);
      context.globalAlpha = alpha;
      context.shadowColor = "rgba(114, 73, 42, 0.18)";
      context.shadowBlur = 10 * eased;
      context.shadowOffsetY = 5 * eased;
      context.fillStyle = "rgba(255, 246, 235, 0.9)";
      context.strokeStyle = "rgba(232, 130, 78, 0.28)";
      context.lineWidth = 1;
      context.beginPath();
      context.roundRect(-size / 2, -size / 2, size, size, radius);
      context.fill();
      context.stroke();
      context.globalAlpha = alpha * 0.65;
      context.fillStyle = "rgba(232, 130, 78, 0.22)";
      context.fillRect(-size / 2 + 1.5, -size / 2 + 1.5, size - 3, 1.2);
      context.restore();
    };

    const render = () => {
      currentX += (targetX - currentX) * LERP;
      currentY += (targetY - currentY) * LERP;
      presence += (targetPresence - presence) * 0.12;
      context.clearRect(0, 0, width, height);

      if (presence > 0.01) {
        const step = TILE_SIZE + TILE_GAP;
        const startX = Math.floor((currentX - RADIUS) / step) * step;
        const endX = currentX + RADIUS;
        const startY = Math.floor((currentY - RADIUS) / step) * step;
        const endY = currentY + RADIUS;

        for (let y = startY; y <= endY; y += step) {
          for (let x = startX; x <= endX; x += step) {
            const dx = x - currentX;
            const dy = y - currentY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= RADIUS) {
              drawTile(x, y, distance, Math.atan2(dy, dx));
            }
          }
        }
      }

      frame = window.requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("mouseleave", handleLeave);
    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, [reduced]);

  if (reduced) return null;

  return <canvas ref={canvasRef} className="home-cursor-canvas" aria-hidden="true" />;
}
