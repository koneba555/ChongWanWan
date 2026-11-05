export type UpgradeId = 'frother' | 'kettle' | 'lime' | 'cocoa' | 'matcha' | 'pearl' | 'hook' | 'whip' | 'sealer' | 'qr' | 'espresso' | 'soundbox' | 'call';

export type Category = 'machine' | 'fresh' | 'topping' | 'tools' | 'pack';

export const CATEGORIES: { id: Category; name: string }[] = [
  { id: 'machine', name: 'เครื่องใช้ไฟฟ้า' },
  { id: 'fresh', name: 'วัตถุดิบ' },
  { id: 'topping', name: 'ท็อปปิ้ง' },
  { id: 'tools', name: 'อุปกรณ์ร้าน' },
  { id: 'pack', name: 'แพ็กเกจจิ้ง' },
];

export interface Upgrade {
  id: UpgradeId;
  name: string;
  price: number;
  effect: string;
  category: Category;
  /** Shop-app dressing: crossed-out price, units sold, star rating and seller. */
  was: number;
  sold: number;
  stars: number;
  seller: string;
  /** The day it goes on sale; before that the shop lists it as coming soon. */
  from?: number;
}

/** Listed in the phone shop but not on sale yet; later phases fill these in. */
export interface ComingSoon {
  key: string;
  name: string;
  category: Category;
  price: number;
}

export const COMING_SOON: ComingSoon[] = [
  { key: 'blender', name: 'เครื่องปั่นน้ำผลไม้', category: 'machine', price: 1200 },
];

export const UPGRADES: Upgrade[] = [
  { id: 'frother', name: 'เครื่องตีฟองนมไฟฟ้า', price: 300, effect: 'ลากลงแก้วตวงแล้วคนให้เองใน 3 วินาที ไม่ต้องหมุนเมาส์', category: 'machine', was: 459, sold: 12400, stars: 4.8, seller: 'บ้านกาแฟแมวส้ม' },
  { id: 'kettle', name: 'กระติกน้ำร้อนไฟฟ้าแบบกด', price: 400, effect: 'กดทีเดียวได้น้ำร้อน 100 ml ลงแก้วตวง ไม่ต้องยกกา', category: 'machine', was: 690, sold: 8300, stars: 4.9, seller: 'เครื่องครัวเหมียวมาร์ท' },
  { id: 'lime', name: 'มะนาวแป้นสด 1 กก.', price: 200, effect: 'ใช้มะนาวคั้นสดแทนน้ำมะนาวขวด ลูกค้าให้ทิปเพิ่ม 5 บาทเมื่อสูตรมีมะนาว', category: 'fresh', was: 260, sold: 31200, stars: 4.7, seller: 'สวนป้าแมว ราชบุรี' },
  { id: 'cocoa', name: 'ผงโกโก้เข้มข้น', price: 350, effect: 'วางกระป๋องโกโก้บนชั้น ปลดล็อกเมนูโกโก้ ขายแก้วละ 55 บาท', category: 'fresh', was: 420, sold: 9800, stars: 4.8, seller: 'โรงคั่วโกโก้ชุมพรเหมียว' },
  { id: 'matcha', name: 'ผงมัทฉะแท้', price: 450, effect: 'วางกระป๋องมัทฉะบนชั้น ปลดล็อกเมนูมัทฉะ ขายแก้วละ 55 บาท', category: 'fresh', was: 590, sold: 6100, stars: 4.9, seller: 'ไร่ชาดอยเหมียว' },
  { id: 'pearl', name: 'ไข่มุกบุก พร้อมชามและกระบวย', price: 500, effect: 'ลากชามไข่มุกไปตักใส่ภาชนะก่อนเท ปลดล็อกเมนูไข่มุก ได้เพิ่มแก้วละ 10 บาท', category: 'topping', was: 650, sold: 22000, stars: 4.7, seller: 'ท็อปปิ้งแมวอ้วน' },
  { id: 'hook', name: 'ตะขอตัว S เพิ่ม 1 ช่อง', price: 250, effect: 'แขวนน้ำรอส่งได้ 4 ถุง ชงล่วงหน้าได้มากขึ้นตอนลูกค้ามาพร้อมกัน', category: 'tools', was: 320, sold: 4500, stars: 4.6, seller: 'เหล็กดัดเหมียวการช่าง' },
  { id: 'whip', name: 'วิปครีมกระป๋อง', price: 300, effect: 'กดวิปครีมโปะหน้าแก้วหลังเทน้ำ ปลดล็อกเมนูวิปครีม ได้เพิ่มแก้วละ 10 บาท', category: 'topping', was: 390, sold: 15300, stars: 4.8, seller: 'ท็อปปิ้งแมวอ้วน' },
  { id: 'sealer', name: 'เครื่องซีลฝาแก้ว', price: 650, effect: 'กดที่เครื่องเพื่อซีลฝาแก้วที่เทแล้ว ไรเดอร์จะเริ่มมารับออเดอร์ที่ต้องซีลฝา ได้เพิ่มแก้วละ 5 บาท', category: 'pack', was: 1290, sold: 3700, stars: 4.7, seller: 'แพ็กเกจจิ้งเหมียวโปร' },
  { id: 'qr', name: 'ป้าย QR รับโอน', price: 400, effect: 'ลูกค้าสแกนจ่ายได้ ไม่ต้องรอทอน ลูกค้ายอมรอนานขึ้น 20%', category: 'tools', was: 590, sold: 41000, stars: 4.9, seller: 'เหมียวเพย์ ช็อป' },
  { id: 'espresso', name: 'เครื่องชงเอสเพรสโซ่', price: 1500, effect: 'กดที่เครื่องเพื่อชงช็อตเอสเพรสโซ่ลงแก้วตวง ปลดล็อกเมนูกาแฟสด ลาเต้ อเมริกาโน่ ขายแพงขึ้นแก้วละ 20 บาท', category: 'machine', was: 3290, sold: 2100, stars: 4.9, seller: 'บ้านกาแฟแมวส้ม' },
  { id: 'soundbox', name: 'กล่องเสียงแจ้งเงินเข้า', price: 590, effect: 'ลูกค้าโอนเมื่อไหร่ กล่องพูดยอดเงินให้ทันที ไม่ต้องดูสลิปเอง สลิปปลอมหมดสิทธิ์', category: 'tools', was: 990, sold: 52000, stars: 4.9, seller: 'เหมียวเพย์ ช็อป', from: 5 },
  { id: 'call', name: 'แพ็กเกจโทรไม่อั้น', price: 150, effect: 'กดโทรหาน้องมะปรางก่อนเปิดร้าน จ้างมาช่วยจดออเดอร์และนับเงินได้ วันละ 100 บาท (ค่าขนม)', category: 'tools', was: 299, sold: 87000, stars: 4.6, seller: 'เหมียวโมบาย', from: 5 },
];

