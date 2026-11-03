export type BaseId = 'tea' | 'black' | 'green' | 'coffee' | 'pea' | 'red' | 'cocoa' | 'matcha';
export type AddId = 'hot' | 'cond' | 'evap' | 'syrup' | 'soda' | 'lemon';
export type IceId = 'none' | 'little' | 'normal' | 'lots';
export type GarnishId = 'none' | 'straw' | 'lime' | 'mint' | 'pea' | 'marigold';
export type VesselId = 'cup' | 'carrier';
export type Additions = Record<AddId, number>;

export interface Drink {
  base: BaseId | null;
  milk: Additions;
  ice: IceId;
  garnish: GarnishId;
  /** 0 = just poured, 1 = fully stirred. */
  mix: number;
  vessel: VesselId | null;
  /** True once the measuring glass has been poured into the serving vessel. */
  poured: boolean;
  /** Tapioca pearls ladled into the serving vessel before the pour. */
  pearls: boolean;
  /** Whipped cream piped on top of a poured cup. */
  whip: boolean;
  /** Cup sealed with film by the sealer, instead of a dome lid. */
  sealed: boolean;
}

export interface Order {
  name: string;
  who: string;
  skin: string;
  hair: string;
  top: string;
  quote: string;
  base: BaseId;
  milk: Additions;
  ice: IceId;
  garnish: GarnishId;
  vessel: VesselId;
  pearls: boolean;
  whip: boolean;
  sealed: boolean;
}

/** milk: colour the base turns toward; mk0/mk1: how far one part of milk moves it. */
export const BASE: Record<BaseId, { n: string; c: string; stream: string; milk: string; mk0: number; mk1: number }> = {
  tea: { n: 'ชาไทย', c: '#ea5a00', stream: '#d45400', milk: '#ffd493', mk0: 0.04, mk1: 0.05 },
  black: { n: 'ชาดำ', c: '#8a3206', stream: '#6e2704', milk: '#ffd493', mk0: 0.15, mk1: 0.1 },
  green: { n: 'ชาเขียว', c: '#5f9e22', stream: '#4f8a1a', milk: '#f6f4dc', mk0: 0.18, mk1: 0.12 },
  coffee: { n: 'กาแฟดำ', c: '#2b150b', stream: '#1f0f07', milk: '#f3d9b5', mk0: 0.28, mk1: 0.13 },
  pea: { n: 'น้ำอัญชัน', c: '#2a3cc4', stream: '#2433a8', milk: '#e9d9ff', mk0: 0.2, mk1: 0.1 },
  red: { n: 'น้ำแดง', c: '#e01f3d', stream: '#c21c33', milk: '#fff0ea', mk0: 0.28, mk1: 0.07 },
  cocoa: { n: 'โกโก้', c: '#5a2f1a', stream: '#4a2414', milk: '#d9b08c', mk0: 0.24, mk1: 0.12 },
  matcha: { n: 'มัทฉะ', c: '#3f7d2a', stream: '#356b22', milk: '#d3e6b4', mk0: 0.2, mk1: 0.12 },
};

export const ADD: Record<AddId, string> = {
  hot: 'น้ำร้อน',
  cond: 'นมข้นหวาน',
  evap: 'นมระเหย',
  syrup: 'น้ำเชื่อม',
  soda: 'โซดา',
  lemon: 'น้ำมะนาว',
};
export const ADD_IDS = Object.keys(ADD) as AddId[];

/** k: ice cubes shown; lv: how much the cubes raise the liquid level. */
export const ICE: Record<IceId, { n: string; k: number; lv: number }> = {
  none: { n: 'ไม่ใส่', k: 0, lv: 0 },
  little: { n: 'น้อย', k: 3, lv: 0.03 },
  normal: { n: 'ปกติ', k: 5, lv: 0.06 },
  lots: { n: 'เยอะ', k: 18, lv: 0.09 },
};

