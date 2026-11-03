export type UpgradeId = 'frother' | 'kettle' | 'lime';

export type Category = 'machine' | 'fresh' | 'topping' | 'pack';

export const CATEGORIES: { id: Category; name: string }[] = [
  { id: 'machine', name: 'เครื่องใช้ไฟฟ้า' },
  { id: 'fresh', name: 'วัตถุดิบสด' },
  { id: 'topping', name: 'ท็อปปิ้ง' },
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
}

/** Listed in the phone shop but not on sale yet; later phases fill these in. */
export interface ComingSoon {
  key: string;
  name: string;
  category: Category;
  price: number;
}

export const COMING_SOON: ComingSoon[] = [
  { key: 'whip', name: 'วิปครีมกระป๋อง', category: 'topping', price: 250 },
  { key: 'pearl', name: 'ไข่มุกบุก', category: 'topping', price: 180 },
  { key: 'sealer', name: 'เครื่องซีลฝาแก้ว', category: 'pack', price: 650 },
  { key: 'espresso', name: 'เครื่องชงเอสเพรสโซ', category: 'machine', price: 1500 },
];

export const UPGRADES: Upgrade[] = [
  { id: 'frother', name: 'เครื่องตีฟองนมไฟฟ้า', price: 300, effect: 'ลากลงแก้วตวงแล้วคนให้เองใน 3 วินาที ไม่ต้องหมุนเมาส์', category: 'machine', was: 459, sold: 12400, stars: 4.8, seller: 'บ้านกาแฟแมวส้ม' },
  { id: 'kettle', name: 'กระติกน้ำร้อนไฟฟ้าแบบกด', price: 400, effect: 'กดทีเดียวได้น้ำร้อน 100 ml ลงแก้วตวง ไม่ต้องยกกา', category: 'machine', was: 690, sold: 8300, stars: 4.9, seller: 'เครื่องครัวเหมียวมาร์ท' },
  { id: 'lime', name: 'มะนาวแป้นสด 1 กก.', price: 200, effect: 'ใช้มะนาวคั้นสดแทนน้ำมะนาวขวด ลูกค้าให้ทิปเพิ่ม 5 บาทเมื่อสูตรมีมะนาว', category: 'fresh', was: 260, sold: 31200, stars: 4.7, seller: 'สวนป้าแมว ราชบุรี' },
];

export interface Save {
  day: number;
  money: number;
  owned: UpgradeId[];
}

const KEY = 'chongwanwan-save-v1';
const fresh = (): Save => ({ day: 1, money: 0, owned: [] });

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
