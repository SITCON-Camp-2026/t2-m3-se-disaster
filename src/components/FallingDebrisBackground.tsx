import { useEffect, useRef } from "react";

type DebrisKind = "rock" | "fire" | "water" | "flag";

type Debris = {
  angle: number;
  angularVelocity: number;
  floorOffset: number;
  kind: DebrisKind;
  radius: number;
  scale: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type CollisionBox = {
  halfHeight: number;
  halfWidth: number;
};

const debrisKinds: DebrisKind[] = ["rock", "fire", "water", "flag"];

export function FallingDebrisBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (window.navigator.userAgent.includes("jsdom")) {
      return;
    }

    let context: CanvasRenderingContext2D | null;
    try {
      context = canvas.getContext("2d");
    } catch {
      return;
    }

    if (!context) {
      return;
    }

    const activeCanvas = canvas;
    const drawingContext = context;
    let animationFrame = 0;
    let lastTime = performance.now();
    let lastScrollY = window.scrollY;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let debris = createDebris(width, height);

    function resizeCanvas() {
      const pixelRatio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      activeCanvas.width = Math.floor(width * pixelRatio);
      activeCanvas.height = Math.floor(height * pixelRatio);
      activeCanvas.style.width = `${width}px`;
      activeCanvas.style.height = `${height}px`;
      drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      debris = debris.map((item) => ({
        ...item,
        x: Math.min(
          Math.max(collisionBox(item).halfWidth, item.x),
          width - collisionBox(item).halfWidth,
        ),
        y: Math.min(
          item.y,
          height - collisionBox(item).halfHeight - item.floorOffset,
        ),
      }));
    }

    function pushFromScroll() {
      const scrollDelta = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;

      if (Math.abs(scrollDelta) < 1) {
        return;
      }

      debris = debris.map((item, index) => ({
        ...item,
        vx:
          item.vx +
          Math.sin(index * 1.7 + window.scrollY * 0.015) *
            Math.min(9, Math.abs(scrollDelta) * 0.04),
        vy:
          item.vy -
          Math.sign(scrollDelta) * Math.min(11, Math.abs(scrollDelta) * 0.05),
        angularVelocity:
          item.angularVelocity +
          Math.sign(scrollDelta) * (0.018 + (index % 4) * 0.004),
      }));
    }

    function tick(now: number) {
      const delta = Math.min(32, now - lastTime) / 16.67;
      lastTime = now;
      drawingContext.clearRect(0, 0, width, height);

      for (const item of debris) {
        const box = collisionBox(item);
        item.vy += 0.34 * delta;
        item.vx *= 0.996;
        item.vy *= 0.999;
        item.x += item.vx * delta;
        item.y += item.vy * delta;
        item.angle += item.angularVelocity * delta;

        const floor = height - box.halfHeight - item.floorOffset;
        if (item.y > floor) {
          item.y = floor;
          item.vy *= -0.48;
          item.vx *= 0.86;
          item.angularVelocity *= 0.82;
        }

        if (item.x < box.halfWidth) {
          item.x = box.halfWidth;
          item.vx = Math.abs(item.vx) * 0.72;
        } else if (item.x > width - box.halfWidth) {
          item.x = width - box.halfWidth;
          item.vx = -Math.abs(item.vx) * 0.72;
        }
      }

      resolveDebrisCollisions(debris);

      for (const item of debris) {
        drawDebris(drawingContext, item);
      }

      animationFrame = requestAnimationFrame(tick);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("scroll", pushFromScroll, { passive: true });
    animationFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("scroll", pushFromScroll);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="disaster-physics-background"
      ref={canvasRef}
    />
  );
}

