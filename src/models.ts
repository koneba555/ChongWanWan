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
  const path = vessel === 'bag'
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

/** Crossed-out ring for "none" and "clear" cards. */
export function makeRing(): T.Group {
  const mat = new T.MeshStandardMaterial({ color: 0xd6c8ab, metalness: 0.7, roughness: 0.4 });
  const ring = new T.Mesh(new T.TorusGeometry(0.5, 0.03, 10, 64), mat);
  const bar = new T.Mesh(new T.BoxGeometry(1, 0.05, 0.03), mat);
  bar.rotation.z = -0.78;
  const g = new T.Group();
  g.add(ring, bar);
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