export const GARNISH: Record<GarnishId, string> = {
  none: 'ไม่แต่ง',
  straw: 'หลอดลาย',
  lime: 'มะนาวฝาน',
  mint: 'สะระแหน่',
  pea: 'ดอกอัญชัน',
  marigold: 'ดอกดาวเรือง',
};

export const VESSEL: Record<VesselId, string> = { cup: 'แก้วพลาสติก', carrier: 'ถุงหิ้วกระดาษ' };
/** How the order ticket says each vessel. */
export const VESSEL_ASK: Record<VesselId, string> = { cup: 'ใส่แก้ว', carrier: 'ใส่ถุงหิ้ว' };
/** Vessels come out of the cooler already packed with this much ice. */
export const COOLER_ICE: IceId = 'lots';


/** A full mix takes this many turns of the spoon. */
export const STIR_TURNS = 12;
/** Turns per second above this don't mix any faster. */
export const STIR_MAX = 3;
export const MAX_PER_ADDITION = 4;

export const noAdditions = (): Additions => ({ hot: 0, cond: 0, evap: 0, syrup: 0, soda: 0, lemon: 0 });
/** Tea and coffee bases are dry powder: they colour the hot water but add no volume of their own. */
export const BREWED: BaseId[] = ['tea', 'black', 'green', 'coffee', 'cocoa', 'matcha'];
/** Colour of each powder sitting dry in the bottom of the glass. */
export const POWDER: Partial<Record<BaseId, string>> = { tea: '#e2742a', black: '#5a2e16', green: '#7faf3c', coffee: '#3b2416', cocoa: '#4a2818', matcha: '#5e9b38' };
/** Volume each pour adds. The butterfly pea and red syrups are concentrates, so a pour is small. */
export const ML_PER_POUR: Record<AddId, number> = { hot: 100, cond: 30, evap: 30, syrup: 15, soda: 60, lemon: 10 };
export const CONCENTRATE_ML = 40;

/** Total liquid in the drink. Powder adds nothing. */
export function drinkMl(d: Drink): number {
  const base = d.base && !BREWED.includes(d.base) ? CONCENTRATE_ML : 0;
  return base + ADD_IDS.reduce((sum, k) => sum + d.milk[k] * ML_PER_POUR[k], 0);
}

/** True once the powder in the glass has been dissolved by hot water, or the base was liquid to begin with. */
export const baseDissolved = (d: Drink) => d.base !== null && (!BREWED.includes(d.base) || d.milk.hot > 0);

export const blankDrink = (): Drink => ({
  base: null,
  milk: noAdditions(),
  ice: 'none',
  garnish: 'none',
  mix: 0,
  vessel: null,
  poured: false,
  pearls: false,
  whip: false,
  sealed: false,
});

type OrderSpec = Omit<Order, 'milk' | 'ice' | 'pearls' | 'whip' | 'sealed'> & { milk: Partial<Additions>; pearls?: boolean; whip?: boolean; sealed?: boolean };