function createDebris(width: number, height: number): Debris[] {
  return Array.from({ length: 150 }, (_, index) => {
    const kind = debrisKinds[index % debrisKinds.length];
    const radius = kind === "flag" ? 28 : 14 + (index % 5) * 3;

    return {
      angle: (index * Math.PI) / 7,
      angularVelocity:
        (index % 2 === 0 ? 1 : -1) * (0.018 + (index % 5) * 0.006),
      floorOffset: (index % 6) * 5,
      kind,
      radius,
      scale: 0.58 + (index % 7) * 0.052,
      vx: ((index % 7) - 3) * 0.26,
      vy: 0.28 + (index % 6) * 0.16,
      x: 26 + ((index * 97) % Math.max(80, width - 52)),
      y: -height * 0.24 - index * 12,
    };
  });
}

function collisionBox(item: Debris): CollisionBox {
  if (item.kind === "flag") {
    return {
      halfHeight: item.radius * item.scale * 0.46,
      halfWidth: item.radius * item.scale * 0.84,
    };
  }

  if (item.kind === "fire" || item.kind === "water") {
    return {
      halfHeight: item.radius * item.scale * 0.9,
      halfWidth: item.radius * item.scale * 0.48,
    };
  }

  return {
    halfHeight: item.radius * item.scale * 0.58,
    halfWidth: item.radius * item.scale * 0.72,
  };
}

function resolveDebrisCollisions(debris: Debris[]) {
  for (let index = 0; index < debris.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < debris.length; nextIndex += 1) {
      const first = debris[index];
      const second = debris[nextIndex];
      const firstBox = collisionBox(first);
      const secondBox = collisionBox(second);
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const overlapX = firstBox.halfWidth + secondBox.halfWidth - Math.abs(dx);
      const overlapY =
        firstBox.halfHeight + secondBox.halfHeight - Math.abs(dy);

      if (overlapX <= 0 || overlapY <= 0) {
        continue;
      }

      const resolveOnX = overlapX < overlapY;
      const nx = resolveOnX ? Math.sign(dx || 1) : 0;
      const ny = resolveOnX ? 0 : Math.sign(dy || 1);
      const overlap = resolveOnX ? overlapX : overlapY;
      const firstMass = firstBox.halfWidth * firstBox.halfHeight;
      const secondMass = secondBox.halfWidth * secondBox.halfHeight;
      const totalMass = firstMass + secondMass;

      first.x -= nx * overlap * (secondMass / totalMass);
      first.y -= ny * overlap * (secondMass / totalMass);
      second.x += nx * overlap * (firstMass / totalMass);
      second.y += ny * overlap * (firstMass / totalMass);

      const relativeVelocityX = second.vx - first.vx;
      const relativeVelocityY = second.vy - first.vy;
      const velocityAlongNormal =
        relativeVelocityX * nx + relativeVelocityY * ny;

      if (velocityAlongNormal > 0) {
        continue;
      }

      const restitution = 0.46;
      const impulse =
        (-(1 + restitution) * velocityAlongNormal) /
        (1 / firstMass + 1 / secondMass);
      const impulseX = impulse * nx;
      const impulseY = impulse * ny;

      first.vx -= impulseX / firstMass;
      first.vy -= impulseY / firstMass;
      second.vx += impulseX / secondMass;
      second.vy += impulseY / secondMass;

      const tangentialSpeed = resolveOnX
        ? relativeVelocityY
        : relativeVelocityX;
      const spin = tangentialSpeed * 0.0004;
      first.angularVelocity = first.angularVelocity * 0.74 - spin;
      second.angularVelocity = second.angularVelocity * 0.74 + spin;
      first.vx *= resolveOnX ? 0.92 : 0.985;
      second.vx *= resolveOnX ? 0.92 : 0.985;
    }
  }
}

function drawDebris(context: CanvasRenderingContext2D, item: Debris) {
  context.save();
  context.translate(item.x, item.y);
  context.rotate(item.angle);
  context.scale(item.scale, item.scale);
  context.globalAlpha = 0.68;

  if (item.kind === "rock") {
    drawRock(context, item.radius);
  } else if (item.kind === "fire") {
    drawFire(context, item.radius);
  } else if (item.kind === "water") {
    drawWater(context, item.radius);
  } else {
    drawFlag(context);
  }

  context.restore();
}

