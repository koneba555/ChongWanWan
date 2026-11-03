import * as T from 'three';
import { canvasOf, ctx2d, rng, texOf } from './art';
import type { GarnishId, VesselId } from './data';

const vec2 = (x: number, y: number) => new T.Vector2(x, y);

/** Smooth lathe profile through [radius, height] points. */
export function spline(pts: [number, number][], n: number): T.Vector2[] {
  return new T.SplineCurve(pts.map((p) => vec2(p[0], p[1])))
    .getPoints(n)
    .map((p) => vec2(Math.max(p.x, 0.001), p.y));
}

const iceMat = new T.MeshPhysicalMaterial({ color: 0xeef9ff, roughness: 0.07, transparent: true, opacity: 0.62, clearcoat: 1, envMapIntensity: 2.2, emissive: 0xbfe6ff, emissiveIntensity: 0.12 });
const edgeMat = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });

export function iceCube(size: number): T.Group {
  const g = new T.Group();
  const geo = new T.BoxGeometry(size, size, size);
  g.add(new T.Mesh(geo, iceMat), new T.LineSegments(new T.EdgesGeometry(geo), edgeMat));
  return g;
}

function leafGeo(w: number, l: number, curl: number, fat = 0.75): T.PlaneGeometry {
  const g = new T.PlaneGeometry(1, 1, 10, 14);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i);
    const v = p.getY(i) + 0.5;
    const prof = Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.98 + 0.02)), fat);
    p.setXYZ(i, u * w * prof, v * l, curl * (v * v - Math.abs(u) * 0.4 * prof) - 0.03 * Math.cos(u * 6) * prof);
  }
  g.computeVertexNormals();
  return g;
}

function petalMat(a: string, b: string, vein?: string): T.MeshStandardMaterial {
  const c = canvasOf(128, 256);
  const x = ctx2d(c);
  const g = x.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 256);
  if (vein) {
    x.strokeStyle = vein;
    x.lineWidth = 2.4;
    x.beginPath();
    x.moveTo(64, 256);
    x.lineTo(64, 0);
    for (let i = 0; i < 7; i++) {
      const y = 230 - i * 32;
      x.moveTo(64, y);
      x.quadraticCurveTo(30, y - 18, 6, y - 34);
      x.moveTo(64, y);
      x.quadraticCurveTo(98, y - 18, 122, y - 34);
    }
    x.stroke();
  }
  return new T.MeshStandardMaterial({ map: texOf(c), side: T.DoubleSide, roughness: 0.55 });
}

export function makeMint(): T.Group {
  const g = new T.Group();
  const m = petalMat('#2a7a2e', '#5cbe4b', '#b4e88a');
  const geo = leafGeo(0.62, 1, -0.2);
  ([[0, 0.2, 0], [1.25, 0, 0.04], [-1.25, 0, 0.04], [2.5, -0.1, 0.08], [-2.5, -0.1, 0.08]] as const).forEach(([r, dy, z]) => {
    const l = new T.Mesh(geo, m);
    l.rotation.z = r;
    l.position.set(0, dy, z);
    g.add(l);
  });
  return g;
}

export function makePeaFlower(): T.Group {
  const g = new T.Group();
  const m = petalMat('#f5f0d0', '#2c2fc2');
  const geo = leafGeo(0.95, 0.82, -0.14, 0.55);
  for (let i = 0; i < 5; i++) {
    const l = new T.Mesh(geo, m);
    l.rotation.z = (i * 2 * Math.PI) / 5;
    l.position.z = i * 0.01;
    g.add(l);
  }
  const c = new T.Mesh(new T.SphereGeometry(0.14, 16, 12), new T.MeshStandardMaterial({ color: 0xf4d23c, roughness: 0.5 }));
  c.scale.z = 0.6;
  c.position.z = 0.08;
  g.add(c);
  return g;
}

