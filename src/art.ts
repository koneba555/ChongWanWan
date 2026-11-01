import * as T from 'three';

export function canvasOf(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d') as CanvasRenderingContext2D;

export function texOf(c: HTMLCanvasElement, repeat?: [number, number]): T.CanvasTexture {
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** Seeded so the painted textures look the same on every load. */
export function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const mixHex = (a: string, b: string, u: number) => '#' + new T.Color(a).lerp(new T.Color(b), u).getHexString();

export function radial(col: string, midAlpha: string): T.CanvasTexture {
  const c = canvasOf(256, 256);
  const x = ctx2d(c);
  const g = x.createRadialGradient(128, 128, 4, 128, 128, 128);
  g.addColorStop(0, col);
  g.addColorStop(0.55, col + midAlpha);
  g.addColorStop(1, col + '00');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return texOf(c);
}

/** Night-market street: blurred shophouses, awning stripes and string lights. */
export function paintBackground(): T.CanvasTexture {
  const c = canvasOf(2048, 1024);
  const x = ctx2d(c);
  const r = rng(77);
  const g = x.createLinearGradient(0, 0, 0, 1024);
  g.addColorStop(0, '#0e1838');
  g.addColorStop(0.5, '#1a2f5c');
  g.addColorStop(0.8, '#7c4a3a');
  g.addColorStop(1, '#d48a48');
  x.fillStyle = g;
  x.fillRect(0, 0, 2048, 1024);

  x.filter = 'blur(16px)';
  [[80, 380, 330], [430, 300, 280], [1260, 340, 300], [1600, 270, 360]].forEach(([l, t, w], i) => {
    x.fillStyle = ['#101a38', '#1b2748', '#131d3e', '#19223f'][i];
    x.fillRect(l, t, w, 1024 - t);
    x.fillStyle = '#ffc97a';
    for (let a = 0; a < 6; a++) {
      for (let b = 0; b < 3; b++) {
        if (r() > 0.45) {
          x.globalAlpha = 0.25 + r() * 0.5;
          x.fillRect(l + 24 + b * (w / 3.1), t + 30 + a * 72, w / 5, 44);
        }
      }
    }
    x.globalAlpha = 1;
  });

  x.filter = 'blur(11px)';
  for (let i = 0; i < 14; i++) {
    x.fillStyle = i % 2 ? '#c92f2c' : '#f6ead0';
    x.fillRect(i * 160 - 20, 0, 160, 130);
    x.beginPath();
    x.ellipse(i * 160 + 60, 130, 80, 30, 0, 0, Math.PI);
    x.fill();
  }

  x.filter = 'blur(5px)';
  for (const [y0, sag] of [[210, 70], [300, 110]]) {
    for (let i = 0; i < 26; i++) {
      const u = i / 25;
      x.fillStyle = ['#ffd166', '#ffb347', '#fff0b3', '#ff8f5a'][i % 4];
      x.globalAlpha = 0.85;
      x.beginPath();
      x.arc(u * 2048, y0 + Math.sin(u * Math.PI * 3) * sag * 0.5 + sag * 0.4, 8 + r() * 10, 0, 7);
      x.fill();
    }
  }

  x.filter = 'blur(22px)';
  for (let i = 0; i < 26; i++) {
    x.globalAlpha = 0.16 + r() * 0.42;
    x.fillStyle = ['#ffcf70', '#ff9a55', '#ff6d6d', '#7fd4ff', '#ffe9a8'][i % 5];
    x.beginPath();
    x.arc(r() * 2048, 440 + r() * 420, 26 + r() * 62, 0, 7);
    x.fill();
  }
  x.globalAlpha = 1;
  x.filter = 'none';
  return texOf(c);
}

/** Soft light panels the glass and metal reflect. */
export function paintEnv(): T.CanvasTexture {
  const c = canvasOf(1024, 512);
  const x = ctx2d(c);
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#26304f');
  g.addColorStop(0.5, '#6e5a52');
  g.addColorStop(1, '#caa070');
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 512);
  x.fillStyle = '#fff6e0';
  x.fillRect(120, 70, 190, 190);
  x.fillStyle = '#ffd58a';
  x.fillRect(640, 110, 120, 240);
  x.fillStyle = '#ffffff';
  x.fillRect(430, 20, 190, 48);
  x.fillStyle = '#9fc6ff';
  x.fillRect(880, 120, 70, 200);
  const t = new T.CanvasTexture(c);
  t.mapping = T.EquirectangularReflectionMapping;
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

/** Terrazzo (หินขัด), the classic Thai shophouse surface. */
export function paintTerrazzo(): HTMLCanvasElement {
  const c = canvasOf(1024, 1024);
  const x = ctx2d(c);
  const r = rng(19);
  x.fillStyle = '#e7dcc8';
  x.fillRect(0, 0, 1024, 1024);
  const chips = ['#b9ab94', '#8f8778', '#f5efe2', '#c6946a', '#7c8a84', '#d8c3a4', '#5f5a50'];
  for (let i = 0; i < 2300; i++) {
    x.fillStyle = chips[i % 7];
    x.globalAlpha = 0.55 + r() * 0.45;
    const a = 2 + r() * 12;
    const p = r() * 1024;
    const q = r() * 1024;
    x.beginPath();
    x.moveTo(p, q);
    for (let k = 0; k < 4; k++) x.lineTo(p + (r() - 0.5) * a * 2, q + (r() - 0.5) * a * 2);
    x.closePath();
    x.fill();
  }
  x.globalAlpha = 1;
  return c;
}

/** พวงมาลัยดาวเรือง strung under the awning. */
export function drawGarland(el: HTMLCanvasElement): void {
  const box = el.getBoundingClientRect();
  if (!box.width) return;
  const d = Math.min(2, devicePixelRatio || 1);
  el.width = box.width * d;
  el.height = box.height * d;
  const x = ctx2d(el);
  x.scale(d, d);
  const rn = rng(23);
  const n = Math.floor(box.width / 11);
  const R = 8.4;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const px = u * box.width;
    const py = 4 + Math.sin(u * Math.PI) * (box.height - 30);
    const accent = i % 9 === 0 ? '#fff7e6' : i % 9 === 4 ? '#e0436a' : null;
    x.fillStyle = accent || '#c9560c';
    x.beginPath();
    x.arc(px, py, R, 0, 7);
    x.fill();
    if (!accent) {
      for (let k = 0; k < 11; k++) {
        x.fillStyle = ['#ffb01f', '#f58a10', '#ffc94a'][k % 3];
        const a = rn() * 6.28;
        const b = rn() * R * 0.82;
        x.beginPath();
        x.ellipse(px + Math.cos(a) * b, py + Math.sin(a) * b, 2.3, 1.5, a, 0, 7);
        x.fill();
      }
    } else {
      x.fillStyle = accent === '#fff7e6' ? '#e9d8b8' : '#b82a50';
      for (let k = 0; k < 6; k++) {
        const a = k * 1.05;
        x.beginPath();
        x.arc(px + Math.cos(a) * 4, py + Math.sin(a) * 4, 1.5, 0, 7);
        x.fill();
      }
    }
  }
}
