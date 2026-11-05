export type BaseId = 'tea' | 'black' | 'green' | 'coffee' | 'pea' | 'red' | 'cocoa' | 'matcha' | 'espresso';
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
  /** An iceless drink topped up to the brim at extra cost, instead of left half full. */
  topped: boolean;
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
  espresso: { n: 'เอสเพรสโซ่', c: '#3b1d0e', stream: '#2a140a', milk: '#e6c49a', mk0: 0.26, mk1: 0.13 },
};

export const ADD: Record<AddId, string> = {
  hot: 'น้ำร้อน',
  cond: 'นมข้นหวาน',
  evap: 'คาร์เนชั่น',
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
  topped: false,
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
  // Phase 4: shots pulled on the espresso machine.
  { name: 'เอสเพรสโซ่เย็น', who: 'พี่โอ๊ต', skin: '#d9a67c', hair: '#17110d', top: '#1d3557', quote: 'เอสเพรสโซ่เย็นใส่แก้วครับ หวานปกติ ขอหลอดด้วย', base: 'espresso', milk: { cond: 2, evap: 1 }, garnish: 'straw', vessel: 'cup' },
  { name: 'ลาเต้เย็น', who: 'พี่จูน', skin: '#f3d0ae', hair: '#5a3a22', top: '#e9c46a', quote: 'ลาเต้เย็นใส่แก้วค่ะ นมเยอะ หวานน้อย ขอหลอด', base: 'espresso', milk: { syrup: 1, evap: 2 }, garnish: 'straw', vessel: 'cup' },
  { name: 'อเมริกาโน่เย็น', who: 'คุณหมอปิง', skin: '#f0c8a4', hair: '#20140e', top: '#a8dadc', quote: 'อเมริกาโน่เย็นใส่แก้ว ไม่หวาน ไม่เอาหลอดครับ', base: 'espresso', milk: { hot: 1 }, garnish: 'none', vessel: 'cup' },
  { name: 'อเมริกาโน่มะนาว', who: 'พี่กิ๊ฟ', skin: '#e9bf98', hair: '#2a1a10', top: '#90be6d', quote: 'อเมริกาโน่มะนาวใส่แก้วค่ะ หวานน้อย เปรี้ยวนิดๆ ขอหลอด', base: 'espresso', milk: { hot: 1, syrup: 1, lemon: 1 }, garnish: 'straw', vessel: 'cup' },
  { name: 'ลาเต้เย็น ซีลฝา', who: 'ไรเดอร์แบม', skin: '#c99068', hair: '#231c17', top: '#2a9d8f', quote: 'ไรเดอร์ค่ะ ลาเต้เย็นใส่แก้วซีลฝา นมเยอะ หวานน้อย ขอหลอด', base: 'espresso', milk: { syrup: 1, evap: 2 }, garnish: 'straw', vessel: 'cup', sealed: true },
];

export const ORDERS: Order[] = ORDER_SPECS.map((o) => ({ ...o, ice: COOLER_ICE, pearls: o.pearls ?? false, whip: o.whip ?? false, sealed: o.sealed ?? false, milk: { ...noAdditions(), ...o.milk } }));

/** A cup sells for this much, more for premium bases and extras. */
const PRICE = 45;
const PREMIUM: Partial<Record<BaseId, number>> = { cocoa: 10, matcha: 10, espresso: 20 };
export const orderPrice = (o: Order) => PRICE + (PREMIUM[o.base] ?? 0) + (o.pearls ? 10 : 0) + (o.whip ? 10 : 0) + (o.sealed ? 5 : 0);

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
  if (o.ice === 'none' || s.ice === 'none') rows.push({ label: 'น้ำแข็ง', got: s.ice === o.ice ? 10 : 0, max: 10 });
  // Out of 100, whatever rows the order has.
  const total = Math.round((rows.reduce((sum, r) => sum + r.got, 0) / rows.reduce((sum, r) => sum + r.max, 0)) * 100);
  const price = orderPrice(o);
  const pay = total >= 100 ? price : total >= 70 ? Math.round((price * 2) / 3) : total >= 40 ? Math.round(price / 3) : 0;
  const verdict = total >= 100 ? 'ถูกใจมาก' : total >= 70 ? 'พอใช้ได้' : total >= 40 ? 'ยังไม่ใช่' : 'เททิ้งเถอะ';
  return { rows, total, pay, verdict };
}

// ---------------------------------------------------------------------------
// Days: each day opens with a short story. It only tells what has changed at the cart,
// never the rules or surprises the player is about to meet.