const ORDER_SPECS: OrderSpec[] = [
  { name: 'ชาเย็น หวานน้อย', who: 'ป้าแจ่ม', skin: '#e7b58e', hair: '#6b6b6b', top: '#c0392b', quote: 'ชาเย็นใส่ถุงหิ้วนะลูก หวานน้อย ขอหลอดด้วย', base: 'tea', milk: { hot: 1, cond: 1, evap: 1 }, garnish: 'straw', vessel: 'carrier' },
  { name: 'โอเลี้ยง หวานปกติ', who: 'ลุงวิน', skin: '#b98258', hair: '#231c17', top: '#d97a1c', quote: 'โอเลี้ยงเข้มๆ ใส่ถุงหิ้ว ไม่เอาหลอด รีบครับ', base: 'coffee', milk: { hot: 1, syrup: 2 }, garnish: 'none', vessel: 'carrier' },
  { name: 'นมชมพู หวานมาก', who: 'น้องมิ้น', skin: '#f3cba8', hair: '#2a1b12', top: '#f6f6f6', quote: 'นมชมพูใส่แก้วค่ะ หวานๆ ขอหลอดด้วย', base: 'red', milk: { cond: 3, evap: 1 }, garnish: 'straw', vessel: 'cup' },
  { name: 'อัญชันมะนาว', who: 'พี่ออฟฟิศ', skin: '#eabf98', hair: '#17110d', top: '#35577f', quote: 'อัญชันมะนาวใส่แก้ว หวานน้อย ขอหลอดครับ', base: 'pea', milk: { syrup: 1, lemon: 1 }, garnish: 'straw', vessel: 'cup' },
  { name: 'ชาเขียวนม', who: 'น้องแพร', skin: '#f0c8a4', hair: '#3a2415', top: '#ffffff', quote: 'ชาเขียวนมใส่ถุงหิ้วค่ะ หวานปกติ ขอหลอดด้วย', base: 'green', milk: { hot: 1, cond: 2, evap: 1 }, garnish: 'straw', vessel: 'carrier' },
  { name: 'น้ำแดงโซดา', who: 'เฮียเล็ก', skin: '#ecc6a2', hair: '#1b1512', top: '#2f8f6b', quote: 'น้ำแดงโซดาใส่แก้ว ซ่าๆ หวานน้อย ขอหลอดด้วย', base: 'red', milk: { syrup: 1, soda: 2 }, garnish: 'straw', vessel: 'cup' },
  { name: 'ชามะนาว', who: 'พี่ส้ม', skin: '#d9a67c', hair: '#2a1a10', top: '#e0a12b', quote: 'ชามะนาวใส่แก้วจ้ะ เปรี้ยวๆ หวานปกติ ไม่เอาหลอด', base: 'black', milk: { hot: 1, syrup: 2, lemon: 2 }, garnish: 'none', vessel: 'cup' },
  { name: 'ชาดำเย็น', who: 'ลุงชัย', skin: '#b5825a', hair: '#8a8a8a', top: '#3f5e8c', quote: 'ชาดำเย็นใส่ถุงหิ้ว หวานปกติ ไม่ใส่นม ไม่เอาหลอด', base: 'black', milk: { hot: 1, syrup: 2 }, garnish: 'none', vessel: 'carrier' },
  { name: 'กาแฟเย็น', who: 'พี่ฟ้า', skin: '#f0c8a4', hair: '#20140e', top: '#7c4dab', quote: 'กาแฟเย็นใส่แก้วค่ะ นมเยอะหน่อย หวานปกติ ขอหลอด', base: 'coffee', milk: { hot: 1, cond: 2, evap: 2 }, garnish: 'straw', vessel: 'cup' },
  { name: 'กาแฟโบราณ', who: 'ตาบุญ', skin: '#b98a60', hair: '#d8d8d8', top: '#6b8e4e', quote: 'กาแฟโบราณใส่ถุงหิ้ว ใส่นมข้นอย่างเดียว ขอหลอดด้วย', base: 'coffee', milk: { hot: 1, cond: 2 }, garnish: 'straw', vessel: 'carrier' },
  // Unlocked by Phase 2 shop upgrades: cocoa, matcha and tapioca pearls.
  { name: 'โกโก้เย็น', who: 'น้องต้นกล้า', skin: '#f2c9a5', hair: '#2b1a10', top: '#3d8bd1', quote: 'โกโก้เย็นใส่แก้วครับ หวานปกติ ขอหลอดด้วย', base: 'cocoa', milk: { hot: 1, cond: 2, evap: 1 }, garnish: 'straw', vessel: 'cup' },
  { name: 'มัทฉะลาเต้', who: 'พี่เมย์', skin: '#f3d0ae', hair: '#5a3a22', top: '#e8b4c8', quote: 'มัทฉะลาเต้ใส่แก้วค่ะ หวานน้อย นมเยอะ ขอหลอด', base: 'matcha', milk: { hot: 1, syrup: 1, evap: 2 }, garnish: 'straw', vessel: 'cup' },
  { name: 'ชาไทยไข่มุก', who: 'น้องเบล', skin: '#f0c8a4', hair: '#1f140d', top: '#f4a261', quote: 'ชาไทยไข่มุกใส่แก้วค่ะ หวานน้อย ขอหลอดใหญ่ๆ', base: 'tea', milk: { hot: 1, cond: 1, evap: 1 }, garnish: 'straw', vessel: 'cup', pearls: true },
  { name: 'ชานมไข่มุก', who: 'พี่บอส', skin: '#d9a67c', hair: '#120c08', top: '#2d2d2d', quote: 'ชานมไข่มุกใส่ถุงหิ้ว หวานปกติ ขอหลอดครับ', base: 'black', milk: { hot: 1, cond: 2, evap: 1 }, garnish: 'straw', vessel: 'carrier', pearls: true },
  { name: 'โกโก้ไข่มุก', who: 'น้องข้าวปั้น', skin: '#f6d3b3', hair: '#3a2415', top: '#ffd166', quote: 'โกโก้ไข่มุกใส่แก้ว หวานมาก ขอหลอดด้วย', base: 'cocoa', milk: { hot: 1, cond: 3 }, garnish: 'straw', vessel: 'cup', pearls: true },
  { name: 'มัทฉะไข่มุก', who: 'คุณนิด', skin: '#e9bf98', hair: '#6b6b6b', top: '#5b8c5a', quote: 'มัทฉะไข่มุกใส่ถุงหิ้วจ้ะ หวานน้อย ใส่นมนิดนึง ขอหลอด', base: 'matcha', milk: { hot: 1, syrup: 1, evap: 1 }, garnish: 'straw', vessel: 'carrier', pearls: true },
  // Phase 3: whipped cream on top, and delivery riders who need a sealed cup.
  { name: 'ชาเย็นวิปครีม', who: 'น้องปอนด์', skin: '#f2c9a5', hair: '#24170e', top: '#ef476f', quote: 'ชาเย็นใส่แก้ว หวานน้อย โปะวิปครีมเยอะๆ ขอหลอดค่ะ', base: 'tea', milk: { hot: 1, cond: 1, evap: 1 }, garnish: 'straw', vessel: 'cup', whip: true },
  { name: 'นมชมพูวิปครีม', who: 'น้องใบเตย', skin: '#f6d3b3', hair: '#3a2415', top: '#ffafcc', quote: 'นมชมพูใส่แก้ว หวานปกติ ใส่วิปครีมด้วย ขอหลอดค่ะ', base: 'red', milk: { cond: 2, evap: 1 }, garnish: 'straw', vessel: 'cup', whip: true },
  { name: 'โกโก้วิปครีม', who: 'พี่แบงก์', skin: '#d9a67c', hair: '#120c08', top: '#264653', quote: 'โกโก้เย็นใส่แก้ว หวานปกติ โปะวิปครีม ขอหลอดครับ', base: 'cocoa', milk: { hot: 1, cond: 2, evap: 1 }, garnish: 'straw', vessel: 'cup', whip: true },
  { name: 'ชาเย็น ซีลฝา', who: 'ไรเดอร์ต้น', skin: '#c99068', hair: '#17110d', top: '#2a9d8f', quote: 'ไรเดอร์รับออเดอร์ครับ ชาเย็นใส่แก้ว ซีลฝาให้ด้วย หวานน้อย ขอหลอด', base: 'tea', milk: { hot: 1, cond: 1, evap: 1 }, garnish: 'straw', vessel: 'cup', sealed: true },
  { name: 'กาแฟเย็น ซีลฝา', who: 'ไรเดอร์ฝน', skin: '#e9bf98', hair: '#2a1a10', top: '#e76f51', quote: 'ไรเดอร์ค่ะ กาแฟเย็นใส่แก้วซีลฝา นมเยอะ หวานปกติ ขอหลอด', base: 'coffee', milk: { hot: 1, cond: 2, evap: 2 }, garnish: 'straw', vessel: 'cup', sealed: true },
  { name: 'น้ำแดงโซดา ซีลฝา', who: 'ไรเดอร์โจ้', skin: '#b98258', hair: '#231c17', top: '#2a9d8f', quote: 'ไรเดอร์ครับ น้ำแดงโซดาใส่แก้วซีลฝา หวานน้อย ขอหลอด', base: 'red', milk: { syrup: 1, soda: 2 }, garnish: 'straw', vessel: 'cup', sealed: true },
];

