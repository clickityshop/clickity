async function startProductImages() {
  const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  const size = 384;
  renderer.setSize(size, size);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const colors = {
    "#ef3b36": 0xef3b36,
    "#1e88e5": 0x1e88e5,
    "#111111": 0x111111,
    "#ffffff": 0xffffff,
  };

  function material(color, options = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.42,
      metalness: 0.02,
      ...options,
    });
  }

  function roundedBox(width, height, depth, radius = 0.08) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(-x - radius, y);
    shape.quadraticCurveTo(-x, y, -x, y + radius);
    shape.lineTo(-x, -y - radius);
    shape.quadraticCurveTo(-x, -y, -x - radius, -y);
    shape.lineTo(x + radius, -y);
    shape.quadraticCurveTo(x, -y, x, -y - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth * 0.82,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: Math.min(radius * 0.32, depth * 0.1),
      bevelThickness: depth * 0.09,
      curveSegments: 5,
    });
    geometry.translate(0, 0, -depth * 0.41);
    return geometry;
  }

  function mesh(group, geometry, surface, position, rotation, scale) {
    const object = new THREE.Mesh(geometry, surface);
    object.position.set(...position);
    if (rotation) object.rotation.set(...rotation);
    if (scale) object.scale.set(...scale);
    group.add(object);
    return object;
  }

  function gearGeometry(teeth, outerRadius, innerRadius) {
    const shape = new THREE.Shape();
    for (let i = 0; i < teeth * 4; i++) {
      const angle = (i / (teeth * 4)) * Math.PI * 2;
      const radius = i % 4 < 2 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius * 0.27, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    });
  }

  function buildModel(shape, color) {
    const group = new THREE.Group();
    const body = material(color);
    const dark = material(0x202027, { roughness: 0.3 });
    const white = material(0xffffff, { roughness: 0.25 });
    const accent = material(color, { roughness: 0.28, metalness: 0.08 });

    switch (shape) {
      case "cube":
        for (const [x, y, z, turn] of [
          [-0.3, 0.36, 0, 0.04], [0.3, 0.36, 0, -0.03],
          [-0.3, 0.96, 0, -0.03], [0.3, 0.96, 0, 0.04],
        ]) {
          mesh(group, roundedBox(0.58, 0.58, 0.5, 0.09), body, [x, y, z], [0, turn, turn]);
        }
        break;
      case "dragon": {
        for (let i = 0; i < 6; i++) {
          const segment = mesh(group, new THREE.SphereGeometry(0.23, 20, 16), body,
            [-0.58 + i * 0.22, 0.43 + Math.sin(i * 0.7) * 0.08, 0], [0, 0, 0],
            [1, 0.92, 0.82]);
          segment.rotation.z = Math.sin(i * 0.7) * 0.12;
          if (i > 1 && i < 5) {
            mesh(group, new THREE.ConeGeometry(0.11, 0.26, 5), accent,
              [-0.58 + i * 0.22, 0.67 + Math.sin(i * 0.7) * 0.08, 0], [0, 0, -0.12]);
          }
        }
        mesh(group, new THREE.SphereGeometry(0.26, 20, 16), body, [0.76, 0.54, 0.02], [0, 0, 0], [1.15, 0.9, 0.95]);
        mesh(group, new THREE.ConeGeometry(0.1, 0.25, 5), accent, [0.86, 0.77, 0.02], [0, 0, 0.65]);
        mesh(group, new THREE.SphereGeometry(0.045, 12, 10), white, [0.88, 0.59, 0.2]);
        mesh(group, new THREE.SphereGeometry(0.022, 10, 8), dark, [0.9, 0.59, 0.235]);
        mesh(group, new THREE.ConeGeometry(0.18, 0.36, 4), accent, [-0.06, 0.66, -0.27], [0.3, 0.1, -0.65]);
        break;
      }
      case "clicker":
        mesh(group, roundedBox(0.75, 0.85, 0.18, 0.18), body, [0, 0.55, 0]);
        mesh(group, new THREE.TorusGeometry(0.15, 0.04, 10, 28), dark, [0, 1.08, 0], [Math.PI / 2, 0, 0]);
        mesh(group, roundedBox(0.47, 0.32, 0.09, 0.09), dark, [0, 0.61, 0.13]);
        mesh(group, roundedBox(0.35, 0.22, 0.1, 0.07), accent, [0, 0.64, 0.19]);
        mesh(group, new THREE.SphereGeometry(0.055, 14, 10), dark, [0, 0.3, 0.13]);
        break;
      case "keys":
        mesh(group, roundedBox(1.12, 0.58, 0.22, 0.14), dark, [0, 0.43, 0]);
        for (const x of [-0.29, 0.29]) {
          mesh(group, roundedBox(0.43, 0.46, 0.15, 0.075), white, [x, 0.83, 0]);
          mesh(group, roundedBox(0.31, 0.27, 0.12, 0.055), body, [x, 0.93, 0.015]);
          mesh(group, roundedBox(0.21, 0.15, 0.07, 0.04), accent, [x, 1.03, 0.02]);
        }
        break;
      case "slider":
        mesh(group, roundedBox(1.22, 0.25, 0.48, 0.12), body, [0, 0.3, 0]);
        mesh(group, roundedBox(0.94, 0.09, 0.32, 0.045), dark, [0, 0.45, 0.02]);
        mesh(group, new THREE.SphereGeometry(0.22, 24, 18), accent, [0.24, 0.6, 0.02]);
        mesh(group, new THREE.SphereGeometry(0.065, 16, 12), white, [0.18, 0.75, 0.16]);
        mesh(group, roundedBox(0.23, 0.035, 0.035, 0.015), white, [-0.37, 0.52, 0.19], [0, 0, Math.PI / 2]);
        break;
      case "gear":
        for (const [x, y, radius, teeth] of [
          [-0.34, 0.58, 0.34, 9], [0.31, 0.72, 0.29, 8], [0.13, 0.25, 0.25, 7],
        ]) {
          mesh(group, gearGeometry(teeth, radius, radius * 0.72), body, [x, y, 0], [0, 0, 0]);
          mesh(group, new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, 0.13, 20), accent,
            [x, y, 0.1], [0, 0, 0]);
        }
        break;
      case "slug":
        for (let i = 0; i < 5; i++) {
          mesh(group, new THREE.SphereGeometry(0.22, 18, 14), body,
            [-0.5 + i * 0.23, 0.38 + i * 0.035, 0], [0, 0, 0], [0.95, 1.12, 0.9]);
        }
        mesh(group, new THREE.SphereGeometry(0.27, 20, 16), body, [0.62, 0.52, 0], [0, 0, 0], [1.1, 0.95, 0.95]);
        for (const x of [0.54, 0.72]) {
          mesh(group, new THREE.SphereGeometry(0.07, 14, 12), white, [x, 0.7, 0.14]);
          mesh(group, new THREE.SphereGeometry(0.033, 12, 10), dark, [x + 0.01, 0.7, 0.2]);
        }
        break;
      case "pop":
        mesh(group, new THREE.CylinderGeometry(0.68, 0.68, 0.2, 48), body, [0, 0.32, 0]);
        for (const [x, z] of [[-0.25, -0.24], [0.25, -0.24], [-0.25, 0.24], [0.25, 0.24], [0, 0]]) {
          mesh(group, new THREE.CylinderGeometry(0.16, 0.17, 0.1, 28), dark, [x, 0.47, z]);
          mesh(group, new THREE.SphereGeometry(0.145, 20, 14), accent, [x, 0.54, z], [0, 0, 0], [1, 0.58, 1]);
        }
        break;
      default:
        mesh(group, new THREE.SphereGeometry(0.5, 24, 18), body, [0, 0.5, 0]);
    }

    mesh(group, new THREE.CircleGeometry(0.68, 40),
      material(0xb7a88f, { transparent: true, opacity: 0.23, depthWrite: false }),
      [0, 0.06, 0], [-Math.PI / 2, 0, 0], [1.2, 0.72, 1]);
    return group;
  }

  function renderImage(svg) {
    const shape = svg.dataset.shape;
    const color = colors[svg.dataset.color] ?? colors["#111111"];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6efe2);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a98e, 2.2));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
    keyLight.position.set(-3, 5, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffd7a4, 1.2);
    fillLight.position.set(4, 2, -3);
    scene.add(fillLight);

    const model = buildModel(shape, color);
    scene.add(model);
    const camera = new THREE.OrthographicCamera(-1.23, 1.23, 1.23, -1.23, 0.1, 30);
    camera.position.set(3.6, 3.2, 5.4);
    camera.lookAt(0, 0.58, 0);
    renderer.render(scene, camera);
    const image = renderer.domElement.toDataURL("image/png");

    model.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose());
      else object.material.dispose();
    });
    return image;
  }

  function renderSvg(svg) {
    if (svg.dataset.renderedColor === svg.dataset.color) return;
    try {
      const image = svg.parentElement.querySelector("img[data-three-image]");
      const source = renderImage(svg);
      if (image) image.src = source;
      else {
        const rendered = document.createElement("img");
        rendered.dataset.threeImage = "";
        rendered.alt = "";
        rendered.setAttribute("aria-hidden", "true");
        rendered.src = source;
        svg.after(rendered);
      }
      svg.setAttribute("hidden", "");
      svg.dataset.renderedColor = svg.dataset.color;
    } catch (error) {
      console.error("Could not render a Three.js product image; showing the SVG fallback.", error);
    }
  }

  function renderWithin(root) {
    if (root instanceof Element && root.matches("svg[data-shape]")) renderSvg(root);
    root.querySelectorAll?.("svg[data-shape]").forEach(renderSvg);
  }

  renderWithin(document);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) renderWithin(node);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
}

startProductImages().catch((error) => {
  console.error("Three.js product images are unavailable; showing the SVG illustrations.", error);
});