/** The daughter who writes up the tickets and counts the money, until the day she can't come. */
export const KID = 'น้องมะปราง';

export interface DayIntro {
  title: string;
  story: string;
}

export function dayIntro(day: number): DayIntro {
  if (day === 1) return { title: 'เปิดร้านวันแรก', story: 'รถเข็นชงหวานหวานเปิดขายหน้าโรงเรียนเป็นวันแรก ลูกค้าเริ่มเดินมาแล้ว' };
  if (day === 2) return { title: 'ลูกค้าเริ่มติดใจ', story: 'เมื่อวานขายดี วันนี้ลูกค้าเยอะขึ้น แต่ละคนก็มีวิธีสั่งเป็นของตัวเอง' };
  if (day === 3) return { title: 'ลูกไปเรียนพิเศษ', story: `${KID}ไปเรียนพิเศษทั้งวัน วันนี้ไม่มีใครจดออเดอร์ให้ ต้องฟังลูกค้าสั่งเอง เงินก็ต้องเช็กเอง` };
  if (day === 4) return { title: 'สิ้นเดือน', story: 'เงินเดือนออก คนเยอะ ทุกคนรีบ' };
  if (day === 5) return { title: 'กลางสัปดาห์', story: 'ขายมาครึ่งทางแล้ว ร้านเริ่มเข้าที่' };
  if (day === 6) return { title: 'หน้าคุ้นๆ', story: 'ขายมาเกือบอาทิตย์ ลูกค้าหน้าเดิมเริ่มเยอะ' };
  if (day === LAST_DAY) return { title: 'วันสุดท้าย', story: 'วันสุดท้ายของการทดสอบ ปิดร้านคืนนี้จะรู้ว่าเป็นแม่ค้าระดับไหน' };
  return { title: 'ขายต่อ', story: 'อีกวันของรถเข็นหน้าโรงเรียน' };
}

/** The test runs this many days, then the cart gets its rank. */
export const LAST_DAY = 7;

// ---------------------------------------------------------------------------
// Special requests from day 2: sweetness, no ice.

export type SweetAsk = 'less' | 'none' | 'more';
export const SWEET_TAG: Record<SweetAsk, string> = { less: 'หวานน้อย', none: 'ไม่หวาน', more: 'หวานมาก' };
export const NO_ICE_TAG = 'ไม่เอาน้ำแข็ง';
/** Topping an iceless drink up to the brim costs this much in extra ingredients. */
export const TOP_UP_COST = 10;

const sweetOf = (m: Additions) => m.cond + m.syrup;

/** Menus made at normal sweetness can be asked less, none or more sweet. */
export const canSweeten = (o: Order) => sweetOf(o.milk) === 2;

/** The order with its sweetness changed: one part less or more of its sweetener, or none at all. */
export function sweetened(o: Order, ask: SweetAsk): Order {
  const milk = { ...o.milk };
  const k: AddId = milk.cond ? 'cond' : 'syrup';
  if (ask === 'less') milk[k]--;
  else if (ask === 'more') milk[k]++;
  else milk.cond = milk.syrup = 0;
  return { ...o, milk };
}

/** The menu name without its sweetness words, for a customer who says their own. */
export const plainName = (o: Order) => o.name.replace(/\s*หวาน\S*/g, '').trim();

/** What a customer with special requests says, built from the order. */
export function askLine(o: Order, sweet: SweetAsk | null, noIce: boolean): string {
  const bits = [`${plainName(o)}${VESSEL_ASK[o.vessel]}`];
  if (sweet) bits.push(SWEET_TAG[sweet]);
  if (noIce) bits.push(NO_ICE_TAG);
  if (o.pearls) bits.push('ใส่ไข่มุก');
  if (o.whip) bits.push('โปะวิปครีม');
  if (o.sealed) bits.push('ซีลฝาด้วย');
  bits.push(o.garnish === 'straw' ? 'ขอหลอดด้วย' : 'ไม่เอาหลอด');
  return bits.join(' ');
}

// ---------------------------------------------------------------------------
// Contradictory orders: the customer asks for something that can't be made as said.

export type ParadoxAnswer = 'literal' | 'explain' | 'ignore';

type Change = Partial<Omit<Order, 'milk'>> & { milk?: Partial<Additions> };

export interface Paradox {
  /** The normal menu, which "ignore" makes and the ticket shows. */
  order: Order;
  quote: string;
  /** Made exactly as said, and what the customer grumbles when they taste it. */
  literal: Order;
  literalTag: string;
  literalGripe: string;
  /** What the seller says to explain, and the drink the customer agrees to. */
  explain: string;
  accept: string;
  sensible: Order;
  sensibleTag: string;
  /** Some customers won't be told; they get the literal drink without complaint. */
  stubborn: string;
  ignoreGripe: string;
}

