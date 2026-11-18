import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RUNNERS, PILLARS, SHRINES } from "./types";
import type { Player, Snapshot } from "./types";

type RunnerModel = {
  root: THREE.Group;
  body: THREE.Group;
  cape: THREE.Mesh;
  feet: THREE.Group[];
  ring: THREE.Mesh;
  position: THREE.Vector3;
  color: number;
  trail: THREE.Points | null;
};
type Effect = {
  mesh: THREE.Mesh;
  age: number;
  kind: "pulse" | "score";
  material: THREE.MeshBasicMaterial;
};
const ink = 0x30233f,
  sandstone = 0x8d6b7b;

export class ArenaScene {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(43, 1, 0.1, 180);
  private models = new Map<string, RunnerModel>();
  private relic = new THREE.Group();
  private shrines: THREE.Group[] = [];
  private crystals: THREE.Mesh[] = [];
  private flames: THREE.Mesh[] = [];
  private effects: Effect[] = [];
  private starfield: THREE.Points;
  private state: Snapshot | null = null;
  private localId = "";
  private frame = 0;
  private last = 0;
  private clock = 0;
  private seenEvent = 0;
  private qualityFrames = 0;
  private qualitySeconds = 0;
  private performanceMode = false;
  private resize: ResizeObserver;
  private labels: HTMLDivElement;
  private labelNodes = new Map<string, HTMLDivElement>();
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
  onEvent?: (kind: string, local: boolean) => void;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Live 3D Sky Temple arena",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.container.appendChild(this.renderer.domElement);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(800, 600), 0.48, 0.45, 1.2),
    );
    this.composer.addPass(new OutputPass());
    new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}art/sky.webp`,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = texture;
      },
    );
    this.labels = document.createElement("div");
    this.labels.className = "world-labels";
    this.container.appendChild(this.labels);
    this.scene.fog = new THREE.FogExp2(0x21152e, 0.01);
    this.scene.add(new THREE.HemisphereLight(0xc7b5ff, 0x352438, 1.15));
    const key = new THREE.DirectionalLight(0xffdba0, 3.1);
    key.position.set(-8, 20, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -16;
    key.shadow.normalBias = 0.04;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9e69ff, 1.8);
    rim.position.set(7, 8, -10);
    this.scene.add(rim);
    const fill = new THREE.PointLight(0xffab36, 18, 20, 1.6);
    fill.position.set(0, 4, 0);
    this.scene.add(fill);
    this.buildTemple();
    this.buildRelic();
    const starGeo = new THREE.BufferGeometry(),
      positions = new Float32Array(420 * 3);
    let seed = 12345;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (random() - 0.5) * 115;
      positions[i + 1] = random() * 45 - 8;
      positions[i + 2] = (random() - 0.5) * 100;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.starfield = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xdbb6ff,
        size: 0.085,
        transparent: true,
        opacity: 0.6,
      }),
    );
    this.scene.add(this.starfield);
    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(container);
    this.fit();
    this.frame = requestAnimationFrame(this.animate);
  }

  private material(
    color: THREE.ColorRepresentation,
    extra: Partial<THREE.MeshStandardMaterialParameters> = {},
  ) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.78,
      flatShading: true,
      ...extra,
    });
  }
  private mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = this.scene,
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private buildTemple() {
    const stone = this.material(ink),
      edge = this.material(0x554159),
      floor = this.material(sandstone);
    const gold = this.material(0xd6a95b, { metalness: 0.55, roughness: 0.4 });
    this.mesh(
      new THREE.CylinderGeometry(11.1, 9.8, 2.5, 12),
      stone,
      0,
      -1.4,
      0,
    );
    this.mesh(
      new THREE.CylinderGeometry(11.25, 11.25, 0.35, 12),
      edge,
      0,
      -0.1,
      0,
    );
    this.mesh(
      new THREE.CylinderGeometry(10.85, 10.85, 0.16, 12),
      floor,
      0,
      0.12,
      0,
    );
    // Each slab is genuinely three-dimensional. Instancing keeps the scene light on phones.
    const tiles: { x: number; z: number }[] = [];
    for (let x = -10; x <= 10; x += 1.1)
      for (let z = -10; z <= 10; z += 1.1)
        if (Math.hypot(x, z) < 10.35) tiles.push({ x, z });
    const tiling = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.065, 0.09, 1.065),
      this.material(0xa9a1a4),
      tiles.length,
    );
    const matrix = new THREE.Object3D();
    tiles.forEach((p, i) => {
      matrix.position.set(p.x, 0.25, p.z);
      matrix.updateMatrix();
      tiling.setMatrixAt(i, matrix.matrix);
      tiling.setColorAt(
        i,
        new THREE.Color().setHSL(
          0.065 + (i % 5) * 0.008,
          0.13,
          0.31 + (i % 7) * 0.016,
        ),
      );
    });
    tiling.receiveShadow = true;
    this.scene.add(tiling);
    // Inlaid concentric navigation lines.
    for (const radius of [2.2, 9.85]) {
      const ring = this.mesh(
        new THREE.RingGeometry(radius, radius + 0.035, 96),
        this.material(0xcfa56a, { emissive: 0x7c4a13, emissiveIntensity: 0.3 }),
        0,
        0.31,
        0,
      );
      ring.rotation.x = -Math.PI / 2;
    }
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      if (i % 10 === 0 || i % 10 === 1 || i % 10 === 9) continue;
      const wall = this.mesh(
        new THREE.BoxGeometry(1.25, 0.65 + (i % 3) * 0.1, 0.55),
        i % 2 ? stone : edge,
        Math.sin(a) * 10.65,
        0.6,
        Math.cos(a) * 10.65,
      );
      wall.rotation.y = a;
    }
    // Recessed ornament under the floating island.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const buttress = this.mesh(
        new THREE.BoxGeometry(0.9, 3.4, 1.3),
        stone,
        Math.sin(a) * 9.7,
        -1.8,
        Math.cos(a) * 9.7,
      );
      buttress.rotation.y = a;
      const inset = this.mesh(
        new THREE.BoxGeometry(0.3, 0.12, 1.36),
        this.material(0xffb740, { emissive: 0xff981f, emissiveIntensity: 1.3 }),
        Math.sin(a) * 9.7,
        -0.9,
        Math.cos(a) * 9.7,
      );
      inset.rotation.y = a;
    }
    // Central altar: shallow steps so it remains a traversable gameplay landmark.
    this.mesh(new THREE.CylinderGeometry(1.6, 1.85, 0.2, 8), edge, 0, 0.36, 0);
    this.mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.2, 8), gold, 0, 0.54, 0);
    this.mesh(
      new THREE.CylinderGeometry(0.92, 1.1, 0.16, 8),
      stone,
      0,
      0.72,
      0,
    );
    for (const p of PILLARS) {
      this.mesh(
        new THREE.CylinderGeometry(0.8, 1.05, 0.35, 4),
        edge,
        p.x,
        0.45,
        p.z,
      ).rotation.y = Math.PI / 4;
      this.mesh(new THREE.BoxGeometry(0.95, 2.3, 0.95), stone, p.x, 1.6, p.z);
      this.mesh(new THREE.BoxGeometry(1.16, 0.18, 1.16), gold, p.x, 2.8, p.z);
      const c = this.mesh(
        new THREE.OctahedronGeometry(0.64),
        this.material(0xa866ff, {
          emissive: 0x7b25df,
          emissiveIntensity: 1.7,
          metalness: 0.35,
          roughness: 0.25,
        }),
        p.x,
        3.55,
        p.z,
      );
      c.scale.y = 1.5;
      this.crystals.push(c);
      const small = this.mesh(
        new THREE.OctahedronGeometry(0.19),
        this.material(0xca97ff, { emissive: 0x8c43de, emissiveIntensity: 1.1 }),
        p.x,
        1.5,
        p.z + 0.49,
      );
      small.scale.y = 1.7;
      for (let k = 0; k < 4; k++)
        this.mesh(
          new THREE.BoxGeometry(0.98, 0.025, 0.98),
          this.material(0x76556f),
          p.x,
          0.8 + k * 0.5,
          p.z,
        );
    }
    for (let i = 0; i < SHRINES.length; i++) {
      const p = SHRINES[i],
        group = new THREE.Group();
      group.position.set(p.x, 0.34, p.z);
      this.mesh(
        new THREE.CylinderGeometry(1.1, 1.35, 0.2, 8),
        edge,
        0,
        0,
        0,
        group,
      );
      const surface = this.mesh(
        new THREE.CylinderGeometry(0.95, 0.95, 0.05, 8),
        this.material(0x755a7c, { emissive: 0x67406c, emissiveIntensity: 0.2 }),
        0,
        0.14,
        0,
        group,
      );
      surface.name = "surface";
      const ring = this.mesh(
        new THREE.TorusGeometry(1, 0.075, 6, 32),
        this.material(0xffce61, { emissive: 0xffa31a, emissiveIntensity: 1.7 }),
        0,
        0.3,
        0,
        group,
      );
      ring.rotation.x = Math.PI / 2;
      ring.name = "ring";
      const beacon = this.mesh(
        new THREE.CylinderGeometry(0.9, 1.05, 4.5, 24, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffbf4d,
          transparent: true,
          opacity: 0.09,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
        0,
        2.3,
        0,
        group,
      );
      beacon.name = "beacon";
      this.scene.add(group);
      this.shrines.push(group);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8,
        x = Math.sin(a) * 9.7,
        z = Math.cos(a) * 9.7;
      this.mesh(
        new THREE.CylinderGeometry(0.2, 0.28, 1.6, 6),
        stone,
        x,
        1.05,
        z,
      );
      this.mesh(
        new THREE.CylinderGeometry(0.38, 0.18, 0.3, 6),
        gold,
        x,
        1.96,
        z,
      );
      const flame = this.mesh(
        new THREE.OctahedronGeometry(0.24),
        this.material(0xffcb6a, { emissive: 0xffa032, emissiveIntensity: 3 }),
        x,
        2.33,
        z,
      );
      flame.scale.y = 1.8;
      this.flames.push(flame);
    }
    // Ancient entrance silhouette, behind the arena and outside the play boundary.
    for (const x of [-3, 3]) {
      this.mesh(new THREE.BoxGeometry(1.2, 6.5, 1.4), stone, x, 3, -11.8);
      this.mesh(new THREE.BoxGeometry(1.5, 0.35, 1.7), edge, x, 6.1, -11.8);
      const cloth = this.mesh(
        new THREE.PlaneGeometry(0.7, 3),
        this.material(0x663153, { side: THREE.DoubleSide }),
        x,
        4.1,
        -11.05,
      );
      cloth.rotation.z = x > 0 ? -0.06 : 0.06;
      const diamond = this.mesh(
        new THREE.OctahedronGeometry(0.22),
        gold,
        x,
        4.3,
        -10.98,
      );
      diamond.scale.y = 1.6;
    }
    for (let i = 0; i < 11; i++) {
      const a = (i / 10) * Math.PI;
      const block = this.mesh(
        new THREE.BoxGeometry(0.93, 1.05, 1.7),
        i % 2 ? edge : stone,
        Math.cos(a) * 3,
        3.8 + Math.sin(a) * 3,
        -11.8,
      );
      block.rotation.z = a + Math.PI / 2;
    }
    // Moss and broken stones give the temple a history without obscuring the play field.
    const foliage = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.17),
      this.material(0x375449),
      96,
    );
    for (let i = 0; i < 96; i++) {
      const a = (Math.floor(i / 12) * Math.PI) / 4 + Math.sin(i * 3) * 0.02;
      matrix.position.set(
        Math.sin(a) * 10.9,
        -0.1 - (i % 12) * 0.14,
        Math.cos(a) * 10.9,
      );
      matrix.scale.set(1 + (i % 3) * 0.3, 0.8, 1);
      matrix.rotation.set(i, i * 2, 0);
      matrix.updateMatrix();
      foliage.setMatrixAt(i, matrix.matrix);
    }
    this.scene.add(foliage);
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4,
        r = 27 + (i % 3) * 6;
      const g = new THREE.Group();
      g.position.set(Math.sin(a) * r, -5 - (i % 3) * 3, Math.cos(a) * r - 8);
      this.mesh(
        new THREE.CylinderGeometry(2, 0.3, 6, 5),
        this.material(0x3c294f),
        0,
        0,
        0,
        g,
      );
      this.mesh(
        new THREE.CylinderGeometry(2.2, 2.1, 0.4, 6),
        edge,
        0,
        3.1,
        0,
        g,
      );
      this.mesh(
        new THREE.ConeGeometry(0.6, 3.5, 5),
        this.material(0x77518d, { emissive: 0x2b123e }),
        0,
        4.8,
        0,
        g,
      );
      this.scene.add(g);
    }
  }

  private buildRelic() {
    const crystal = this.material(0xffcd51, {
      metalness: 0.5,
      roughness: 0.15,
      emissive: 0xff9f18,
      emissiveIntensity: 1.8,
    });
    const core = this.mesh(
      new THREE.OctahedronGeometry(0.62),
      crystal,
      0,
      0,
      0,
      this.relic,
    );
    core.scale.y = 1.3;
    const cage = this.mesh(
      new THREE.OctahedronGeometry(0.9),
      new THREE.MeshBasicMaterial({ color: 0xffe09a, wireframe: true }),
      0,
      0,
      0,
      this.relic,
    );
    cage.scale.y = 1.35;
    const orbit = this.mesh(
      new THREE.TorusGeometry(1.03, 0.022, 5, 48),
      this.material(0xffefbb, { emissive: 0xffcf65, emissiveIntensity: 2 }),
      0,
      0,
      0,
      this.relic,
    );
    orbit.rotation.x = Math.PI / 2;
    this.scene.add(this.relic);
  }

  private createRunner(p: Player) {
    const root = new THREE.Group(),
      body = new THREE.Group();
    root.add(body);
    const color = RUNNERS[p.color].color,
      clothColor = p.cosmetic === "gilded" ? 0xdba54a : color,
      coat = this.material(
        clothColor,
        p.cosmetic === "gilded" ? { metalness: 0.5, roughness: 0.3 } : {},
      ),
      dark = this.material(0x27232f),
      pale = this.material(p.cosmetic === "gilded" ? 0xffd969 : 0xffecd0),
      trim = this.material(0xcda969, { metalness: 0.45 });
    // Faceted cloak, angular hood, inset mask, pauldrons, boots and satchel.
    const torso = this.mesh(
      new THREE.CylinderGeometry(0.27, 0.4, 0.7, 6),
      coat,
      0,
      0.89,
      0,
      body,
    );
    torso.rotation.y = Math.PI / 6;
    const hood = this.mesh(
      new THREE.IcosahedronGeometry(0.42, 0),
      coat,
      0,
      1.49,
      -0.01,
      body,
    );
    hood.scale.set(1, 1.18, 1);
    const opening = this.mesh(
      new THREE.SphereGeometry(0.3, 6, 5),
      dark,
      0,
      1.45,
      -0.25,
      body,
    );
    opening.scale.set(0.9, 1.05, 0.5);
    const mask = this.mesh(
      new THREE.SphereGeometry(0.23, 5, 4),
      pale,
      0,
      1.45,
      -0.36,
      body,
    );
    mask.scale.set(0.92, 1.1, 0.38);
    for (const x of [-0.085, 0.085]) {
      const eye = this.mesh(
        new THREE.BoxGeometry(0.09, 0.035, 0.03),
        dark,
        x,
        1.5,
        -0.444,
        body,
      );
      eye.rotation.z = x > 0 ? 0.24 : -0.24;
    }
    const cape = this.mesh(
      new THREE.ConeGeometry(0.49, 1.0, 5, 1, true),
      this.material(clothColor, { side: THREE.DoubleSide }),
      0,
      0.82,
      0.19,
      body,
    );
    cape.rotation.x = -0.14;
    for (const side of [-1, 1]) {
      this.mesh(
        new THREE.IcosahedronGeometry(0.21),
        coat,
        side * 0.34,
        1.03,
        0,
        body,
      );
      const arm = this.mesh(
        new THREE.CylinderGeometry(0.1, 0.09, 0.46, 5),
        dark,
        side * 0.35,
        0.72,
        -0.04,
        body,
      );
      arm.rotation.z = side * -0.16;
      this.mesh(
        new THREE.IcosahedronGeometry(0.12),
        pale,
        side * 0.39,
        0.47,
        -0.08,
        body,
      );
    }
    this.mesh(new THREE.BoxGeometry(0.65, 0.09, 0.47), dark, 0, 0.68, 0, body);
    this.mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.05),
      trim,
      0,
      0.68,
      -0.25,
      body,
    );
    this.mesh(
      new THREE.BoxGeometry(0.2, 0.23, 0.17),
      this.material(0x78513b),
      0.3,
      0.66,
      0.13,
      body,
    );
    const feet: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.17, 0.42, 0);
      this.mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.35, 5),
        dark,
        0,
        -0.06,
        0,
        leg,
      );
      this.mesh(
        new THREE.BoxGeometry(0.23, 0.2, 0.35),
        dark,
        0,
        -0.23,
        -0.08,
        leg,
      );
      body.add(leg);
      feet.push(leg);
    }
    const ring = this.mesh(
      new THREE.RingGeometry(0.5, 0.58, 32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      }),
      0,
      0.34,
      0,
      root,
    );
    ring.rotation.x = -Math.PI / 2;
    if (p.cosmetic === "royal") {
      const crown = new THREE.Group();
      crown.position.y = 2.02;
      const gold = this.material(0xffd36c, {
        metalness: 0.65,
        roughness: 0.24,
        emissive: 0x946125,
        emissiveIntensity: 0.45,
      });
      const band = this.mesh(
        new THREE.TorusGeometry(0.34, 0.045, 5, 16),
        gold,
        0,
        0,
        0,
        crown,
      );
      band.rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        this.mesh(
          new THREE.ConeGeometry(0.065, 0.22, 4),
          gold,
          Math.sin(a) * 0.34,
          0.1,
          Math.cos(a) * 0.34,
          crown,
        );
      }
      body.add(crown);
    }
    root.position.set(p.x, 0.3, p.z);
    this.scene.add(root);
    let trail: THREE.Points | null = null;
    if (p.cosmetic === "starlight") {
      const positions = new Float32Array(27);
      for (let i = 0; i < 9; i++) positions.set([p.x, 0.9, p.z], i * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      trail = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: 0xe2c4ff,
          size: 0.14,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        }),
      );
      trail.frustumCulled = false;
      this.scene.add(trail);
    }
    const model = {
      root,
      body,
      cape,
      feet,
      ring,
      position: root.position.clone(),
      color: p.color,
      trail,
    };
    this.models.set(p.id, model);
    const label = document.createElement("div");
    label.className = `runner-label look-${p.cosmetic}`;
    label.textContent = p.name;
    label.style.setProperty("--runner", color);
    this.labels.appendChild(label);
    this.labelNodes.set(p.id, label);
    return model;
  }

  update(snapshot: Snapshot, localId: string) {
    this.state = snapshot;
    this.localId = localId;
    for (const p of snapshot.players) {
      if (!this.models.has(p.id)) this.createRunner(p);
      // Read-only coordinates support deterministic browser input verification.
      const label = this.labelNodes.get(p.id)!;
      label.dataset.x = p.x.toFixed(3);
      label.dataset.z = p.z.toFixed(3);
    }
    for (const [id, model] of this.models)
      if (!snapshot.players.some((p) => p.id === id)) {
        this.disposeObject(model.root);
        this.scene.remove(model.root);
        if (model.trail) {
          this.disposeObject(model.trail);
          this.scene.remove(model.trail);
        }
        this.models.delete(id);
        this.labelNodes.get(id)?.remove();
        this.labelNodes.delete(id);
      }
    for (const event of snapshot.events)
      if (event.id > this.seenEvent) {
        this.seenEvent = event.id;
        if (snapshot.elapsed - event.at < 0.5) {
          this.onEvent?.(event.kind, event.player === localId);
          if (event.kind === "pulse" || event.kind === "score") {
            const material = new THREE.MeshBasicMaterial({
              color:
                event.kind === "score"
                  ? 0xffd666
                  : RUNNERS[
                      snapshot.players.find((p) => p.id === event.player)
                        ?.color ?? 0
                    ].color,
              transparent: true,
              opacity: 0.9,
              side: THREE.DoubleSide,
              depthWrite: false,
            });
            const mesh = new THREE.Mesh(
              new THREE.RingGeometry(0.9, 1, 64),
              material,
            );
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(event.x, 0.42, event.z);
            this.scene.add(mesh);
            this.effects.push({ mesh, age: 0, kind: event.kind, material });
          }
        }
      }
  }

  private fit() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    const mobile = w / h < 0.85;
    this.camera.position.set(0, mobile ? 33 : 25, mobile ? 25 : 20);
    this.camera.fov = mobile ? 49 : 43;
    this.camera.lookAt(0, mobile ? 0 : 0.2, -0.6);
    this.camera.updateProjectionMatrix();
  }

  private animate = (at: number) => {
    this.frame = requestAnimationFrame(this.animate);
    const frameTime = (at - (this.last || at)) / 1000;
    const dt = Math.min(frameTime, 0.05);
    this.last = at;
    if (!this.performanceMode && frameTime > 0 && frameTime < 2) {
      this.qualityFrames++;
      this.qualitySeconds += frameTime;
      if (this.qualityFrames >= 8 && this.qualitySeconds >= 2) {
        if (this.qualitySeconds / this.qualityFrames > 0.055) {
          // Preserve the arena and readable HTML HUD on weaker GPUs. Costly
          // shadow maps and bloom are decorative, never gameplay information.
          this.performanceMode = true;
          const ratio = Math.min(window.devicePixelRatio, 0.75);
          this.renderer.setPixelRatio(ratio);
          this.composer.setPixelRatio(ratio);
          this.renderer.shadowMap.enabled = false;
          for (const pass of this.composer.passes)
            if (pass instanceof UnrealBloomPass) pass.enabled = false;
          this.renderer.domElement.dataset.quality = "performance";
        }
        this.qualityFrames = 0;
        this.qualitySeconds = 0;
      }
    }
    this.clock += dt;
    const t = this.clock;
    if (this.state) {
      for (const p of this.state.players) {
        const model = this.models.get(p.id)!;
        const before = model.root.position.clone();
        model.root.position.lerp(
          new THREE.Vector3(p.x, 0.32, p.z),
          Math.min(1, dt * 20),
        );
        const moving = before.distanceTo(model.root.position) > 0.004;
        if (model.trail) {
          const positions = model.trail.geometry.getAttribute(
            "position",
          ) as THREE.BufferAttribute;
          for (let i = 8; i > 0; i--) {
            const blend = Math.min(1, dt * 14);
            positions.setXYZ(
              i,
              positions.getX(i) +
                (positions.getX(i - 1) - positions.getX(i)) * blend,
              0.9 + Math.sin(t * 3 + i) * 0.08,
              positions.getZ(i) +
                (positions.getZ(i - 1) - positions.getZ(i)) * blend,
            );
          }
          positions.setXYZ(
            0,
            model.root.position.x,
            0.95,
            model.root.position.z,
          );
          positions.needsUpdate = true;
          model.trail.visible = !this.reducedMotion;
        }
        const targetAngle = Math.atan2(-p.dx, -p.dz);
        model.body.rotation.y +=
          Math.atan2(
            Math.sin(targetAngle - model.body.rotation.y),
            Math.cos(targetAngle - model.body.rotation.y),
          ) * Math.min(1, dt * 18);
        model.body.position.y =
          moving && !this.reducedMotion
            ? Math.abs(Math.sin(t * 13)) * 0.075
            : 0;
        model.feet.forEach((leg, i) => {
          leg.rotation.x = moving ? Math.sin(t * 13 + i * Math.PI) * 0.45 : 0;
        });
        model.cape.rotation.x =
          -0.15 +
          (moving ? -0.15 + Math.sin(t * 14) * 0.08 : Math.sin(t * 2) * 0.025);
        model.ring.material instanceof THREE.MeshBasicMaterial &&
          (model.ring.material.opacity = p.id === this.localId ? 0.95 : 0.38);
        model.body.visible = !(p.invincible > 0 && Math.sin(t * 25) < -0.4);
        const label = this.labelNodes.get(p.id)!;
        const pos = model.root.position
          .clone()
          .add(new THREE.Vector3(0, 2.35, 0))
          .project(this.camera);
        label.style.transform = `translate(-50%,-50%) translate(${(pos.x * 0.5 + 0.5) * this.container.clientWidth}px,${(-pos.y * 0.5 + 0.5) * this.container.clientHeight}px)`;
        label.classList.toggle("is-you", p.id === this.localId);
        label.classList.toggle("has-relic", p.id === this.state.carrier);
      }
      const carrier = this.state.carrier
        ? this.models.get(this.state.carrier)
        : null;
      const target = carrier
        ? carrier.root.position.clone().add(new THREE.Vector3(0, 2.6, 0))
        : new THREE.Vector3(this.state.relic.x, 2.05, this.state.relic.z);
      this.relic.position.lerp(target, Math.min(1, dt * 18));
      this.relic.position.y += Math.sin(t * 2.5) * 0.003;
      this.relic.visible = this.state.elapsed >= this.state.pickupAt - 0.4;
      this.relic.scale.setScalar(carrier ? 0.55 : 1);
      this.shrines.forEach((g, i) => {
        const active = i === this.state!.shrine;
        const surge =
          this.state!.surge &&
          this.state!.time <= 30 &&
          this.state!.phase === "playing";
        g.getObjectByName("ring")!.visible = active;
        g.getObjectByName("beacon")!.visible = active;
        const ring = g.getObjectByName("ring") as THREE.Mesh<
          THREE.TorusGeometry,
          THREE.MeshStandardMaterial
        >;
        ring.material.emissive.set(surge ? 0xff4a35 : 0xffa31a);
        ring.material.emissiveIntensity = surge ? 2.4 : 1.7;
        const beacon = g.getObjectByName("beacon") as THREE.Mesh<
          THREE.CylinderGeometry,
          THREE.MeshBasicMaterial
        >;
        beacon.material.color.set(surge ? 0xff795a : 0xffbf4d);
        beacon.material.opacity = surge ? 0.16 : 0.09;
        const surface = g.getObjectByName("surface") as THREE.Mesh<
          THREE.CylinderGeometry,
          THREE.MeshStandardMaterial
        >;
        surface.material.emissive.set(
          active ? (surge ? 0xff4a35 : 0xff9f20) : 0x67406c,
        );
        surface.material.emissiveIntensity = active ? 0.7 : 0.1;
      });
    }
    this.relic.rotation.y = t * 0.8;
    this.crystals.forEach((c, i) => {
      c.rotation.y = t * 0.4 + i;
      c.position.y = 3.55 + Math.sin(t * 1.7 + i) * 0.13;
    });
    this.flames.forEach((f, i) => {
      f.scale.y = 1.5 + Math.sin(t * 9 + i * 3) * 0.25;
    });
    this.starfield.rotation.y = this.reducedMotion ? 0 : t * 0.004;
    this.effects = this.effects.filter((effect) => {
      effect.age += dt;
      const duration = effect.kind === "score" ? 0.9 : 0.48;
      const fraction = effect.age / duration;
      effect.mesh.scale.setScalar(
        1 + fraction * (effect.kind === "score" ? 5 : 2),
      );
      effect.material.opacity = (1 - fraction) * 0.85;
      if (fraction >= 1) {
        this.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        effect.material.dispose();
        return false;
      }
      return true;
    });
    this.composer.render();
  };

  private disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
        child.geometry.dispose();
        for (const mat of Array.isArray(child.material)
          ? child.material
          : [child.material])
          mat.dispose();
      }
    });
  }
  dispose() {
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    this.disposeObject(this.scene);
    if (this.scene.background instanceof THREE.Texture)
      this.scene.background.dispose();
    this.composer.passes.forEach((pass) => pass.dispose());
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.remove();
  }
}
