// Placeholder illustrations for products without a photo.
// Each returns an SVG string drawn in the given color.
(function () {
  const swatch = {
    "galaxy purple": "#7b4dff", lime: "#9be22d", "ocean blue": "#1e88e5",
    "silk rainbow": "#ff5fa2", "glow-in-the-dark": "#b8f5a0", red: "#ef3b36",
    orange: "#ff8a1f", teal: "#14b8a6", black: "#2b2b2b",
    silver: "#b8c0cc", gold: "#f2b705", "neon green": "#39ff6a",
    "pastel pink": "#ffb3d1", mint: "#8ff0c9", lemon: "#ffe45c",
    sunset: "#ff6b4a", sky: "#6ec6ff", white: "#f4f1ea",
  };

  function colorFor(name) {
    return swatch[(name || "").toLowerCase()] || "#ff8a1f";
  }

  const shapes = {
    cube: (c) => `
      <g stroke="#1b1b1b" stroke-width="4" stroke-linejoin="round">
        <rect x="38" y="38" width="56" height="56" rx="8" fill="${c}"/>
        <rect x="106" y="38" width="56" height="56" rx="8" fill="${c}"/>
        <rect x="38" y="106" width="56" height="56" rx="8" fill="${c}"/>
        <rect x="106" y="106" width="56" height="56" rx="8" fill="${c}" opacity=".75"/>
      </g>`,
    dragon: (c) => `
      <g stroke="#1b1b1b" stroke-width="4" stroke-linejoin="round" fill="${c}">
        ${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="${46 + i * 21}" cy="${112 + Math.sin(i) * 14}" rx="15" ry="20"/>`).join("")}
        <path d="M150 70 l26 -18 l-4 26 l14 10 l-30 8 z"/>
        <circle cx="166" cy="78" r="3" fill="#1b1b1b"/>
      </g>`,
    clicker: (c) => `
      <g stroke="#1b1b1b" stroke-width="4" stroke-linejoin="round">
        <circle cx="100" cy="40" r="14" fill="none"/>
        <rect x="52" y="58" width="96" height="104" rx="22" fill="${c}"/>
        <rect x="74" y="80" width="52" height="40" rx="10" fill="#fff" opacity=".85"/>
        <circle cx="100" cy="140" r="9" fill="#1b1b1b"/>
      </g>`,
    gear: (c) => {
      const gear = (cx, cy, r, teeth) => {
        let d = "";
        for (let i = 0; i < teeth * 2; i++) {
          const a = (Math.PI * i) / teeth;
          const rr = i % 2 ? r : r + 9;
          d += `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
        }
        return `<path d="${d}Z"/><circle cx="${cx}" cy="${cy}" r="${r / 3}" fill="#fff"/>`;
      };
      return `<g stroke="#1b1b1b" stroke-width="4" stroke-linejoin="round" fill="${c}">
        ${gear(76, 80, 30, 8)}${gear(132, 92, 24, 7)}${gear(96, 142, 22, 6)}</g>`;
    },
    slug: (c) => `
      <g stroke="#1b1b1b" stroke-width="4" stroke-linejoin="round" fill="${c}">
        ${[0, 1, 2, 3, 4].map((i) => `<rect x="${30 + i * 26}" y="${88 - i * 3}" width="30" height="${48 + i * 3}" rx="14"/>`).join("")}
        <circle cx="168" cy="96" r="24"/>
        <circle cx="176" cy="90" r="4" fill="#1b1b1b"/>
      </g>`,
    pop: (c) => `
      <g stroke="#1b1b1b" stroke-width="4">
        <circle cx="100" cy="100" r="66" fill="${c}"/>
        ${[[-24, -24], [24, -24], [-24, 24], [24, 24], [0, 0]].map(([x, y]) => `<circle cx="${100 + x}" cy="${100 + y}" r="14" fill="#fff" opacity=".8"/>`).join("")}
      </g>`,
  };

  window.ClickityArt = {
    colorFor,
    svg(shape, colorName) {
      const draw = shapes[shape] || shapes.pop;
      return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${draw(colorFor(colorName))}</svg>`;
    },
  };
})();