const mk = (spec: OrderSpec): Order => ({ ...spec, ice: COOLER_ICE, pearls: spec.pearls ?? false, whip: spec.whip ?? false, sealed: spec.sealed ?? false, milk: { ...noAdditions(), ...spec.milk } });
const variant = (o: Order, change: Change): Order => ({ ...o, ...change, milk: { ...o.milk, ...(change.milk ?? {}) } });

function paradox(spec: OrderSpec, quote: string, p: Omit<Paradox, 'order' | 'quote' | 'literal' | 'sensible'> & { literal: Change; sensible: Change }): Paradox {
  const order = mk(spec);
  return { ...p, order, quote, literal: variant(order, p.literal), sensible: variant(order, p.sensible) };
}

export const PARADOXES: Paradox[] = [
  paradox(
    { name: 'นมชมพู', who: 'น้องเฟิร์น', skin: '#f3cba8', hair: '#2a1b12', top: '#ffafcc', quote: '', base: 'red', milk: { cond: 2, evap: 1 }, garnish: 'straw', vessel: 'cup' },
    'นมชมพูใส่แก้วค่ะ ไม่หวานนะคะ ลดน้ำหนักอยู่ ขอหลอด',
    {
      literal: { milk: { cond: 0 } },
      literalTag: 'ไม่ใส่นมข้น',
      literalGripe: 'ก็ยังหวานอยู่ดีนี่คะ น้ำแดงมันหวาน!',
      explain: 'นมชมพูไม่หวานไม่ได้นะคะ น้ำแดงหวานในตัว ทำหวานน้อยให้นะคะ',
      accept: 'อ้าว งั้นหวานน้อยก็ได้ค่ะ',
      sensible: { milk: { cond: 1 } },
      sensibleTag: 'หวานน้อย',
      stubborn: 'ไม่หวานคือไม่หวานค่ะ!',
      ignoreGripe: 'บอกว่าไม่หวานไงคะ!',
    },
  ),
  paradox(
    { name: 'ชาเย็น', who: 'ลุงเปี๊ยก', skin: '#b98258', hair: '#8a8a8a', top: '#f4a261', quote: '', base: 'tea', milk: { hot: 1, cond: 2, evap: 1 }, garnish: 'straw', vessel: 'carrier' },
    'ชาเย็นใส่ถุงหิ้ว หวานน้อย แต่ขอหวานๆ นะ ขอหลอดด้วย',
    {
      literal: { milk: { cond: 1 } },
      literalTag: 'หวานน้อย',
      literalGripe: 'ไหนว่าหวานๆ ไง จืดชืดเลย',
      explain: 'ตกลงเอาหวานน้อยหรือหวานๆ คะลุง',
      accept: 'เอาหวานปกตินั่นแหละ',
      sensible: {},
      sensibleTag: 'หวานปกติ',
      stubborn: 'ก็หวานน้อยแบบหวานๆ ไง!',
      ignoreGripe: 'ก็ได้... แต่บอกหวานน้อยไปแล้วนะ',
    },
  ),
  paradox(
    { name: 'น้ำแดงโซดา', who: 'น้องกัปตัน', skin: '#f2c9a5', hair: '#1f140d', top: '#3d8bd1', quote: '', base: 'red', milk: { syrup: 1, soda: 2 }, garnish: 'straw', vessel: 'cup' },
    'น้ำแดงโซดาใส่แก้วครับ ไม่เอาซ่านะ ขอหลอด',
    {
      literal: { milk: { soda: 0 } },
      literalTag: 'ไม่ใส่โซดา',
      literalGripe: 'อ้าว นี่มันน้ำแดงเฉยๆ นี่ครับ',
      explain: 'ไม่ซ่าก็เป็นน้ำแดงเฉยๆ นะ ใส่โซดาน้อยให้ไหม',
      accept: 'โอเคครับ โซดาน้อยก็ได้',
      sensible: { milk: { soda: 1 } },
      sensibleTag: 'โซดาน้อย',
      stubborn: 'ไม่ซ่าแต่เป็นน้ำแดงโซดาครับ!',
      ignoreGripe: 'ซ่าจนแสบคอเลยครับ!',
    },
  ),
  paradox(
    { name: 'ชาเย็น', who: 'พี่ตูน', skin: '#e9bf98', hair: '#2a1a10', top: '#2a9d8f', quote: '', base: 'tea', milk: { hot: 1, cond: 2, evap: 1 }, garnish: 'straw', vessel: 'cup' },
    'ชาเย็นใส่แก้วครับ ไม่เอาน้ำแข็ง แต่ขอเย็นๆ นะ ขอหลอด',
    {
      literal: { ice: 'none' },
      literalTag: NO_ICE_TAG,
      literalGripe: 'ทำไมมันอุ่นๆ ล่ะครับ',
      explain: 'ไม่ใส่น้ำแข็งจะไม่เย็นนะคะ ใส่น้ำแข็งให้นะคะ',
      accept: 'จริงด้วย งั้นใส่น้ำแข็งครับ',
      sensible: {},
      sensibleTag: 'ใส่น้ำแข็งปกติ',
      stubborn: 'ไม่เอาน้ำแข็งแต่เย็นครับ ทำได้แน่!',
      ignoreGripe: 'บอกไม่เอาน้ำแข็งไงครับ',
    },
  ),
  paradox(
    { name: 'อเมริกาโน่เย็น', who: 'พี่เต๋า', skin: '#f0c8a4', hair: '#17110d', top: '#1d3557', quote: '', base: 'espresso', milk: { hot: 1 }, garnish: 'none', vessel: 'cup' },
    'อเมริกาโน่เย็นใส่นมครับ ไม่เอาหลอด',
    {
      literal: { milk: { evap: 1 } },
      literalTag: 'ใส่คาร์เนชั่น',
      literalGripe: 'รสชาติแปลกๆ นะครับ',
      explain: 'อเมริกาโน่ใส่นมก็คือลาเต้แล้วค่ะ ทำลาเต้ให้นะคะ',
      accept: 'อ๋อ งั้นเอาลาเต้ครับ',
      sensible: { milk: { hot: 0, syrup: 1, evap: 2 } },
      sensibleTag: 'เปลี่ยนเป็นลาเต้',
      stubborn: 'ไม่ใช่ลาเต้ อเมริกาโน่ใส่นมครับ',
      ignoreGripe: 'ไหนนมล่ะครับ',
    },
  ),
];
/** Share of customers who won't be talked round. */
export const STUBBORN = 0.2;