export function makeMarigold(): T.Group {
  const g = new T.Group();
  const m = petalMat('#d9570c', '#ffb114');
  const geo = leafGeo(0.34, 0.62, -0.14, 0.55);
  ([[14, 0.08, 0.9], [12, 0.2, 0.74], [10, 0.34, 0.52], [7, 0.46, 0.3]] as const).forEach(([n, z, sc], ring) => {
    for (let i = 0; i < n; i++) {
      const l = new T.Mesh(geo, m);
      const h = new T.Group();
      l.scale.setScalar(sc);
      l.rotation.x = 0.25 + ring * 0.3;
      h.rotation.z = ((i + ring * 0.5) * 2 * Math.PI) / n;
      h.position.z = z;
      h.add(l);
      g.add(h);
    }
  });
  return g;
}

export function makeLime(): T.Mesh {
  const c = canvasOf(512, 512);
  const x = ctx2d(c);
  x.fillStyle = '#5ba32a';
  x.beginPath();
  x.arc(256, 256, 254, 0, 7);
  x.fill();
  x.fillStyle = '#f4f6c9';
  x.beginPath();
  x.arc(256, 256, 232, 0, 7);
  x.fill();
  for (let i = 0; i < 10; i++) {
    x.save();
    x.translate(256, 256);
    x.rotate(i * 0.628);
    x.fillStyle = '#d2e14f';
    x.beginPath();
    x.moveTo(12, 0);
    x.lineTo(216 * Math.cos(0.27), 216 * Math.sin(0.27));
    x.quadraticCurveTo(226, 0, 216 * Math.cos(0.27), -216 * Math.sin(0.27));
    x.closePath();
    x.fill();
    x.strokeStyle = '#ecf48c';
    x.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      x.beginPath();
      x.moveTo(40 + k * 26, -6 + k);
      x.lineTo(70 + k * 26, 6 - k);
      x.stroke();
    }
    x.restore();
  }
  x.fillStyle = '#f4f6c9';
  x.beginPath();
  x.arc(256, 256, 14, 0, 7);
  x.fill();
  const face = new T.MeshPhysicalMaterial({ map: texOf(c), roughness: 0.3, clearcoat: 0.6 });
  return new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.07, 48), [new T.MeshStandardMaterial({ color: 0x5a9f2a, roughness: 0.5 }), face, face]);
}

/** Bags take the straw straight through the knot; cups bend it over the rim. */
export function makeStraw(vessel: VesselId): T.Mesh {
  const c = canvasOf(128, 64);
  const x = ctx2d(c);
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 128, 64);
  x.fillStyle = '#d92c2c';
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(44, 0);
  x.lineTo(104, 64);
  x.lineTo(60, 64);
  x.fill();
  const path = vessel !== 'cup'
    ? [[-0.3, 0.25, 0], [-0.1, 1.6, 0], [0.05, 3.05, 0], [0.18, 4, 0], [0.21, 4.3, 0]]
    : [[-0.22, 0.2, 0.04], [0.05, 1.7, 0.05], [0.3, 3.2, 0.06], [0.42, 3.85, 0.08], [0.72, 4.1, 0.08]];
  const curve = new T.CatmullRomCurve3(path.map((a) => new T.Vector3(a[0], a[1], a[2])));
  return new T.Mesh(new T.TubeGeometry(curve, 70, 0.05, 14), new T.MeshStandardMaterial({ map: texOf(c, [20, 1]), roughness: 0.35 }));
}