export const ORDERS: Order[] = ORDER_SPECS.map((o) => ({ ...o, ice: COOLER_ICE, pearls: o.pearls ?? false, whip: o.whip ?? false, sealed: o.sealed ?? false, milk: { ...noAdditions(), ...o.milk } }));

/** A cup sells for this much, more for premium powders and pearls. */
const PRICE = 45;
const PREMIUM: BaseId[] = ['cocoa', 'matcha'];
export const orderPrice = (o: Order) => PRICE + (PREMIUM.includes(o.base) ? 10 : 0) + (o.pearls ? 10 : 0) + (o.whip ? 10 : 0) + (o.sealed ? 5 : 0);

export function recipeOf(o: Order): string {
  const added = ADD_IDS.filter((k) => o.milk[k]).map((k) => ADD[k] + (o.milk[k] > 1 ? ' ×' + o.milk[k] : ''));
  return [BASE[o.base].n, ...added, ...(o.pearls ? ['ไข่มุก'] : []), ...(o.whip ? ['วิปครีม'] : []), ...(o.sealed ? ['ซีลฝา'] : [])].join(' + ');
}

export function sweetWord(m: Additions): string {
  const v = m.cond + m.syrup;
  return v === 0 ? 'ไม่หวาน' : v === 1 ? 'หวานน้อย' : v === 2 ? 'หวานปกติ' : 'หวานมาก';
}