// ---------------------------------------------------------------------------
// The result after the last day: one score out of 100 and a title to share.

export interface RankInput {
  served: number;
  walked: number;
  perfect: number;
  fakeCaught: number;
  fakeMissed: number;
  wrongAccuse: number;
  paradoxes: number;
  explained: number;
}

export interface Rank {
  score: number;
  title: string;
  line: string;
}

/** Fake slips accepted from this many on earn the soft-touch title, whatever the score. */
const SOFT_TOUCH = 3;

export function rankOf(s: RankInput): Rank {
  const perfect = s.served ? s.perfect / s.served : 0;
  const kept = s.served + s.walked ? s.served / (s.served + s.walked) : 0;
  const fakes = s.fakeCaught + s.fakeMissed;
  const caught = fakes ? s.fakeCaught / fakes : 1;
  const fair = Math.max(0, caught - s.wrongAccuse * 0.1);
  const listened = s.paradoxes ? s.explained / s.paradoxes : 1;
  const score = Math.round(perfect * 45 + kept * 25 + fair * 15 + listened * 15);
  if (s.fakeMissed >= SOFT_TOUCH) return { score, title: 'สายบุญ โดนโกงจนหมดตัว', line: 'ใครยื่นสลิปมาก็เชื่อหมด ใจดีเกินไปแล้วแม่' };
  if (score >= 85) return { score, title: 'เซียนรถเข็นระดับประเทศ', line: 'ชงแม่น จับสลิปปลอมได้ คุยกับลูกค้ารู้เรื่อง เปิดแฟรนไชส์ได้เลย' };
  if (score >= 70) return { score, title: 'เจ้าแม่ชาเย็นหน้าโรงเรียน', line: 'เด็กนักเรียนต่อคิวยาว ผู้ปกครองยังต้องแวะ' };
  if (score >= 55) return { score, title: 'แม่ค้าดาวรุ่ง', line: 'มีแววรุ่ง อีกนิดเดียวจะติดตลาด' };
  if (score >= 40) return { score, title: 'มือใหม่หัดชง', line: 'ชงได้ ขายได้ แต่ลูกค้ายังลังเล' };
  return { score, title: 'ชงไปบ่นไป', line: 'ลูกค้าเดินผ่านแล้วรีบเดินต่อ ลองใหม่อีกรอบนะ' };
}
