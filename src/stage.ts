import * as T from 'three';
import { canvasOf, ctx2d, mixHex, paintBackground, paintEnv, paintTerrazzo, radial, rng, texOf } from './art';
import { BASE, ICE, type Drink, type GarnishId, type Order, type VesselId } from './data';
import { iceCube, makeCan, makeGarnish, makeIcePile, makeLime, makeBottle, makeMarigold, makeMint, makePeaFlower, makeRing, makeStraw, makeTin, spline } from './models';

const reduceMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;
const vec2 = (x: number, y: number) => new T.Vector2(x, y);
const clamp = T.MathUtils.clamp;
const lerp = T.MathUtils.lerp;
const ease = (u: number) => u * u * (3 - 2 * u);

/** cup: brewing in the measuring glass. pouring: moving to the serving vessel. serving: finishing it there. */
export type Phase = 'cup' | 'pouring' | 'serving';

const glassMat = new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.08, side: T.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5 });
const fresnelMat = new T.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: T.DoubleSide,
  vertexShader: 'varying vec3 n;varying vec3 v;void main(){n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
  fragmentShader: 'varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(v))),2.6);gl_FragColor=vec4(vec3(1.,.98,.93),f*.82+.015);}',
});

function vesselPts(k: VesselId, finished: boolean): T.Vector2[] {
  if (k === 'cup') {
    const wall = Array.from({ length: 30 }, (_, i) => vec2(0.6 + ((i + 1) / 30) * 0.28, 0.08 + ((i + 1) / 30) * 2.97));
    return [vec2(0.001, 0.03), vec2(0.56, 0.03), vec2(0.6, 0.08), ...wall];
  }
  return finished
    ? spline([[0.001, 0.02], [0.62, 0.03], [0.9, 0.22], [1, 0.9], [0.98, 1.7], [0.82, 2.4], [0.46, 2.82], [0.2, 3.02], [0.17, 3.1], [0.38, 3.45], [0.62, 3.85]], 80)
    : spline([[0.001, 0.02], [0.62, 0.03], [0.9, 0.22], [1, 0.9], [0.98, 1.8], [0.92, 2.6], [0.86, 3.1], [0.92, 3.8]], 80);
}

function crinkle(g: T.BufferGeometry): T.BufferGeometry {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const t = Math.atan2(x, z);
    const f = 1 + (0.012 + 0.06 * T.MathUtils.smoothstep(y, 1.6, 3.8)) * (Math.sin(t * 9 + y * 4) + 0.6 * Math.sin(t * 17 - y * 7 + 1));
    p.setX(i, x * f);
    p.setZ(i, z * f);
  }
  g.computeVertexNormals();
  return g;
}

function addGlassSkin(g: T.Group, geo: T.BufferGeometry): void {
  const body = new T.Mesh(geo, glassMat);
  const rim = new T.Mesh(geo, fresnelMat);
  body.renderOrder = 3;
  rim.renderOrder = 4;
  g.add(body, rim);
}