export interface ScoreRow {
  label: string;
  got: number;
  max: number;
}

export interface Score {
  rows: ScoreRow[];
  total: number;
  pay: number;
  verdict: string;
}

export function score(s: Drink, o: Order): Score {
  const addsRight = ADD_IDS.filter((k) => s.milk[k] === o.milk[k]).length;
  const rows: ScoreRow[] = [
    { label: 'น้ำฐาน', got: s.base === o.base ? 25 : 0, max: 25 },
    { label: 'ส่วนผสมที่เติม', got: addsRight * 5, max: 30 },
    { label: 'คนให้เข้ากัน', got: Math.round(s.mix * 10), max: 10 },
    { label: 'ภาชนะ', got: s.vessel === o.vessel ? 20 : 0, max: 20 },
    { label: 'หลอด', got: s.garnish === o.garnish ? 15 : 0, max: 15 },
  ];
  if (o.pearls || s.pearls) rows.push({ label: 'ไข่มุก', got: s.pearls === o.pearls ? 10 : 0, max: 10 });
  if (o.whip || s.whip) rows.push({ label: 'วิปครีม', got: s.whip === o.whip ? 10 : 0, max: 10 });
  if (o.sealed || s.sealed) rows.push({ label: 'ซีลฝา', got: s.sealed === o.sealed ? 10 : 0, max: 10 });
  // Out of 100, whatever rows the order has.
  const total = Math.round((rows.reduce((sum, r) => sum + r.got, 0) / rows.reduce((sum, r) => sum + r.max, 0)) * 100);
  const price = orderPrice(o);
  const pay = total >= 100 ? price : total >= 70 ? Math.round((price * 2) / 3) : total >= 40 ? Math.round(price / 3) : 0;
  const verdict = total >= 100 ? 'ถูกใจมาก' : total >= 70 ? 'พอใช้ได้' : total >= 40 ? 'ยังไม่ใช่' : 'เททิ้งเถอะ';
  return { rows, total, pay, verdict };
}
