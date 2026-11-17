import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RUNNERS, PILLARS, SHRINES } from './types';
import type { Player, Snapshot } from './types';

type RunnerModel = { root: THREE.Group; body: THREE.Group; cape: THREE.Mesh; feet: THREE.Group[]; ring: THREE.Mesh; position: THREE.Vector3; color: number };
type Effect = { mesh: THREE.Mesh; age: number; kind: 'pulse' | 'score'; material: THREE.MeshBasicMaterial };
const ink = 0x30233f, sandstone = 0x8d6b7b;

export class ArenaScene {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(43, 1, .1, 180);
  private models = new Map<string, RunnerModel>();
  private relic = new THREE.Group();
  private shrines: THREE.Group[] = [];
  private crystals: THREE.Mesh[] = [];
  private flames: THREE.Mesh[] = [];
  private effects: Effect[] = [];
  private starfield: THREE.Points;
  private state: Snapshot | null = null;
  private localId = '';
  private frame = 0;
  private last = 0;
  private clock = 0;
  private seenEvent = 0;
  private resize: ResizeObserver;
  private labels: HTMLDivElement;
  private labelNodes = new Map<string, HTMLDivElement>();
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  onEvent?: (kind: string, local: boolean) => void;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.setAttribute('aria-label', 'Live 3D Sky Temple arena');
    this.renderer.domElement.setAttribute('role', 'img');
    this.container.appendChild(this.renderer.domElement);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(800, 600), .48, .45, 1.2));
    this.composer.addPass(new OutputPass());
    new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}art/sky.webp`, texture => { texture.colorSpace = THREE.SRGBColorSpace; this.scene.background = texture; });
    this.labels = document.createElement('div'); this.labels.className = 'world-labels'; this.container.appendChild(this.labels);
    this.scene.fog = new THREE.FogExp2(0x21152e, .010);
    this.scene.add(new THREE.HemisphereLight(0xc7b5ff, 0x352438, 1.15));
    const key = new THREE.DirectionalLight(0xffdba0, 3.1); key.position.set(-8, 20, 9); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -16; key.shadow.camera.right = 16;
    key.shadow.camera.top = 16; key.shadow.camera.bottom = -16; key.shadow.normalBias = .04;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9e69ff, 1.8); rim.position.set(7, 8, -10); this.scene.add(rim);
    const fill = new THREE.PointLight(0xffab36, 18, 20, 1.6); fill.position.set(0, 4, 0); this.scene.add(fill);
    this.buildTemple();
    this.buildRelic();
    const starGeo = new THREE.BufferGeometry(), positions = new Float32Array(420 * 3);
    let seed = 12345; const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < positions.length; i += 3) { positions[i] = (random() - .5) * 115; positions[i + 1] = random() * 45 - 8; positions[i + 2] = (random() - .5) * 100; }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starfield = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdbb6ff, size: .085, transparent: true, opacity: .6 })); this.scene.add(this.starfield);
    this.resize = new ResizeObserver(() => this.fit()); this.resize.observe(container); this.fit();
    this.frame = requestAnimationFrame(this.animate);
  }

  private material(color: THREE.ColorRepresentation, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: .78, flatShading: true, ...extra });
  }
  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = this.scene) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }

  private buildTemple() {
    const stone = this.material(ink), edge = this.material(0x554159), floor = this.material(sandstone);
    const gold = this.material(0xd6a95b, { metalness: .55, roughness: .4 });
    this.mesh(new THREE.CylinderGeometry(11.1, 9.8, 2.5, 12), stone, 0, -1.4, 0);
    this.mesh(new THREE.CylinderGeometry(11.25, 11.25, .35, 12), edge, 0, -.1, 0);
    this.mesh(new THREE.CylinderGeometry(10.85, 10.85, .16, 12), floor, 0, .12, 0);
    // Each slab is genuinely three-dimensional. Instancing keeps the scene light on phones.
    const tiles: { x: number; z: number }[] = [];
    for (let x = -10; x <= 10; x += 1.1) for (let z = -10; z <= 10; z += 1.1) if (Math.hypot(x, z) < 10.35) tiles.push({ x, z });
    const tiling = new THREE.InstancedMesh(new THREE.BoxGeometry(1.065, .09, 1.065), this.material(0xa9a1a4), tiles.length);
    const matrix = new THREE.Object3D();
    tiles.forEach((p, i) => { matrix.position.set(p.x, .25, p.z); matrix.updateMatrix(); tiling.setMatrixAt(i, matrix.matrix); tiling.setColorAt(i, new THREE.Color().setHSL(.065 + (i % 5) * .008, .13, .31 + (i % 7) * .016)); });
    tiling.receiveShadow = true; this.scene.add(tiling);
    // Inlaid concentric navigation lines.
    for (const radius of [2.2, 9.85]) {
      const ring = this.mesh(new THREE.RingGeometry(radius, radius + .035, 96), this.material(0xcfa56a, { emissive: 0x7c4a13, emissiveIntensity: .3 }), 0, .31, 0);
      ring.rotation.x = -Math.PI / 2;
    }
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * Math.PI * 2;
      if (i % 10 === 0 || i % 10 === 1 || i % 10 === 9) continue;
      const wall = this.mesh(new THREE.BoxGeometry(1.25, .65 + (i % 3) * .1, .55), i % 2 ? stone : edge, Math.sin(a) * 10.65, .6, Math.cos(a) * 10.65);
      wall.rotation.y = a;
    }
    // Recessed ornament under the floating island.
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const buttress = this.mesh(new THREE.BoxGeometry(.9, 3.4, 1.3), stone, Math.sin(a) * 9.7, -1.8, Math.cos(a) * 9.7); buttress.rotation.y = a;
      const inset = this.mesh(new THREE.BoxGeometry(.3, .12, 1.36), this.material(0xffb740, { emissive: 0xff981f, emissiveIntensity: 1.3 }), Math.sin(a) * 9.7, -.9, Math.cos(a) * 9.7); inset.rotation.y = a;
    }
    // Central altar: shallow steps so it remains a traversable gameplay landmark.
    this.mesh(new THREE.CylinderGeometry(1.6, 1.85, .2, 8), edge, 0, .36, 0);
    this.mesh(new THREE.CylinderGeometry(1.2, 1.5, .2, 8), gold, 0, .54, 0);
    this.mesh(new THREE.CylinderGeometry(.92, 1.1, .16, 8), stone, 0, .72, 0);
    for (const p of PILLARS) {
      this.mesh(new THREE.CylinderGeometry(.8, 1.05, .35, 4), edge, p.x, .45, p.z).rotation.y = Math.PI / 4;
      this.mesh(new THREE.BoxGeometry(.95, 2.3, .95), stone, p.x, 1.6, p.z);
      this.mesh(new THREE.BoxGeometry(1.16, .18, 1.16), gold, p.x, 2.8, p.z);
      const c = this.mesh(new THREE.OctahedronGeometry(.64), this.material(0xa866ff, { emissive: 0x7b25df, emissiveIntensity: 1.7, metalness: .35, roughness: .25 }), p.x, 3.55, p.z);
      c.scale.y = 1.5; this.crystals.push(c);
      const small = this.mesh(new THREE.OctahedronGeometry(.19), this.material(0xca97ff, { emissive: 0x8c43de, emissiveIntensity: 1.1 }), p.x, 1.5, p.z + .49); small.scale.y = 1.7;
      for (let k = 0; k < 4; k++) this.mesh(new THREE.BoxGeometry(.98, .025, .98), this.material(0x76556f), p.x, .8 + k * .5, p.z);
    }
    for (let i = 0; i < SHRINES.length; i++) {
      const p = SHRINES[i], group = new THREE.Group(); group.position.set(p.x, .34, p.z);
      this.mesh(new THREE.CylinderGeometry(1.1, 1.35, .2, 8), edge, 0, 0, 0, group);
      const surface = this.mesh(new THREE.CylinderGeometry(.95, .95, .05, 8), this.material(0x755a7c, { emissive: 0x67406c, emissiveIntensity: .2 }), 0, .14, 0, group);
      surface.name = 'surface';
      const ring = this.mesh(new THREE.TorusGeometry(1, .075, 6, 32), this.material(0xffce61, { emissive: 0xffa31a, emissiveIntensity: 1.7 }), 0, .3, 0, group); ring.rotation.x = Math.PI / 2; ring.name = 'ring';
      const beacon = this.mesh(new THREE.CylinderGeometry(.9, 1.05, 4.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffbf4d, transparent: true, opacity: .09, side: THREE.DoubleSide, depthWrite: false }), 0, 2.3, 0, group); beacon.name = 'beacon';
      this.scene.add(group); this.shrines.push(group);
    }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.PI / 8, x = Math.sin(a) * 9.7, z = Math.cos(a) * 9.7;
      this.mesh(new THREE.CylinderGeometry(.2, .28, 1.6, 6), stone, x, 1.05, z);
      this.mesh(new THREE.CylinderGeometry(.38, .18, .3, 6), gold, x, 1.96, z);
      const flame = this.mesh(new THREE.OctahedronGeometry(.24), this.material(0xffcb6a, { emissive: 0xffa032, emissiveIntensity: 3 }), x, 2.33, z); flame.scale.y = 1.8; this.flames.push(flame);
    }
    // Ancient entrance silhouette, behind the arena and outside the play boundary.
    for (const x of [-3, 3]) {
      this.mesh(new THREE.BoxGeometry(1.2, 6.5, 1.4), stone, x, 3, -11.8);
      this.mesh(new THREE.BoxGeometry(1.5, .35, 1.7), edge, x, 6.1, -11.8);
      const cloth = this.mesh(new THREE.PlaneGeometry(.7, 3), this.material(0x663153, { side: THREE.DoubleSide }), x, 4.1, -11.05);
      cloth.rotation.z = x > 0 ? -.06 : .06;
      const diamond = this.mesh(new THREE.OctahedronGeometry(.22), gold, x, 4.3, -10.98); diamond.scale.y = 1.6;
    }
    for (let i = 0; i < 11; i++) {
      const a = i / 10 * Math.PI;
      const block = this.mesh(new THREE.BoxGeometry(.93, 1.05, 1.7), i % 2 ? edge : stone, Math.cos(a) * 3, 3.8 + Math.sin(a) * 3, -11.8);
      block.rotation.z = a + Math.PI / 2;
    }
    // Moss and broken stones give the temple a history without obscuring the play field.
    const foliage = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.17), this.material(0x375449), 96);
    for (let i = 0; i < 96; i++) {
      const a = Math.floor(i / 12) * Math.PI / 4 + Math.sin(i * 3) * .02;
      matrix.position.set(Math.sin(a) * 10.9, -.1 - (i % 12) * .14, Math.cos(a) * 10.9); matrix.scale.set(1 + i % 3 * .3, .8, 1); matrix.rotation.set(i, i * 2, 0); matrix.updateMatrix(); foliage.setMatrixAt(i, matrix.matrix);
    }
    this.scene.add(foliage);
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4, r = 27 + (i % 3) * 6;
      const g = new THREE.Group(); g.position.set(Math.sin(a) * r, -5 - (i % 3) * 3, Math.cos(a) * r - 8);
      this.mesh(new THREE.CylinderGeometry(2, .3, 6, 5), this.material(0x3c294f), 0, 0, 0, g);
      this.mesh(new THREE.CylinderGeometry(2.2, 2.1, .4, 6), edge, 0, 3.1, 0, g);
      this.mesh(new THREE.ConeGeometry(.6, 3.5, 5), this.material(0x77518d, { emissive: 0x2b123e }), 0, 4.8, 0, g);
      this.scene.add(g);
    }
  }

  private buildRelic() {
    const crystal = this.material(0xffcd51, { metalness: .5, roughness: .15, emissive: 0xff9f18, emissiveIntensity: 1.8 });
    const core = this.mesh(new THREE.OctahedronGeometry(.62), crystal, 0, 0, 0, this.relic); core.scale.y = 1.3;
    const cage = this.mesh(new THREE.OctahedronGeometry(.9), new THREE.MeshBasicMaterial({ color: 0xffe09a, wireframe: true }), 0, 0, 0, this.relic); cage.scale.y = 1.35;
    const orbit = this.mesh(new THREE.TorusGeometry(1.03, .022, 5, 48), this.material(0xffefbb, { emissive: 0xffcf65, emissiveIntensity: 2 }), 0, 0, 0, this.relic); orbit.rotation.x = Math.PI / 2;
    this.scene.add(this.relic);
  }

  private createRunner(p: Player) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const color = RUNNERS[p.color].color, coat = this.material(color), dark = this.material(0x27232f), pale = this.material(0xffecd0), trim = this.material(0xcda969, { metalness: .45 });
    // Faceted cloak, angular hood, inset mask, pauldrons, boots and satchel.
    const torso = this.mesh(new THREE.CylinderGeometry(.27, .4, .7, 6), coat, 0, .89, 0, body); torso.rotation.y = Math.PI / 6;
    const hood = this.mesh(new THREE.IcosahedronGeometry(.42, 0), coat, 0, 1.49, -.01, body); hood.scale.set(1, 1.18, 1);
    const opening = this.mesh(new THREE.SphereGeometry(.30, 6, 5), dark, 0, 1.45, -.25, body); opening.scale.set(.9, 1.05, .5);
    const mask = this.mesh(new THREE.SphereGeometry(.23, 5, 4), pale, 0, 1.45, -.36, body); mask.scale.set(.92, 1.1, .38);
    for (const x of [-.085, .085]) { const eye = this.mesh(new THREE.BoxGeometry(.09, .035, .03), dark, x, 1.50, -.444, body); eye.rotation.z = x > 0 ? .24 : -.24; }
    const cape = this.mesh(new THREE.ConeGeometry(.49, 1.0, 5, 1, true), this.material(color, { side: THREE.DoubleSide }), 0, .82, .19, body); cape.rotation.x = -.14;
    for (const side of [-1, 1]) {
      this.mesh(new THREE.IcosahedronGeometry(.21), coat, side * .34, 1.03, 0, body);
      const arm = this.mesh(new THREE.CylinderGeometry(.1, .09, .46, 5), dark, side * .35, .72, -.04, body); arm.rotation.z = side * -.16;
      this.mesh(new THREE.IcosahedronGeometry(.12), pale, side * .39, .47, -.08, body);
    }
    this.mesh(new THREE.BoxGeometry(.65, .09, .47), dark, 0, .68, 0, body);
    this.mesh(new THREE.BoxGeometry(.12, .12, .05), trim, 0, .68, -.25, body);
    this.mesh(new THREE.BoxGeometry(.2, .23, .17), this.material(0x78513b), .3, .66, .13, body);
    const feet: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(side * .17, .42, 0);
      this.mesh(new THREE.CylinderGeometry(.1, .12, .35, 5), dark, 0, -.06, 0, leg);
      this.mesh(new THREE.BoxGeometry(.23, .2, .35), dark, 0, -.23, -.08, leg); body.add(leg); feet.push(leg);
    }
    const ring = this.mesh(new THREE.RingGeometry(.5, .58, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, side: THREE.DoubleSide }), 0, .34, 0, root); ring.rotation.x = -Math.PI / 2;
    root.position.set(p.x, .3, p.z); this.scene.add(root);
    const model = { root, body, cape, feet, ring, position: root.position.clone(), color: p.color }; this.models.set(p.id, model);
    const label = document.createElement('div'); label.className = 'runner-label'; label.textContent = p.name; label.style.setProperty('--runner', color); this.labels.appendChild(label); this.labelNodes.set(p.id, label);
    return model;
  }

  update(snapshot: Snapshot, localId: string) {
    this.state = snapshot; this.localId = localId;
    for (const p of snapshot.players) if (!this.models.has(p.id)) this.createRunner(p);
    for (const [id, model] of this.models) if (!snapshot.players.some(p => p.id === id)) { this.disposeObject(model.root); this.scene.remove(model.root); this.models.delete(id); this.labelNodes.get(id)?.remove(); this.labelNodes.delete(id); }
    for (const event of snapshot.events) if (event.id > this.seenEvent) {
      this.seenEvent = event.id;
      if (snapshot.elapsed - event.at < .5) {
        this.onEvent?.(event.kind, event.player === localId);
        if (event.kind === 'pulse' || event.kind === 'score') {
          const material = new THREE.MeshBasicMaterial({ color: event.kind === 'score' ? 0xffd666 : RUNNERS[snapshot.players.find(p => p.id === event.player)?.color ?? 0].color, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false });
          const mesh = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64), material); mesh.rotation.x = -Math.PI / 2; mesh.position.set(event.x, .42, event.z); this.scene.add(mesh); this.effects.push({ mesh, age: 0, kind: event.kind, material });
        }
      }
    }
  }

  private fit() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.renderer.setSize(w, h); this.composer.setSize(w, h); this.camera.aspect = w / h;
    const mobile = w / h < .85;
    this.camera.position.set(0, mobile ? 33 : 25, mobile ? 25 : 20);
    this.camera.fov = mobile ? 49 : 43; this.camera.lookAt(0, mobile ? 0 : .2, -.6); this.camera.updateProjectionMatrix();
  }

  private animate = (at: number) => {
    this.frame = requestAnimationFrame(this.animate);
    const dt = Math.min((at - (this.last || at)) / 1000, .05); this.last = at; this.clock += dt;
    const t = this.clock;
    if (this.state) {
      for (const p of this.state.players) {
        const model = this.models.get(p.id)!;
        const before = model.root.position.clone();
        model.root.position.lerp(new THREE.Vector3(p.x, .32, p.z), Math.min(1, dt * 20));
        const moving = before.distanceTo(model.root.position) > .004;
        const targetAngle = Math.atan2(-p.dx, -p.dz);
        model.body.rotation.y += Math.atan2(Math.sin(targetAngle - model.body.rotation.y), Math.cos(targetAngle - model.body.rotation.y)) * Math.min(1, dt * 18);
        model.body.position.y = moving && !this.reducedMotion ? Math.abs(Math.sin(t * 13)) * .075 : 0;
        model.feet.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(t * 13 + i * Math.PI) * .45 : 0; });
        model.cape.rotation.x = -.15 + (moving ? -.15 + Math.sin(t * 14) * .08 : Math.sin(t * 2) * .025);
        model.ring.material instanceof THREE.MeshBasicMaterial && (model.ring.material.opacity = p.id === this.localId ? .95 : .38);
        model.body.visible = !(p.invincible > 0 && Math.sin(t * 25) < -.4);
        const label = this.labelNodes.get(p.id)!;
        const pos = model.root.position.clone().add(new THREE.Vector3(0, 2.35, 0)).project(this.camera);
        label.style.transform = `translate(-50%,-50%) translate(${(pos.x * .5 + .5) * this.container.clientWidth}px,${(-pos.y * .5 + .5) * this.container.clientHeight}px)`;
        label.classList.toggle('is-you', p.id === this.localId); label.classList.toggle('has-relic', p.id === this.state.carrier);
      }
      const carrier = this.state.carrier ? this.models.get(this.state.carrier) : null;
      const target = carrier ? carrier.root.position.clone().add(new THREE.Vector3(0, 2.6, 0)) : new THREE.Vector3(this.state.relic.x, 2.05, this.state.relic.z);
      this.relic.position.lerp(target, Math.min(1, dt * 18));
      this.relic.position.y += Math.sin(t * 2.5) * .003;
      this.relic.visible = this.state.elapsed >= this.state.pickupAt - .4;
      this.relic.scale.setScalar(carrier ? .55 : 1);
      this.shrines.forEach((g, i) => {
        const active = i === this.state!.shrine;
        g.getObjectByName('ring')!.visible = active; g.getObjectByName('beacon')!.visible = active;
        const surface = g.getObjectByName('surface') as THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
        surface.material.emissive.set(active ? 0xff9f20 : 0x67406c); surface.material.emissiveIntensity = active ? .7 : .1;
      });
    }
    this.relic.rotation.y = t * .8;
    this.crystals.forEach((c, i) => { c.rotation.y = t * .4 + i; c.position.y = 3.55 + Math.sin(t * 1.7 + i) * .13; });
    this.flames.forEach((f, i) => { f.scale.y = 1.5 + Math.sin(t * 9 + i * 3) * .25; });
    this.starfield.rotation.y = this.reducedMotion ? 0 : t * .004;
    this.effects = this.effects.filter(effect => {
      effect.age += dt; const duration = effect.kind === 'score' ? .9 : .48;
      const fraction = effect.age / duration; effect.mesh.scale.setScalar(1 + fraction * (effect.kind === 'score' ? 5 : 2)); effect.material.opacity = (1 - fraction) * .85;
      if (fraction >= 1) { this.scene.remove(effect.mesh); effect.mesh.geometry.dispose(); effect.material.dispose(); return false; } return true;
    });
    this.composer.render();
  };

  private disposeObject(object: THREE.Object3D) { object.traverse(child => { if (child instanceof THREE.Mesh || child instanceof THREE.Points) { child.geometry.dispose(); for (const mat of Array.isArray(child.material) ? child.material : [child.material]) mat.dispose(); } }); }
  dispose() { cancelAnimationFrame(this.frame); this.resize.disconnect(); this.disposeObject(this.scene); if (this.scene.background instanceof THREE.Texture) this.scene.background.dispose(); this.composer.passes.forEach(pass => pass.dispose()); this.composer.dispose(); this.renderer.dispose(); this.renderer.domElement.remove(); this.labels.remove(); }
}