function drawRock(context: CanvasRenderingContext2D, radius: number) {
  context.beginPath();
  context.moveTo(-radius * 0.72, -radius * 0.25);
  context.lineTo(-radius * 0.2, -radius * 0.72);
  context.lineTo(radius * 0.58, -radius * 0.55);
  context.lineTo(radius * 0.78, radius * 0.02);
  context.lineTo(radius * 0.28, radius * 0.7);
  context.lineTo(-radius * 0.62, radius * 0.52);
  context.closePath();
  context.fillStyle = "#707070";
  context.strokeStyle = "#2e2e2e";
  context.lineWidth = 2;
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(-radius * 0.3, -radius * 0.3);
  context.lineTo(radius * 0.18, -radius * 0.1);
  context.lineTo(radius * 0.45, radius * 0.34);
  context.strokeStyle = "#9a9a9a";
  context.stroke();
}

function drawFire(context: CanvasRenderingContext2D, radius: number) {
  context.beginPath();
  context.moveTo(0, -radius * 1.1);
  context.bezierCurveTo(
    radius * 0.88,
    -radius * 0.25,
    radius * 0.65,
    radius,
    0,
    radius,
  );
  context.bezierCurveTo(
    -radius * 0.86,
    radius,
    -radius * 0.92,
    -radius * 0.1,
    0,
    -radius * 1.1,
  );
  context.fillStyle = "#f12600";
  context.strokeStyle = "#8b0000";
  context.lineWidth = 2;
  context.fill();
  context.stroke();

  context.beginPath();
  context.moveTo(radius * 0.05, -radius * 0.55);
  context.bezierCurveTo(
    radius * 0.45,
    -radius * 0.05,
    radius * 0.32,
    radius * 0.56,
    0,
    radius * 0.58,
  );
  context.bezierCurveTo(
    -radius * 0.48,
    radius * 0.32,
    -radius * 0.34,
    -radius * 0.16,
    radius * 0.05,
    -radius * 0.55,
  );
  context.fillStyle = "#ffe100";
  context.fill();
}

function drawWater(context: CanvasRenderingContext2D, radius: number) {
  context.beginPath();
  context.moveTo(0, -radius * 1.08);
  context.bezierCurveTo(
    radius * 0.76,
    -radius * 0.08,
    radius * 0.72,
    radius * 0.88,
    0,
    radius,
  );
  context.bezierCurveTo(
    -radius * 0.72,
    radius * 0.88,
    -radius * 0.76,
    -radius * 0.08,
    0,
    -radius * 1.08,
  );
  context.fillStyle = "#00a6ff";
  context.strokeStyle = "#005ca8";
  context.lineWidth = 2;
  context.fill();
  context.stroke();
  context.beginPath();
  context.arc(-radius * 0.22, -radius * 0.06, radius * 0.16, 0, Math.PI * 2);
  context.fillStyle = "rgb(255 255 255 / 0.74)";
  context.fill();
}

function drawFlag(context: CanvasRenderingContext2D) {
  const width = 58;
  const height = 38;
  context.fillStyle = "#fe0000";
  context.strokeStyle = "#660000";
  context.lineWidth = 2;
  context.fillRect(-width / 2, -height / 2, width, height);
  context.strokeRect(-width / 2, -height / 2, width, height);

  context.fillStyle = "#000095";
  context.fillRect(-width / 2, -height / 2, width * 0.5, height * 0.54);

  const cx = -width / 2 + width * 0.25;
  const cy = -height / 2 + height * 0.27;
  context.save();
  context.translate(cx, cy);
  context.fillStyle = "#ffffff";
  for (let i = 0; i < 12; i += 1) {
    context.rotate(Math.PI / 6);
    context.beginPath();
    context.moveTo(0, -9);
    context.lineTo(2.2, -2.5);
    context.lineTo(-2.2, -2.5);
    context.closePath();
    context.fill();
  }
  context.beginPath();
  context.arc(0, 0, 4.4, 0, Math.PI * 2);
  context.fill();
  context.restore();
}