function labelTex(text: string, bg: string, fg: string, size = 74): T.CanvasTexture {
  const c = canvasOf(1024, 256);
  const x = ctx2d(c);
  x.fillStyle = bg;
  x.fillRect(0, 0, 1024, 256);
  x.fillStyle = fg;
  x.font = `500 ${size}px Mitr,Tahoma,sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 512, 128);
  x.fillRect(250, 206, 524, 8);
  x.fillRect(250, 42, 524, 8);
  return texOf(c);
}

const metal = new T.MeshStandardMaterial({ color: 0xcfcac0, metalness: 1, roughness: 0.3 });

export function makeCan(label: string, col: string, fg: string): T.Group {
  const g = new T.Group();
  g.add(new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.74, 48, 1, false, Math.PI), [
    new T.MeshStandardMaterial({ map: labelTex(label, col, fg), roughness: 0.38, metalness: 0.05 }),
    metal,
    metal,
  ]));
  [0.37, -0.37].forEach((y) => {
    const r = new T.Mesh(new T.TorusGeometry(0.5, 0.025, 10, 48), metal);
    r.rotation.x = Math.PI / 2;
    r.position.y = y;
    g.add(r);
  });
  return g;
}

export function makeTin(label: string, col: string, fg: string): T.Group {
  const g = makeCan(label, col, fg);
  g.children[0].scale.y = 1.45;
  g.children[1].position.y = 0.54;
  g.children[2].position.y = -0.54;
  const lid = new T.Mesh(new T.CylinderGeometry(0.53, 0.53, 0.16, 48), new T.MeshStandardMaterial({ color: new T.Color(col).multiplyScalar(0.6), roughness: 0.3, metalness: 0.6 }));
  lid.position.y = 0.62;
  g.add(lid);
  return g;
}

export function makeBottle(label: string, col: string): T.Group {
  const pts = spline([[0.001, 0], [0.42, 0.01], [0.46, 0.08], [0.46, 0.9], [0.4, 1.08], [0.16, 1.3], [0.14, 1.62]], 40);
  const body = new T.Mesh(new T.LatheGeometry(pts, 48), new T.MeshPhysicalMaterial({ color: col, roughness: 0.1, clearcoat: 1, envMapIntensity: 1.4, emissive: col, emissiveIntensity: 0.18 }));
  const cork = new T.Mesh(new T.CylinderGeometry(0.13, 0.12, 0.18, 20), new T.MeshStandardMaterial({ color: 0xa97c4c, roughness: 0.8 }));
  cork.position.y = 1.68;
  const tag = new T.Mesh(new T.CylinderGeometry(0.47, 0.47, 0.46, 48, 1, true, Math.PI), new T.MeshStandardMaterial({ map: labelTex(label, '#fbf0d4', '#3a2010', 84), roughness: 0.6 }));
  tag.position.y = 0.5;
  const g = new T.Group();
  g.add(body, cork, tag);
  return g;
}

export function makeIcePile(count: number): T.Group {
  const g = new T.Group();
  const r = rng(count * 13 + 3);
  for (let i = 0; i < count; i++) {
    const c = iceCube(0.5);
    c.position.set(((i % 3) - 1) * 0.56 + (r() - 0.5) * 0.1, Math.floor(i / 3) * 0.46, (r() - 0.5) * 0.25);
    c.rotation.set(r() * 0.7, r() * 0.7, r() * 0.7);
    g.add(c);
  }
  return g;
}

/** Steel bucket heaped with ice. */
export function makeIceBucket(): T.Group {
  const steel = new T.MeshStandardMaterial({ color: 0xdcd8d0, metalness: 1, roughness: 0.28, side: T.DoubleSide });
  const g = new T.Group();
  const wall = new T.Mesh(new T.CylinderGeometry(0.62, 0.5, 0.72, 40, 1, true), steel);
  wall.position.y = 0.36;
  const floor = new T.Mesh(new T.CircleGeometry(0.5, 40), steel);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  const pile = makeIcePile(8);
  pile.scale.setScalar(0.62);
  pile.position.y = 0.58;
  g.add(wall, floor, pile);
  return g;
}

/** The long bar spoon, lying on the table. */
export function makeTableSpoon(): T.Group {
  const steel = new T.MeshStandardMaterial({ color: 0xe8e6e0, metalness: 1, roughness: 0.18, envMapIntensity: 1.5 });
  const shaft = new T.Mesh(new T.CylinderGeometry(0.05, 0.04, 2.6, 12), steel);
  shaft.rotation.z = Math.PI / 2;
  const bowl = new T.Mesh(new T.SphereGeometry(0.17, 20, 14), steel);
  bowl.scale.set(1.3, 0.4, 1);
  bowl.position.x = 1.4;
  const g = new T.Group();
  g.add(shaft, bowl);
  return g;
}

/** Several copies of a vessel stacked with a small rise between them. */
export function makeVesselStack(shell: () => T.Object3D, count: number, step: number): T.Group {
  const g = new T.Group();
  for (let i = 0; i < count; i++) {
    const s = shell();
    s.position.y = i * step;
    g.add(s);
  }
  return g;
}

export function makeGarnish(k: Exclude<GarnishId, 'none'>, vessel: VesselId): T.Object3D {
  switch (k) {
    case 'lime': return makeLime();
    case 'mint': return makeMint();
    case 'pea': return makePeaFlower();
    case 'marigold': return makeMarigold();
    case 'straw': return makeStraw(vessel);
  }
}

/** The red ice cooler from the cart. Its lid is returned so it can swing open. */
export function makeCooler(): { model: T.Group; lid: T.Group } {
  const red = new T.MeshStandardMaterial({ color: 0xd6231e, roughness: 0.42, envMapIntensity: 0.9 });
  const white = new T.MeshStandardMaterial({ color: 0xf2f4f2, roughness: 0.6 });
  const W = 1.7;
  const H = 1.2;
  const D = 1.2;
  const model = new T.Group();
  const body = new T.Mesh(new T.BoxGeometry(W, H, D), red);
  body.position.y = H / 2 + 0.06;
  const rim = new T.Mesh(new T.BoxGeometry(W + 0.08, 0.08, D + 0.08), red);
  rim.position.y = H + 0.06;
  const liner = new T.Mesh(new T.PlaneGeometry(W - 0.2, D - 0.2), white);
  liner.rotation.x = -Math.PI / 2;
  liner.position.y = H + 0.105;
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => {
    const foot = new T.Mesh(new T.BoxGeometry(0.22, 0.06, 0.22), red);
    foot.position.set(sx * (W / 2 - 0.2), 0.03, sz * (D / 2 - 0.2));
    model.add(foot);
  }));
  const ice = makeIcePile(8);
  ice.scale.setScalar(0.62);
  ice.position.set(0, H - 0.95, 0);
  const sticker = new T.Mesh(new T.PlaneGeometry(0.3, 0.38), white);
  sticker.position.set(0.35, H * 0.42, D / 2 + 0.002);
  // The lid hinges along the back edge; rotating the pivot about x swings it up.
  const lid = new T.Group();
  lid.position.set(0, H + 0.1, -D / 2);
  const lidSlab = new T.Mesh(new T.BoxGeometry(W + 0.1, 0.16, D + 0.1), red);
  lidSlab.position.set(0, 0.08, D / 2);
  const lidInner = new T.Mesh(new T.BoxGeometry(W - 0.4, 0.04, D - 0.4), red);
  lidInner.position.set(0, -0.01, D / 2);
  lid.add(lidSlab, lidInner);
  model.add(body, rim, liner, ice, sticker, lid);
  return { model, lid };
}

/** Paper carrier bag with a printed band, open at the top, that a tied drink bag stands in. */
export function makePaperCarrier(): T.Group {
  const c = canvasOf(256, 256);
  const x = ctx2d(c);
  x.fillStyle = '#d6ad7c';
  x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#fbf3e4';
  x.fillRect(22, 60, 212, 170);
  x.fillStyle = '#c4382c';
  for (let i = 0; i < 9; i++) {
    x.beginPath();
    x.arc(30 + i * 25, 60, 12, 0, Math.PI);
    x.fill();
  }
  x.fillStyle = '#7a3b22';
  x.font = '700 34px Charm,Mitr,serif';
  x.textAlign = 'center';
  x.fillText('ชงหวานหวาน', 128, 150);
  x.font = '400 18px Mitr,Tahoma,sans-serif';
  x.fillText('ชา · กาแฟ · นม', 128, 185);
  const front = new T.MeshStandardMaterial({ map: texOf(c), roughness: 0.85, side: T.DoubleSide });
  const kraft = new T.MeshStandardMaterial({ color: 0xc89d6b, roughness: 0.9, side: T.DoubleSide });
  const open = new T.MeshBasicMaterial({ visible: false });
  const bag = new T.Mesh(new T.BoxGeometry(2.3, 2.1, 2.25), [kraft, kraft, open, kraft, front, front]);
  bag.position.y = 1.07;
  const g = new T.Group();
  g.add(bag);
  return g;
}

/** Wooden tray, long side front to back, where finished drinks wait to be handed over. */
export function makeTray(width: number, depth: number): T.Group {
  const h = Math.round((256 * depth) / width);
  const c = canvasOf(256, h);
  const x = ctx2d(c);
  x.fillStyle = '#8e5a30';
  x.fillRect(0, 0, 256, h);
  x.strokeStyle = '#7a4a26';
  x.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    x.beginPath();
    x.moveTo(18 + i * 31, 0);
    x.bezierCurveTo(8 + i * 31, h * 0.3, 30 + i * 31, h * 0.7, 16 + i * 31, h);
    x.stroke();
  }
  x.fillStyle = '#f2d9a6';
  x.font = '500 52px Mitr,Tahoma,sans-serif';
  x.textAlign = 'center';
  x.fillText('รอส่ง', 128, h - 34);
  const top = new T.MeshStandardMaterial({ map: texOf(c), roughness: 0.7 });
  const side = new T.MeshStandardMaterial({ color: 0x6f4320, roughness: 0.75 });
  const board = new T.Mesh(new T.BoxGeometry(width, 0.1, depth), [side, side, top, side, side, side]);
  board.position.y = 0.05;
  const g = new T.Group();
  g.add(board);
  return g;
}

/** Clear cup the spoon and straw stand in. */
export function makeUtensilCup(): T.Group {
  const glass = new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false, clearcoat: 1, envMapIntensity: 1.6 });
  const wall = new T.Mesh(new T.CylinderGeometry(0.4, 0.33, 0.95, 32, 1, true), glass);
  wall.position.y = 0.48;
  const floor = new T.Mesh(new T.CircleGeometry(0.33, 32), glass);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  const g = new T.Group();
  g.add(wall, floor);
  return g;
}

/** Stainless brewing pot of hot water, with the cloth filter sock sitting in its mouth. */
export function makeHotPot(): T.Group {
  const steel = new T.MeshStandardMaterial({ color: 0xeef0f2, metalness: 0.9, roughness: 0.22, envMapIntensity: 1.1, side: T.DoubleSide });
  const cloth = new T.MeshStandardMaterial({ color: 0xd9c19c, roughness: 0.95 });
  const brew = new T.MeshStandardMaterial({ color: 0x3b1e0e, roughness: 0.4 });
  const g = new T.Group();
  const body = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 1, 40, 1, true), steel);
  body.position.y = 0.5;
  const floor = new T.Mesh(new T.CircleGeometry(0.42, 40), steel);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  const spout = new T.Mesh(new T.CylinderGeometry(0.02, 0.16, 0.4, 16, 1, true), steel);
  spout.position.set(0.46, 0.86, 0);
  spout.rotation.z = -0.9;
  const handle = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.42, 12), steel);
  handle.position.set(-0.6, 0.62, 0);
  handle.rotation.z = Math.PI / 2;
  const rim = new T.Mesh(new T.TorusGeometry(0.42, 0.045, 10, 40), cloth);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.0;
  const coffee = new T.Mesh(new T.CircleGeometry(0.37, 32), brew);
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.93;
  const wire = new T.Mesh(new T.TorusGeometry(0.12, 0.012, 6, 24), steel);
  wire.position.set(-0.28, 1.32, 0);
  const stem = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.42, 6), steel);
  stem.position.set(-0.32, 1.06, 0);
  stem.rotation.z = 0.25;
  g.add(body, floor, spout, handle, rim, coffee, wire, stem);
  return g;
}

/** Round steel plate the hot water pot stands on. */
export function makePlate(radius: number): T.Mesh {
  const plate = new T.Mesh(new T.CylinderGeometry(radius, radius * 0.94, 0.05, 48), new T.MeshStandardMaterial({ color: 0xcfcbc2, metalness: 1, roughness: 0.35 }));
  plate.position.y = 0.025;
  return plate;
}

/** A small cat sitting, drawn in white, for the soda label. */
function drawCat(x: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.ellipse(cx, cy + 22 * s, 30 * s, 36 * s, 0, 0, Math.PI * 2);
  x.fill();
  x.beginPath();
  x.arc(cx, cy - 22 * s, 24 * s, 0, Math.PI * 2);
  x.fill();
  [-1, 1].forEach((d) => {
    x.beginPath();
    x.moveTo(cx + d * 8 * s, cy - 40 * s);
    x.lineTo(cx + d * 22 * s, cy - 60 * s);
    x.lineTo(cx + d * 24 * s, cy - 32 * s);
    x.fill();
  });
  x.strokeStyle = '#ffffff';
  x.lineWidth = 9 * s;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(cx + 26 * s, cy + 46 * s);
  x.quadraticCurveTo(cx + 66 * s, cy + 40 * s, cx + 52 * s, cy + 2 * s);
  x.stroke();
  x.fillStyle = '#c8211b';
  [-1, 1].forEach((d) => {
    x.beginPath();
    x.arc(cx + d * 9 * s, cy - 24 * s, 3.2 * s, 0, Math.PI * 2);
    x.fill();
  });
  x.beginPath();
  x.moveTo(cx - 4 * s, cy - 14 * s);
  x.lineTo(cx + 4 * s, cy - 14 * s);
  x.lineTo(cx, cy - 9 * s);
  x.fill();
}

/** Clear glass soda bottle with a red oval label and a little cat. */
export function makeSodaBottle(): T.Group {
  const c = canvasOf(1024, 320);
  const x = ctx2d(c);
  x.fillStyle = '#eef0ef';
  x.fillRect(0, 0, 1024, 320);
  x.fillStyle = '#d9dcdb';
  for (let i = 0; i < 520; i++) {
    x.beginPath();
    x.arc((i * 37) % 1024, ((i * 53) % 300) + 10, 3, 0, Math.PI * 2);
    x.fill();
  }
  x.fillStyle = '#c8211b';
  x.font = '500 46px Mitr,Tahoma,sans-serif';
  x.textAlign = 'center';
  x.fillText('โซดาตราแมวน้อย', 512, 58);
  x.beginPath();
  x.ellipse(512, 178, 170, 92, 0, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#ffffff';
  x.font = '600 26px Mitr,Tahoma,sans-serif';
  x.fillText('SODA', 412, 150);
  x.fillText('WATER', 612, 150);
  drawCat(x, 512, 182, 1.1);
  x.fillStyle = '#c8211b';
  x.font = '400 24px Mitr,Tahoma,sans-serif';
  x.fillText('ปริมาตรสุทธิ 325 มล.', 512, 300);

  const glass = new T.MeshPhysicalMaterial({ color: 0xe9f5f1, roughness: 0.05, transparent: true, opacity: 0.38, clearcoat: 1, envMapIntensity: 1.8, side: T.DoubleSide, depthWrite: false });
  const pts = spline([[0.001, 0], [0.4, 0.01], [0.44, 0.08], [0.44, 1.02], [0.36, 1.28], [0.16, 1.5], [0.15, 1.66], [0.17, 1.7]], 40);
  const body = new T.Mesh(new T.LatheGeometry(pts, 48), glass);
  body.renderOrder = 3;
  const label = new T.Mesh(new T.CylinderGeometry(0.445, 0.445, 0.62, 48, 1, true, Math.PI), new T.MeshStandardMaterial({ map: texOf(c), roughness: 0.55 }));
  label.position.y = 0.52;
  const cap = new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 0.08, 20), new T.MeshStandardMaterial({ color: 0xf3f3f1, metalness: 0.6, roughness: 0.3 }));
  cap.position.y = 1.74;
  const g = new T.Group();
  g.add(body, label, cap);
  return g;
}

/** Steel rail with S hooks, the finished bags hang from these. */
export function makeHookRail(xs: number[], length: number, hookDrop: number, height: number): T.Group {
  const steel = new T.MeshStandardMaterial({ color: 0xe2dfd8, metalness: 1, roughness: 0.2, envMapIntensity: 1.5 });
  const g = new T.Group();
  const rail = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, length, 16), steel);
  rail.rotation.z = Math.PI / 2;
  g.add(rail);
  // A slim rod at each end hangs the rail from the awning frame above.
  [-1, 1].forEach((end) => {
    const x = (end * length) / 2;
    const rod = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, height, 10), steel);
    rod.position.set(x, height / 2, 0);
    const joint = new T.Mesh(new T.SphereGeometry(0.075, 14, 10), steel);
    joint.position.set(x, 0, 0);
    g.add(rod, joint);
  });
  for (const hx of xs) {
    // An S: over the rail at the top, open curl at the bottom.
    const path = new T.CatmullRomCurve3([
      new T.Vector3(hx - 0.06, -0.05, 0.1),
      new T.Vector3(hx - 0.02, 0.11, 0),
      new T.Vector3(hx + 0.08, 0.02, -0.06),
      new T.Vector3(hx + 0.06, -hookDrop * 0.45, -0.02),
      new T.Vector3(hx - 0.04, -hookDrop * 0.85, 0.04),
      new T.Vector3(hx + 0.05, -hookDrop, 0.06),
      new T.Vector3(hx + 0.1, -hookDrop * 0.86, 0.04),
    ]);
    g.add(new T.Mesh(new T.TubeGeometry(path, 40, 0.022, 8), steel));
  }
  return g;
}

/** Clear handled carry bag around a finished drink, ready to hang on a hook. */
export function makeCarryBag(contents: T.Object3D): T.Group {
  const box = new T.Box3().setFromObject(contents);
  const size = box.getSize(new T.Vector3());
  const center = box.getCenter(new T.Vector3());
  contents.position.x -= center.x;
  contents.position.z -= center.z;
  contents.position.y -= box.min.y;
  const r = Math.max(size.x, size.z) * 0.56;
  const plastic = new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, transparent: true, opacity: 0.16, side: T.DoubleSide, depthWrite: false, clearcoat: 1, envMapIntensity: 1.6 });
  const sleeve = new T.Mesh(new T.CylinderGeometry(r, r * 0.96, size.y * 1.04, 32, 6, true), plastic);
  const p = sleeve.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getX(i), p.getZ(i));
    const f = 1 + 0.04 * Math.sin(a * 7 + p.getY(i) * 5);
    p.setX(i, p.getX(i) * f);
    p.setZ(i, p.getZ(i) * f);
  }
  sleeve.geometry.computeVertexNormals();
  sleeve.position.y = size.y * 0.52;
  sleeve.renderOrder = 6;
  const handleMat = new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false });
  const g = new T.Group();
  g.add(contents, sleeve);
  // Two handles rise from the rim and meet at the top, where the hook catches them.
  [-1, 1].forEach((side) => {
    const handle = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
      new T.Vector3(-r * 0.8, size.y * 1.04, side * r * 0.3),
      new T.Vector3(-r * 0.3, size.y * 1.04 + r * 0.9, side * r * 0.1),
      new T.Vector3(0, size.y * 1.04 + r * 1.05, 0),
      new T.Vector3(r * 0.3, size.y * 1.04 + r * 0.9, side * r * 0.1),
      new T.Vector3(r * 0.8, size.y * 1.04, side * r * 0.3),
    ]), 24, 0.03, 6), handleMat);
    handle.renderOrder = 6;
    g.add(handle);
  });
  return g;
}