/** Tallies over the whole seven-day test, for the result at the end. */
export interface RunStats {
  served: number;
  walked: number;
  perfect: number;
  stars: number;
  reviews: number;
  earned: number;
  fakeCaught: number;
  fakeMissed: number;
  fakeLost: number;
  wrongAccuse: number;
  paradoxes: number;
  explained: number;
  asked: number;
  fined: number;
}
export const noStats = (): RunStats => ({ served: 0, walked: 0, perfect: 0, stars: 0, reviews: 0, earned: 0, fakeCaught: 0, fakeMissed: 0, fakeLost: 0, wrongAccuse: 0, paradoxes: 0, explained: 0, asked: 0, fined: 0 });

export interface Save {
  day: number;
  money: number;
  owned: UpgradeId[];
  stats: RunStats;
  /** Menus (by index) customers loved, who may come back for the same again. */
  regulars: number[];
}

const KEY = 'chongwanwan-save-v1';
const fresh = (): Save => ({ day: 1, money: 0, owned: [], stats: noStats(), regulars: [] });

/** Keeps the known tallies from a saved run, as numbers. */
function readStats(raw: unknown): RunStats {
  const st = (raw ?? {}) as Record<string, unknown>;
  const out = noStats();
  (Object.keys(out) as (keyof RunStats)[]).forEach((k) => {
    if (Number.isFinite(st[k])) out[k] = Number(st[k]);
  });
  return out;
}

/** Progress lives in this browser only; a blocked or broken store just starts a new game. */
export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw) as Partial<Save>;
    const known = new Set(UPGRADES.map((u) => u.id));
    return {
      day: Number.isInteger(s.day) && (s.day as number) > 0 ? (s.day as number) : 1,
      money: Number.isFinite(s.money) ? Math.max(0, s.money as number) : 0,
      owned: Array.isArray(s.owned) ? s.owned.filter((id): id is UpgradeId => known.has(id as UpgradeId)) : [],
      stats: readStats(s.stats),
      regulars: Array.isArray(s.regulars) ? s.regulars.filter((i) => Number.isInteger(i)) : [],
    };
  } catch {
    return fresh();
  }
}

export function writeSave(s: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage may be blocked; the game still plays, it just won't remember.
  }
}

export function clearSave(): Save {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
  return fresh();
}