/** Serving vessels: a plastic cup that gets a dome lid, or a bag tied with a rubber band, both once served. */
function buildShell(k: VesselId, finished: boolean): T.Group {
  const g = new T.Group();
  const pts = vesselPts(k, finished);
  const lathe = new T.LatheGeometry(pts, 96);
  addGlassSkin(g, k === 'bag' ? crinkle(lathe) : lathe);
  const shine = (start: number, length: number, y0: number, y1: number, opacity: number) => {
    const strip = pts.filter((p) => p.y >= y0 && p.y <= y1).map((p) => vec2(p.x * 1.004, p.y));
    const m = new T.Mesh(new T.LatheGeometry(strip, 12, start, length), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
    m.renderOrder = 5;
    g.add(m);
  };
  shine(-1.05, 0.2, 0.35, 2.5, 0.28);
  shine(0.9, 0.09, 0.5, 2.2, 0.13);
  if (k === 'cup') {
    const rim = new T.Mesh(new T.TorusGeometry(0.885, 0.028, 10, 96), new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.75, envMapIntensity: 1.6 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 3.05;
    rim.renderOrder = 4;
    g.add(rim);
    if (finished) {
      addGlassSkin(g, new T.LatheGeometry(spline([[0.89, 3.06], [0.86, 3.16], [0.7, 3.44], [0.42, 3.64], [0.18, 3.7], [0.12, 3.66]], 28), 96));
    }
  } else if (finished) {
    const band = new T.Mesh(new T.TorusGeometry(0.19, 0.035, 10, 32), new T.MeshStandardMaterial({ color: 0xd92c6a, roughness: 0.5 }));
    band.rotation.x = Math.PI / 2;
    band.position.y = 3.05;
    g.add(band);
  }
  return g;
}

const CUP_FLOOR = 0.17;
const cupY = (L: number) => CUP_FLOOR + L * 1.5;
const rCup = (y: number) => 0.63 + (y / 1.72) * 0.13;
const BUBBLES = 70;

export interface StageElements {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  ticket: HTMLElement;
  panel: HTMLElement;
}

export class DrinkStage {
  phase: Phase = 'cup';

  private readonly renderer: T.WebGLRenderer;
  private readonly env: T.Texture;
  private readonly scene = new T.Scene();
  private readonly camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
  private readonly bgTex = paintBackground();
  private readonly sceneryOnly: T.Object3D[];
  private readonly glow: T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>;

  private readonly servingG = new T.Group();
  private readonly shells: Record<string, T.Group> = {};
  private shellNow: T.Group | null = null;
  private vessel: VesselId = 'cup';
  private vesselFloor = 0.05;
  private vesselRange = 2.9;
  private profile = vesselPts('cup', false);

  private readonly liqCanvas = canvasOf(256, 512);
  private readonly liqTex = texOf(this.liqCanvas);
  private readonly liquidMat = new T.MeshPhysicalMaterial({ map: this.liqTex, emissiveMap: this.liqTex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.38, transparent: true, opacity: 0.96, clearcoat: 0.25, envMapIntensity: 0.18, toneMapped: false });
  private readonly liquid = new T.Mesh(new T.BufferGeometry(), this.liquidMat);
  private level = 0;
  private levelTarget = 0;
  private levelBuilt = -1;

  private readonly cupG = new T.Group();
  private readonly cupLiquid = new T.Mesh(new T.BufferGeometry(), this.liquidMat);
  private readonly spoon = new T.Group();
  private cupLevel = 0;
  private cupTarget = 0;
  private cupBuilt = -1;
  private spoonOn = false;

  private readonly stream = new T.Mesh(new T.CylinderGeometry(0.045, 0.03, 1, 16), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, emissive: 0xffffff, emissiveIntensity: 0.2 }));
  private streamT = 0;

  private readonly cubes: T.Group[] = [];
  private readonly bubblePos = new Float32Array(BUBBLES * 3);
  private readonly bubbleState: { a: number; rf: number; y: number; v: number }[] = [];
  private readonly bubbleGeo = new T.BufferGeometry();
  private readonly bubbles: T.Points<T.BufferGeometry, T.PointsMaterial>;

  private garnishObj: T.Group | null = null;
  private garnishKey: GarnishId = 'none';
  private garnishPop = 1;

  private pourT = 0;
  private pourFrom = 0;
  private camCup = 1;
  private parX = 0;
  private parY = 0;
  private camDist = 9;

  /** Mix value the liquid texture was last painted with. */
  paintedMix = -1;

  constructor(private readonly els: StageElements) {
    this.renderer = new T.WebGLRenderer({ canvas: els.canvas, antialias: true, alpha: true });
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.env = new T.PMREMGenerator(this.renderer).fromEquirectangular(paintEnv()).texture;

    const { scene } = this;
    scene.background = this.bgTex;
    scene.environment = this.env;
    const key = new T.DirectionalLight(0xfff0d6, 1.5);
    key.position.set(-3, 6, 5);
    const rim = new T.PointLight(0xffb066, 14, 12);
    rim.position.set(2.8, 3.6, -2.2);
    scene.add(key, rim);

    const counter = new T.Mesh(new T.PlaneGeometry(44, 16), new T.MeshStandardMaterial({ map: texOf(paintTerrazzo(), [8, 3]), roughness: 0.27, metalness: 0.05, envMapIntensity: 0.9 }));
    counter.rotation.x = -Math.PI / 2;
    counter.position.set(0, 0, 5.4);
    const edge = new T.Mesh(new T.BoxGeometry(44, 0.05, 0.05), new T.MeshStandardMaterial({ color: 0xf8efdc, roughness: 0.2, metalness: 0.2 }));
    edge.position.set(0, -0.012, -2.6);
    const mat = this.buildBarMat();

    const shadow = new T.Mesh(new T.PlaneGeometry(3.6, 2.3), new T.MeshBasicMaterial({ map: radial('#2a1a10', '66'), transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0.15, 0.09, -0.05);
    this.glow = new T.Mesh(new T.PlaneGeometry(2.6, 1.7), new T.MeshBasicMaterial({ map: radial('#ffffff', '55'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, color: 0xffffff }));
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.set(0.35, 0.095, 0.52);
    scene.add(counter, edge, mat, shadow, this.glow);

    this.servingG.position.y = 0.07;
    scene.add(this.servingG);
    this.liquid.renderOrder = 2;
    this.liquid.visible = false;
    this.servingG.add(this.liquid);

    this.stream.visible = false;
    this.stream.renderOrder = 1;
    scene.add(this.stream);

    this.buildMeasuringGlass();

    const r = rng(5);
    for (let i = 0; i < 8; i++) {
      const c = iceCube(0.34 + r() * 0.09);
      c.rotation.set(r() * 3, r() * 3, r() * 3);
      c.userData = { a: i * 2.4, rf: 0.35 + r() * 0.65, dy: i < 4 ? (i % 2 ? 0.02 : 0.14) : 0.25 + r() * 0.4, p: r() * 6 };
      c.visible = false;
      c.children[0].renderOrder = 1;
      this.servingG.add(c);
      this.cubes.push(c);
    }

    const rb = rng(9);
    for (let i = 0; i < BUBBLES; i++) this.bubbleState.push({ a: rb() * 6.28, rf: Math.sqrt(rb()) * 0.82, y: rb(), v: 0.05 + rb() * 0.14 });
    this.bubbleGeo.setAttribute('position', new T.BufferAttribute(this.bubblePos, 3));
    this.bubbles = new T.Points(this.bubbleGeo, new T.PointsMaterial({ size: 0.036, map: radial('#ffffff', '99'), transparent: true, opacity: 0.55, depthWrite: false, color: 0xffffff }));
    this.bubbles.renderOrder = 2;
    this.bubbles.frustumCulled = false;
    this.servingG.add(this.bubbles);

    this.sceneryOnly = [counter, edge, shadow, this.glow, this.stream, mat];
    this.syncVessels();
  }

  /** Black rubber with rows of nubs, plus a scatter of spilled sugar. */
  private buildBarMat(): T.Group {
    const g = new T.Group();
    const rubber = new T.MeshStandardMaterial({ color: 0x101012, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.7 });
    const base = new T.Mesh(new T.BoxGeometry(6.4, 0.04, 4), rubber);
    base.position.set(0, 0.02, 0.25);
    g.add(base);
    const cols = 46;
    const rows = 28;
    const nubs = new T.InstancedMesh(new T.CylinderGeometry(0.04, 0.052, 0.035, 10), rubber, cols * rows);
    const d = new T.Object3D();
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        d.position.set(-3.08 + i * 0.137, 0.057, -1.6 + j * 0.137);
        d.updateMatrix();
        nubs.setMatrixAt(i * rows + j, d.matrix);
      }
    }
    g.add(nubs);
    const r = rng(31);
    const grains = new T.InstancedMesh(new T.IcosahedronGeometry(0.016, 0), new T.MeshStandardMaterial({ color: 0xfff8ea, roughness: 0.4 }), 90);
    for (let i = 0; i < 90; i++) {
      const a = r() * 6.28;
      const q = 1 + r() * 1.9;
      d.position.set(Math.cos(a) * q + 0.3, 0.082, Math.sin(a) * q * 0.7 + 0.3);
      d.rotation.set(r() * 3, r() * 3, 0);
      d.updateMatrix();
      grains.setMatrixAt(i, d.matrix);
    }
    g.add(grains);
    return g;
  }

  /** Straight-sided with red graduations; sits on the mat while brewing. */
  private buildMeasuringGlass(): void {
    const { cupG, spoon } = this;
    cupG.position.y = 0.07;
    this.scene.add(cupG);

    const outer = new T.LatheGeometry([vec2(0.001, 0), vec2(0.62, 0), vec2(0.67, 0.05), vec2(0.78, 1.72)], 96);
    addGlassSkin(cupG, outer);
    const floor = new T.Mesh(new T.LatheGeometry([vec2(0.62, 0.22), vec2(0.55, CUP_FLOOR), vec2(0.001, CUP_FLOOR)], 96), glassMat);
    floor.renderOrder = 3;
    const lip = new T.Mesh(new T.TorusGeometry(0.775, 0.024, 12, 96), new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.55, envMapIntensity: 2 }));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 1.72;
    lip.renderOrder = 4;
    const highlight = new T.Mesh(new T.LatheGeometry([vec2(0.71, 0.28), vec2(0.78, 1.58)], 4, -1.1, 0.2), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
    highlight.renderOrder = 5;

    const c = canvasOf(1024, 512);
    const x = ctx2d(c);
    x.strokeStyle = x.fillStyle = '#d8261c';
    x.textBaseline = 'middle';
    for (let i = 0; i <= 20; i++) {
      const y = 490 - i * 23;
      const major = i % 5 === 0;
      x.lineWidth = major ? 5 : 3;
      x.beginPath();
      x.moveTo(430, y);
      x.lineTo(major ? 510 : 470, y);
      x.stroke();
      if (major && i) {
        x.font = '500 40px Mitr,Tahoma,sans-serif';
        x.fillText(i === 20 ? '200 ml' : String(i * 10), 524, Math.max(y, 26));
      }
    }
    const marks = new T.Mesh(new T.CylinderGeometry(0.783, 0.692, 1.54, 64, 1, true, Math.PI), new T.MeshBasicMaterial({ map: texOf(c), transparent: true, depthWrite: false, toneMapped: false }));
    marks.position.y = 0.87;
    marks.renderOrder = 4;

    this.cupLiquid.renderOrder = 2;
    this.cupLiquid.visible = false;
    cupG.add(floor, lip, highlight, marks, this.cupLiquid);

    const steel = new T.MeshStandardMaterial({ color: 0xe8e6e0, metalness: 1, roughness: 0.18, envMapIntensity: 1.5 });
    const shaft = new T.Mesh(new T.CylinderGeometry(0.036, 0.03, 2.9, 12), steel);
    shaft.position.y = 1.5;
    const bowl = new T.Mesh(new T.SphereGeometry(0.11, 20, 14), steel);
    bowl.scale.set(0.75, 0.32, 1.15);
    bowl.position.y = 0.06;
    const knob = new T.Mesh(new T.SphereGeometry(0.05, 14, 10), steel);
    knob.position.y = 2.95;
    const arm = new T.Group();
    arm.add(shaft, bowl, knob);
    arm.position.set(0.34, CUP_FLOOR + 0.03, 0);
    arm.rotation.z = -0.17;
    spoon.add(arm);
    spoon.visible = false;
    cupG.add(spoon);
  }

  private radiusAt(y: number): number {
    const pts = this.profile;
    for (let i = 1; i < pts.length; i++) {
      if (y <= pts[i].y) {
        const a = pts[i - 1];
        const b = pts[i];
        return a.x + (b.x - a.x) * ((y - a.y) / Math.max(1e-5, b.y - a.y));
      }
    }
    return pts[pts.length - 1].x;
  }

  private levelY(L: number): number {
    return this.vesselFloor + 0.03 + L * this.vesselRange;
  }

  private buildLiquid(L: number): void {
    const floor = this.vesselFloor;
    const yL = this.levelY(L);
    const pts = this.profile.filter((p) => p.y < yL && p.y >= floor + 0.015).map((p) => vec2(p.x * 0.945, p.y));
    pts.unshift(vec2(0.001, floor + 0.015));
    const rt = this.radiusAt(yL) * 0.945;
    pts.push(vec2(rt, yL), vec2(rt * 0.5, yL), vec2(0.001, yL));
    this.liquid.geometry.dispose();
    this.liquid.geometry = this.mapHeightToUv(new T.LatheGeometry(pts, 64), floor, yL);
    this.levelBuilt = L;
  }

  private buildCupLiquid(L: number): void {
    const yL = cupY(L);
    const pts = [vec2(0.001, CUP_FLOOR + 0.005)];
    for (let i = 0; i <= 7; i++) {
      const y = CUP_FLOOR + 0.005 + ((yL - CUP_FLOOR - 0.005) * i) / 7;
      pts.push(vec2(rCup(y) - 0.015, y));
    }
    pts.push(vec2((rCup(yL) - 0.015) * 0.5, yL), vec2(0.001, yL));
    this.cupLiquid.geometry.dispose();
    this.cupLiquid.geometry = this.mapHeightToUv(new T.LatheGeometry(pts, 64), CUP_FLOOR, yL);
    this.cupBuilt = L;
  }

  /** Keeps the colour gradient spanning the whole liquid at any fill level. */
  private mapHeightToUv(g: T.LatheGeometry, floor: number, top: number): T.LatheGeometry {
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setY(i, clamp((pos.getY(i) - floor) / Math.max(0.01, top - floor), 0, 1));
    return g;
  }

  /** Mix 0 = milk sitting on top of the base with powder specks; mix 1 = one even colour with a little foam. */
  paintLiquid(s: Drink): void {
    const x = ctx2d(this.liqCanvas);
    const W = 256;
    const H = 512;
    const mx = s.mix;
    const B = s.base ? BASE[s.base] : null;
    const MILK = B ? B.milk : '#fff1dc';
    const m = s.milk.cond + s.milk.evap;
    const syr = s.milk.syrup;
    const soda = s.milk.soda;
    const lem = s.milk.lemon;
    const b = B ? B.c : m ? MILK : soda ? '#e6f6fb' : lem ? '#efe48a' : '#e9dcae';

    let final = m ? mixHex(b, MILK, Math.min(0.8, B ? B.mk0 + B.mk1 * m : 1)) : syr ? mixHex(b, '#ffd27a', 0.03 * syr) : b;
    // Butterfly pea really does turn purple with lime; anything else only picks up a yellow cast.
    if (lem) final = s.base === 'pea' ? mixHex(final, '#c04bd8', Math.min(0.75, 0.45 + 0.15 * lem)) : mixHex(final, '#f0b030', 0.14 * lem);
    if (soda) final = mixHex(final, '#ffffff', 0.02 * soda);
    const rawTop = m ? MILK : lem ? '#f0dc70' : soda ? '#eaf8ff' : syr ? '#f2cf7c' : b;

    this.bubbles.material.opacity = soda ? 0.9 : 0.5;
    this.bubbles.material.size = soda ? 0.058 : 0.036;

    const bot = mixHex(mixHex(b, '#000000', 0.12), mixHex(final, '#000000', 0.1), mx);
    const mid = mixHex(b, final, mx);
    const top = mixHex(rawTop, mixHex(final, '#fff2dc', m ? 0.14 : 0.06), mx);
    const g = x.createLinearGradient(0, H, 0, 0);
    g.addColorStop(0, bot);
    g.addColorStop(0.45, mid);
    g.addColorStop(0.86, mixHex(mid, top, 0.5 + 0.3 * mx));
    g.addColorStop(1, top);
    x.filter = 'none';
    x.globalAlpha = 1;
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);

    if ((m || syr || soda || lem) && mx < 1) {
      const r = rng(41 + m * 7 + syr * 3);
      x.filter = 'blur(5px)';
      x.lineCap = 'round';
      x.strokeStyle = rawTop;
      for (let i = 0; i < 56; i++) {
        const y = H * (0.05 + r() * 0.52);
        const a = r() * W;
        x.globalAlpha = (0.14 + r() * 0.34) * (1 - mx);
        x.lineWidth = 3 + r() * 15;
        x.beginPath();
        x.moveTo(a, y);
        x.bezierCurveTo(a + 40 * r(), y + 50 * r(), a - 50 * r(), y + 90 * r(), a + 24 - 48 * r(), y + 120 * r() + 30);
        x.stroke();
      }
      x.globalAlpha = 1;
      x.filter = 'none';
    }
    if (s.base && mx < 0.5) {
      const r = rng(11);
      x.fillStyle = mixHex(b, '#000000', 0.55);
      x.globalAlpha = (1 - mx * 2) * 0.7;
      for (let i = 0; i < 120; i++) {
        x.beginPath();
        x.arc(r() * W, H * (0.02 + r() * 0.5), 0.8 + r() * 2.4, 0, 7);
        x.fill();
      }
      x.globalAlpha = 1;
    }
    this.liqTex.needsUpdate = true;
    this.paintedMix = mx;
    this.glow.material.color.set(s.base || m || soda || lem ? final : '#ffffff');
    this.stream.material.color.set(mid);
    this.stream.material.emissive.set(mid);
  }

  setVessel(k: VesselId, finished: boolean): void {
    this.vessel = k;
    this.vesselFloor = k === 'cup' ? 0.05 : 0.04;
    this.vesselRange = k === 'cup' ? 2.9 : 2.55;
    this.profile = vesselPts(k, finished);
    const id = k + (finished ? '1' : '0');
    this.shells[id] ??= buildShell(k, finished);
    if (this.shellNow) this.servingG.remove(this.shellNow);
    this.shellNow = this.shells[id];
    this.servingG.add(this.shellNow);
    this.servingG.scale.z = k === 'bag' ? 0.82 : 1;
    if (this.level > 0.01) this.buildLiquid(this.level);
  }

  setGarnish(k: GarnishId, instant: boolean): void {
    if (k === this.garnishKey && this.garnishObj) return;
    if (this.garnishObj) this.servingG.remove(this.garnishObj);
    this.garnishObj = null;
    this.garnishKey = k;
    if (k === 'none') return;
    const o = makeGarnish(k, this.vessel);
    const h = new T.Group();
    h.add(o);
    if (k === 'lime') {
      o.rotation.set(1.05, 0, 0);
      o.scale.setScalar(0.82);
      h.userData.float = 0.18;
    } else if (k === 'mint') {
      o.scale.setScalar(0.56);
      o.rotation.x = -0.85;
      h.userData.float = -0.18;
    } else if (k === 'pea') {
      o.scale.setScalar(0.62);
      o.rotation.x = -0.9;
      h.userData.float = 0.2;
    } else if (k === 'marigold') {
      o.scale.setScalar(0.62);
      o.rotation.x = -0.75;
      h.userData.float = -0.25;
    }
    this.garnishObj = h;
    this.garnishPop = instant ? 1 : 0;
    this.servingG.add(h);
  }

  applyDrink(s: Drink, instant: boolean): void {
    this.paintLiquid(s);
    const M = s.milk;
    const has = s.base || M.cond + M.evap + M.syrup + M.soda + M.lemon > 0;
    const amount = has ? (s.base ? 0.6 : 0) + M.cond * 0.065 + M.evap * 0.065 + M.syrup * 0.04 + M.soda * 0.08 + M.lemon * 0.03 : 0;
    if (this.phase === 'cup') {
      this.cupTarget = Math.min(0.88, amount);
      this.levelTarget = 0;
      this.cubes.forEach((c) => (c.visible = false));
      this.setGarnish('none', true);
    } else {
      this.levelTarget = has ? Math.min(0.95, amount + ICE[s.ice].lv) : 0;
      this.cubes.forEach((c, i) => (c.visible = i < ICE[s.ice].k));
      this.setGarnish(s.garnish, instant);
    }
    if (instant) {
      this.level = this.levelTarget;
      if (this.levelTarget > 0) this.buildLiquid(this.level);
      this.liquid.visible = this.levelTarget > 0;
      this.cupLevel = this.cupTarget;
      if (this.cupTarget > 0) this.buildCupLiquid(this.cupLevel);
      this.cupLiquid.visible = this.cupTarget > 0;
      this.placeFloaters(0, 0);
    }
  }

  private placeFloaters(elapsed: number, dt: number): void {
    const y = this.levelY(this.level);
    const has = this.level > 0.01;
    const floor = this.vesselFloor;
    const motion = reduceMotion ? 0 : 1;
    this.cubes.forEach((c) => {
      const d = c.userData;
      const cy = Math.max(floor + 0.3, (has ? y : floor + 0.3) - d.dy + motion * Math.sin(elapsed * 0.9 + d.p) * 0.012);
      const r = Math.max(0, this.radiusAt(cy) * 0.68 - 0.2) * d.rf;
      c.position.set(Math.cos(d.a) * r, cy, Math.sin(d.a) * r);
    });
    if (this.garnishObj && this.garnishObj.userData.float !== undefined) {
      this.garnishObj.position.set(this.garnishObj.userData.float, (has ? y : floor + 0.3) + 0.06 + motion * Math.sin(elapsed * 0.8) * 0.012, 0.32);
    }
    this.bubbles.visible = has;
    if (has) {
      const top = y - 0.03;
      this.bubbleState.forEach((b, i) => {
        b.y += motion * b.v * dt * 0.84;
        if (b.y > 1) b.y = 0;
        const py = floor + 0.06 + b.y * (top - floor - 0.06);
        const r = this.radiusAt(py) * 0.9 * b.rf;
        this.bubblePos[i * 3] = Math.cos(b.a) * r;
        this.bubblePos[i * 3 + 1] = py;
        this.bubblePos[i * 3 + 2] = Math.sin(b.a) * r;
      });
      this.bubbleGeo.attributes.position.needsUpdate = true;
    }
  }

  /** Shows a stream falling into the measuring glass. */
  pour(col: string): void {
    this.streamT = 1;
    this.stream.material.color.set(col);
    this.stream.material.emissive.set(col);
  }

  private setStream(x: number, yTop: number, yBot: number): void {
    this.stream.visible = true;
    this.stream.scale.set(1, Math.max(0.05, yTop - yBot), 1);
    this.stream.position.set(x, (yTop + yBot) / 2, 0);
  }

  syncVessels(): void {
    this.servingG.visible = this.phase !== 'cup';
    this.cupG.visible = this.phase !== 'serving';
    if (this.phase === 'cup') {
      this.cupG.position.set(0, 0.07, 0);
      this.cupG.rotation.set(0, 0, 0);
      this.servingG.position.x = 0;
    }
    this.spoon.visible = this.phase === 'cup' && this.spoonOn;
  }

  setSpoon(on: boolean): void {
    this.spoonOn = on;
    this.syncVessels();
  }

  /** Spins the spoon and carries the liquid's swirl along with it. */
  setStirAngle(angle: number): void {
    this.spoon.rotation.y = -angle;
    this.cupLiquid.rotation.y = -angle * 0.7;
  }

  get hasCupLiquid(): boolean {
    return this.cupLevel > 0.01;
  }

  /** Where the measuring glass sits on screen, as fractions of the stage. */
  cupScreenPoint(): { x: number; y: number } {
    const p = new T.Vector3(0, 1, 0).project(this.camera);
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
  }

  startPour(s: Drink & { vessel: VesselId }): void {
    if (this.phase !== 'cup') return;
    this.phase = 'pouring';
    this.pourT = 0;
    this.pourFrom = this.cupLevel;
    this.level = 0;
    this.liquid.visible = false;
    this.setVessel(s.vessel, false);
    this.applyDrink(s, false);
    this.servingG.visible = true;
    this.servingG.position.x = 3.4;
    this.spoon.visible = false;
  }

  /** Returns true on the frame the pour finishes. */
  private pourFrame(dt: number): boolean {
    this.pourT = Math.min(1, this.pourT + dt / 2.3);
    const a = ease(Math.min(1, this.pourT / 0.3));
    const u = clamp((this.pourT - 0.3) / 0.55, 0, 1);
    const v = ease(clamp((this.pourT - 0.85) / 0.15, 0, 1));
    this.cupG.position.set(-1.82 * a - 4.5 * v, 0.07 + 3.78 * a, 0);
    this.cupG.rotation.z = -1.15 * a;
    this.servingG.position.x = 3.4 * (1 - a);
    this.cupLevel = this.pourFrom * (1 - u);
    if (this.cupLevel > 0.01) this.buildCupLiquid(this.cupLevel);
    this.cupLiquid.visible = this.cupLevel > 0.01;
    this.level = this.levelTarget * u;
    if (this.level > 0.01) this.buildLiquid(this.level);
    if (u > 0 && u < 1) this.setStream(0.05, 3.85, this.levelY(this.level) + 0.05);
    else this.stream.visible = false;
    if (this.pourT < 1) return false;
    this.phase = 'serving';
    this.level = this.levelTarget;
    this.buildLiquid(this.level);
    this.syncVessels();
    return true;
  }

  /** Advances the scene one frame. Returns true on the frame a pour finishes. */
  update(dt: number, elapsed: number, mouseX: number, mouseY: number): boolean {
    let poured = false;
    if (this.phase === 'pouring') {
      poured = this.pourFrame(dt);
    } else {
      if (Math.abs(this.levelTarget - this.level) > 0.0008) {
        this.level += (this.levelTarget - this.level) * Math.min(1, dt * 3.2);
        if (Math.abs(this.level - this.levelBuilt) > 0.0015) this.buildLiquid(this.level);
      }
      if (Math.abs(this.cupTarget - this.cupLevel) > 0.0008) {
        this.cupLevel += (this.cupTarget - this.cupLevel) * Math.min(1, dt * 3.2);
        if (Math.abs(this.cupLevel - this.cupBuilt) > 0.0015) this.buildCupLiquid(this.cupLevel);
      }
      if (this.streamT > 0 && this.phase === 'cup') {
        this.streamT -= dt / 0.9;
        this.setStream(0, 5, cupY(this.cupLevel) + 0.07);
      } else {
        this.stream.visible = false;
      }
      this.cupLiquid.visible = this.cupLevel > 0.01;
    }
    this.liquid.visible = this.level > 0.01;
    this.glow.material.opacity = Math.min(0.55, Math.max(this.level, this.cupLevel * 0.6) * 0.8);
    this.placeFloaters(elapsed, dt);

    if (this.garnishObj) {
      if (this.garnishPop < 1) {
        this.garnishPop = Math.min(1, this.garnishPop + dt * 4);
        const p = this.garnishPop;
        this.garnishObj.scale.setScalar(p * (1 + Math.sin(p * Math.PI) * 0.18));
      } else {
        this.garnishObj.scale.setScalar(1);
      }
    }

    const camTarget = this.phase === 'cup' ? 1 : 0;
    this.camCup = reduceMotion ? camTarget : this.camCup + (camTarget - this.camCup) * Math.min(1, dt * 2.4);
    if (!reduceMotion) {
      this.servingG.rotation.y += (mouseX * 0.5 + Math.sin(elapsed * 0.35) * 0.07 - this.servingG.rotation.y) * 0.05;
      this.parX += (mouseX * 0.45 - this.parX) * 0.04;
      this.parY += (-mouseY * 0.22 - this.parY) * 0.04;
    }
    this.placeCamera();
    this.renderer.render(this.scene, this.camera);
    return poured;
  }

  /** camCup 1 = closer and higher, looking down at the measuring glass; 0 = framed on the serving vessel. */
  private placeCamera(): void {
    const d = this.camDist;
    const m = this.camCup;
    this.camera.position.set(this.parX, lerp(2.35 + d * 0.012, 3.5, m) + this.parY, d * (1 - 0.26 * m));
    this.camera.lookAt(0, lerp(1.82, 0.82, m), 0);
  }

  /** Fits the camera to the free space between the ticket and the ingredient panel. */
  layout(): void {
    const { stage, ticket, panel } = this.els;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    this.renderer.setSize(w, h, false);
    this.renderer.setClearColor(0, 1);
    const sr = stage.getBoundingClientRect();
    const tk = ticket.getBoundingClientRect();
    const pn = panel.getBoundingClientRect();
    let cx = w / 2;
    let cy = h / 2;
    let freeW = w;
    let freeH = h;
    if (w >= 760) {
      const L = tk.right - sr.left;
      const R = pn.left - sr.left;
      cx = (L + R) / 2;
      freeW = Math.max(240, R - L);
    } else {
      const top = tk.bottom - sr.top;
      const bottom = pn.top - sr.top;
      cy = (top + bottom) / 2;
      freeH = Math.max(150, bottom - top);
    }
    const aspect = w / h;
    const viewH = Math.max((4.9 * h) / freeH, (3.1 * w) / freeW / aspect);
    this.camera.aspect = aspect;
    this.camDist = viewH / (2 * Math.tan((15 * Math.PI) / 180));
    this.placeCamera();
    this.camera.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h);
    this.camera.updateProjectionMatrix();
    // Cover-fit the background the way CSS background-size: cover would.
    const bgAspect = 2;
    if (aspect < bgAspect) {
      this.bgTex.repeat.set(aspect / bgAspect, 1);
      this.bgTex.offset.set((1 - aspect / bgAspect) / 2, 0);
    } else {
      this.bgTex.repeat.set(1, bgAspect / aspect);
      this.bgTex.offset.set(0, (1 - bgAspect / aspect) / 2);
    }
  }

  /** Renders the ordered drink to an image for the ticket photo, then restores the current drink. */
  snapOrder(o: Order, current: Drink): string {
    const keep = this.sceneryOnly.map((m) => m.visible);
    this.sceneryOnly.forEach((m) => (m.visible = false));
    const bg = this.scene.background;
    const turn = this.servingG.rotation.y;
    const phase = this.phase;
    this.scene.background = null;
    this.servingG.rotation.y = 0;
    this.setGarnish('none', true);
    this.phase = 'serving';
    this.syncVessels();
    this.setVessel(o.vessel, true);
    this.applyDrink({ base: o.base, milk: o.milk, ice: o.ice, garnish: o.garnish, mix: 1, vessel: o.vessel }, true);

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(420, 330, false);
    this.renderer.setClearColor(0, 0);
    const cam = new T.PerspectiveCamera(30, 420 / 330, 0.1, 50);
    cam.position.set(0, 2.2, 8.7);
    cam.lookAt(0, 2, 0);
    this.renderer.render(this.scene, cam);
    const url = this.els.canvas.toDataURL('image/png');

    this.scene.background = bg;
    this.servingG.rotation.y = turn;
    this.sceneryOnly.forEach((m, i) => (m.visible = keep[i]));
    this.setGarnish('none', true);
    this.phase = phase;
    this.level = 0;
    this.setVessel(current.vessel ?? 'cup', false);
    this.syncVessels();
    this.applyDrink(current, true);
    this.layout();
    return url;
  }

  /** Renders every ingredient, ice amount, garnish and vessel to an image for the panel cards. */
  buildIcons(): Record<string, string> {
    const scene = new T.Scene();
    scene.environment = this.env;
    const light = new T.DirectionalLight(0xffffff, 1.7);
    light.position.set(-2, 3, 4);
    scene.add(light, new T.AmbientLight(0xffffff, 0.4));
    const cam = new T.PerspectiveCamera(26, 1, 0.1, 50);
    const shoot = (o: T.Object3D, tilt: number) => {
      scene.add(o);
      o.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(o);
      const c = box.getCenter(new T.Vector3());
      const s = box.getSize(new T.Vector3());
      const d = (Math.max(s.x, s.y) * 1.2) / (2 * Math.tan((13 * Math.PI) / 180)) + s.z / 2;
      cam.position.set(c.x, c.y + d * tilt, c.z + d);
      cam.lookAt(c);
      this.renderer.render(scene, cam);
      const url = this.els.canvas.toDataURL('image/png');
      scene.remove(o);
      return url;
    };
    const vesselIcon = (k: VesselId) => {
      const g = new T.Group();
      const pts = vesselPts(k, true).filter((p) => p.y < 2.2).map((p) => vec2(p.x * 0.94, p.y));
      pts.push(vec2(0.001, 2.2));
      g.add(buildShell(k, true), new T.Mesh(new T.LatheGeometry(pts, 48), new T.MeshStandardMaterial({ color: 0xd8560c, roughness: 0.3 })));
      g.scale.z = k === 'bag' ? 0.82 : 1;
      return g;
    };
    const flatLime = () => {
      const m = makeLime();
      m.rotation.x = 1.25;
      return m;
    };
    const tiltedStraw = () => {
      const s = makeStraw('cup');
      s.rotation.z = -0.1;
      return s;
    };
    const models: Record<string, () => T.Object3D> = {
      v_cup: () => vesselIcon('cup'),
      v_bag: () => vesselIcon('bag'),
      tea: () => makeTin('ชาไทย', '#d9601a', '#fff3df'),
      black: () => makeTin('ชาดำ', '#5a2410', '#f6d9a8'),
      green: () => makeTin('ชาเขียว', '#5f9b2a', '#f4f7e0'),
      coffee: () => makeTin('กาแฟ', '#3a2013', '#f3d9a4'),
      pea: () => makeBottle('อัญชัน', '#2a3cc4'),
      red: () => makeBottle('น้ำแดง', '#d6243c'),
      cond: () => makeCan('นมข้น', '#f4ecd8', '#1d5aa8'),
      evap: () => makeCan('นมระเหย', '#c8342f', '#fff'),
      syrup: () => makeBottle('น้ำเชื่อม', '#e8c77a'),
      soda: () => makeBottle('โซดา', '#bfe4f2'),
      lemon: () => makeBottle('มะนาว', '#cfdc4a'),
      dump: makeRing,
      i_none: makeRing,
      i_little: () => makeIcePile(3),
      i_normal: () => makeIcePile(5),
      i_lots: () => makeIcePile(8),
      g_none: makeRing,
      g_straw: tiltedStraw,
      g_lime: flatLime,
      g_mint: makeMint,
      g_pea: makePeaFlower,
      g_marigold: makeMarigold,
    };
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(220, 220, false);
    this.renderer.setClearColor(0, 0);
    const icons: Record<string, string> = {};
    for (const k of Object.keys(models)) icons[k] = shoot(models[k](), k.startsWith('i_') ? 0.42 : 0.14);
    return icons;
  }
}
