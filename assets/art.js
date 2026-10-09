// Placeholder illustrations for products without a photo.
// Each returns an SVG string drawn in the given color.
(function () {
  const swatch = {
    red: "#ef3b36", blue: "#1e88e5", black: "#111111", white: "#ffffff",
  };

  function colorFor(name) {
    return swatch[(name || "").toLowerCase()] || "#111111";
  }

  const shapes = {
    cube: (c) => `
      <g stroke="#111111" stroke-width="4" stroke-linejoin="round">
        <rect x="38" y="38" width="56" height="56" rx="8" fill="${c}"/>
        <rect x="106" y="38" width="56" height="56" rx="8" fill="${c}"/>
        <rect x="38" y="106" width="56" height="56" rx="8" fill="${c}"/>
        <rect x="106" y="106" width="56" height="56" rx="8" fill="${c}" opacity=".75"/>
      </g>`,
    dragon: (c) => `
      <g stroke="#111111" stroke-width="4" stroke-linejoin="round" fill="${c}">
        ${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="${46 + i * 21}" cy="${112 + Math.sin(i) * 14}" rx="15" ry="20"/>`).join("")}
        <path d="M150 70 l26 -18 l-4 26 l14 10 l-30 8 z"/>
        <circle cx="166" cy="78" r="3" fill="#111111"/>
      </g>`,
    clicker: (c) => `
      <g stroke="#111111" stroke-width="4" stroke-linejoin="round">
        <circle cx="100" cy="40" r="14" fill="none"/>
        <rect x="52" y="58" width="96" height="104" rx="22" fill="${c}"/>
        <rect x="74" y="80" width="52" height="40" rx="10" fill="#fff" opacity=".85"/>
        <circle cx="100" cy="140" r="9" fill="#111111"/>
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
      return `<g stroke="#111111" stroke-width="4" stroke-linejoin="round" fill="${c}">
        ${gear(76, 80, 30, 8)}${gear(132, 92, 24, 7)}${gear(96, 142, 22, 6)}</g>`;
    },
    slug: (c) => `
      <g stroke="#111111" stroke-width="4" stroke-linejoin="round" fill="${c}">
        ${[0, 1, 2, 3, 4].map((i) => `<rect x="${30 + i * 26}" y="${88 - i * 3}" width="30" height="${48 + i * 3}" rx="14"/>`).join("")}
        <circle cx="168" cy="96" r="24"/>
        <circle cx="176" cy="90" r="4" fill="#111111"/>
      </g>`,
    keys: (c) => `
      <g stroke="#111111" stroke-width="4" stroke-linejoin="round">
        <rect x="26" y="72" width="148" height="86" rx="18" fill="${c}"/>
        <rect x="44" y="52" width="50" height="62" rx="10" fill="#fff"/>
        <rect x="106" y="52" width="50" height="62" rx="10" fill="#fff"/>
        <rect x="52" y="58" width="34" height="38" rx="6" fill="none" opacity=".5"/>
        <rect x="114" y="58" width="34" height="38" rx="6" fill="none" opacity=".5"/>
        <circle cx="100" cy="138" r="5" fill="#111111"/>
      </g>`,
    slider: (c) => `
      <g stroke="#111111" stroke-width="4" stroke-linejoin="round">
        <rect x="22" y="70" width="156" height="60" rx="30" fill="${c}"/>
        <rect x="40" y="88" width="120" height="24" rx="12" fill="#ffffff"/>
        <circle cx="126" cy="100" r="20" fill="#fff"/>
        <circle cx="120" cy="94" r="5" fill="#fff" stroke="none" opacity=".9"/>
        <path d="M60 100 h28 M80 92 l8 8 l-8 8" fill="none" stroke-linecap="round"/>
      </g>`,
    pop: (c) => `
      <g stroke="#111111" stroke-width="4">
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
