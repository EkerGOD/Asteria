const size = 512;
const rx = 108;

function roundedStarPath(cx, cy, outerR, innerR, roundness) {
  const vertices = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    vertices.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }

  const points = [];
  for (let i = 0; i < vertices.length; i++) {
    const prev = vertices[(i - 1 + vertices.length) % vertices.length];
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    const dPrev = Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
    const dNext = Math.hypot(next[0] - curr[0], next[1] - curr[1]);
    const k = roundness;

    const beforeX = curr[0] + (prev[0] - curr[0]) * k;
    const beforeY = curr[1] + (prev[1] - curr[1]) * k;
    const afterX = curr[0] + (next[0] - curr[0]) * k;
    const afterY = curr[1] + (next[1] - curr[1]) * k;

    points.push({ before: [beforeX, beforeY], vertex: curr, after: [afterX, afterY] });
  }

  let d = `M ${points[0].before[0].toFixed(2)} ${points[0].before[1].toFixed(2)}`;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    d += ` Q ${p.vertex[0].toFixed(2)} ${p.vertex[1].toFixed(2)} ${p.after[0].toFixed(2)} ${p.after[1].toFixed(2)}`;
    const nextP = points[(i + 1) % points.length];
    d += ` L ${nextP.before[0].toFixed(2)} ${nextP.before[1].toFixed(2)}`;
  }

  d += " Z";
  return d;
}

const bigStarPath = roundedStarPath(220, 290, 125, 52, 0.25);
const smallStarPath = roundedStarPath(310, 200, 72, 30, 0.25);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="50%" stop-color="#6366F1"/>
      <stop offset="100%" stop-color="#0EA5E9"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>
  <path d="${smallStarPath}" fill="#A5B4FC" opacity="0.75"/>
  <path d="${bigStarPath}" fill="white"/>
</svg>`;

import { writeFileSync } from "node:fs";
writeFileSync("icon-designs/design-final.svg", svg);
console.log("✓ design-final.svg generated");
