export type BaseId = 'tea' | 'black' | 'green' | 'coffee' | 'pea' | 'red';
export type AddId = 'cond' | 'evap' | 'syrup' | 'soda' | 'lemon';
export type IceId = 'none' | 'little' | 'normal' | 'lots';
export type GarnishId = 'none' | 'straw' | 'lime' | 'mint' | 'pea' | 'marigold';
export type VesselId = 'cup' | 'bag';
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
}

/** milk: colour the base turns toward; mk0/mk1: how far one part of milk moves it. */
export const BASE: Record<BaseId, { n: string; c: string; stream: string; milk: string; mk0: number; mk1: number }> = {
  tea: { n: 'ชาไทย', c: '#ea5a00', stream: '#d45400', milk: '#ffd493', mk0: 0.04, mk1: 0.05 },
  black: { n: 'ชาดำ', c: '#8a3206', stream: '#6e2704', milk: '#ffd493', mk0: 0.15, mk1: 0.1 },
  green: { n: 'ชาเขียว', c: '#5f9e22', stream: '#4f8a1a', milk: '#f6f4dc', mk0: 0.18, mk1: 0.12 },
  coffee: { n: 'กาแฟดำ', c: '#2b150b', stream: '#1f0f07', milk: '#f3d9b5', mk0: 0.28, mk1: 0.13 },
  pea: { n: 'น้ำอัญชัน', c: '#2a3cc4', stream: '#2433a8', milk: '#e9d9ff', mk0: 0.2, mk1: 0.1 },
  red: { n: 'น้ำแดง', c: '#e01f3d', stream: '#c21c33', milk: '#fff0ea', mk0: 0.28, mk1: 0.07 },
};

export const ADD: Record<AddId, string> = {
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
  lots: { n: 'เยอะ', k: 8, lv: 0.09 },
};

export const GARNISH: Record<GarnishId, string> = {
  none: 'ไม่แต่ง',
  straw: 'หลอดลาย',
  lime: 'มะนาวฝาน',
  mint: 'สะระแหน่',
  pea: 'ดอกอัญชัน',
  marigold: 'ดอกดาวเรือง',
};

export const VESSEL: Record<VesselId, string> = { cup: 'แก้วพลาสติก', bag: 'ถุงพลาสติก' };

/** Each drop of ice from the bucket moves the drink one step along this list. */
export const ICE_STEPS: IceId[] = ['none', 'little', 'normal', 'lots'];

/** A full mix takes this many turns of the spoon. */
export const STIR_TURNS = 12;
/** Turns per second above this don't mix any faster. */
export const STIR_MAX = 3;
export const MAX_PER_ADDITION = 4;

export const noAdditions = (): Additions => ({ cond: 0, evap: 0, syrup: 0, soda: 0, lemon: 0 });

export const blankDrink = (): Drink => ({
  base: null,
  milk: noAdditions(),
  ice: 'none',
  garnish: 'none',
  mix: 0,
  vessel: null,
  poured: false,
});

type OrderSpec = Omit<Order, 'milk'> & { milk: Partial<Additions> };

const ORDER_SPECS: OrderSpec[] = [
  { name: 'ชาเย็น หวานน้อย', who: 'ป้าแจ่ม', skin: '#e7b58e', hair: '#6b6b6b', top: '#c0392b', quote: 'ชาเย็นใส่ถุงนะลูก หวานน้อย น้ำแข็งเยอะๆ ขอหลอดด้วย', base: 'tea', milk: { cond: 1, evap: 1 }, ice: 'lots', garnish: 'straw', vessel: 'bag' },
  { name: 'โอเลี้ยง หวานปกติ', who: 'ลุงวิน', skin: '#b98258', hair: '#231c17', top: '#d97a1c', quote: 'โอเลี้ยงเข้มๆ ใส่ถุง น้ำแข็งปกติ ไม่ต้องแต่งอะไร รีบครับ', base: 'coffee', milk: { syrup: 2 }, ice: 'normal', garnish: 'none', vessel: 'bag' },
  { name: 'นมชมพู หวานมาก', who: 'น้องมิ้น', skin: '#f3cba8', hair: '#2a1b12', top: '#f6f6f6', quote: 'นมชมพูใส่แก้วค่ะ หวานๆ น้ำแข็งปกติ ขอดอกดาวเรืองถ่ายรูปด้วย', base: 'red', milk: { cond: 3, evap: 1 }, ice: 'normal', garnish: 'marigold', vessel: 'cup' },
  { name: 'อัญชันมะนาว', who: 'พี่ออฟฟิศ', skin: '#eabf98', hair: '#17110d', top: '#35577f', quote: 'อัญชันมะนาวใส่แก้ว หวานน้อย น้ำแข็งเยอะ ขอมะนาวฝานด้วยครับ', base: 'pea', milk: { syrup: 1, lemon: 1 }, ice: 'lots', garnish: 'lime', vessel: 'cup' },
  { name: 'ชาเขียวนม', who: 'น้องแพร', skin: '#f0c8a4', hair: '#3a2415', top: '#ffffff', quote: 'ชาเขียวนมใส่แก้วค่ะ หวานปกติ น้ำแข็งปกติ แต่งใบสะระแหน่ให้หน่อย', base: 'green', milk: { cond: 2, evap: 1 }, ice: 'normal', garnish: 'mint', vessel: 'cup' },
  { name: 'น้ำแดงโซดา', who: 'เฮียเล็ก', skin: '#ecc6a2', hair: '#1b1512', top: '#2f8f6b', quote: 'น้ำแดงโซดาใส่แก้ว ซ่าๆ เลย หวานน้อย น้ำแข็งเยอะ ขอหลอดด้วย', base: 'red', milk: { syrup: 1, soda: 2 }, ice: 'lots', garnish: 'straw', vessel: 'cup' },
  { name: 'ชามะนาว', who: 'พี่ส้ม', skin: '#d9a67c', hair: '#2a1a10', top: '#e0a12b', quote: 'ชามะนาวใส่แก้วจ้ะ เปรี้ยวๆ หวานปกติ น้ำแข็งปกติ ขอมะนาวฝาน', base: 'black', milk: { syrup: 2, lemon: 2 }, ice: 'normal', garnish: 'lime', vessel: 'cup' },
  { name: 'ชาดำเย็น', who: 'ลุงชัย', skin: '#b5825a', hair: '#8a8a8a', top: '#3f5e8c', quote: 'ชาดำเย็นใส่ถุง หวานปกติ ไม่ใส่นม น้ำแข็งเยอะ ไม่ต้องแต่ง', base: 'black', milk: { syrup: 2 }, ice: 'lots', garnish: 'none', vessel: 'bag' },
  { name: 'กาแฟเย็น', who: 'พี่ฟ้า', skin: '#f0c8a4', hair: '#20140e', top: '#7c4dab', quote: 'กาแฟเย็นใส่แก้วค่ะ นมเยอะหน่อย หวานปกติ น้ำแข็งเยอะ ขอหลอด', base: 'coffee', milk: { cond: 2, evap: 2 }, ice: 'lots', garnish: 'straw', vessel: 'cup' },
  { name: 'กาแฟโบราณ', who: 'ตาบุญ', skin: '#b98a60', hair: '#d8d8d8', top: '#6b8e4e', quote: 'กาแฟโบราณใส่ถุง ใส่นมข้นอย่างเดียว น้ำแข็งปกติ ขอหลอดด้วย', base: 'coffee', milk: { cond: 2 }, ice: 'normal', garnish: 'straw', vessel: 'bag' },
];

export const ORDERS: Order[] = ORDER_SPECS.map((o) => ({ ...o, milk: { ...noAdditions(), ...o.milk } }));

export function recipeOf(o: Order): string {
  const added = ADD_IDS.filter((k) => o.milk[k]).map((k) => ADD[k] + (o.milk[k] > 1 ? ' ×' + o.milk[k] : ''));
  return [BASE[o.base].n, ...added].join(' + ');
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
    { label: 'ส่วนผสมที่เติม', got: addsRight * 6, max: 30 },
    { label: 'คนให้เข้ากัน', got: Math.round(s.mix * 10), max: 10 },
    { label: 'ภาชนะ', got: s.vessel === o.vessel ? 10 : 0, max: 10 },
    { label: 'น้ำแข็ง', got: s.ice === o.ice ? 15 : 0, max: 15 },
    { label: 'ของแต่ง', got: s.garnish === o.garnish ? 10 : 0, max: 10 },
  ];
  const total = rows.reduce((sum, r) => sum + r.got, 0);
  const pay = total >= 100 ? 45 : total >= 70 ? 30 : total >= 40 ? 15 : 0;
  const verdict = total >= 100 ? 'ถูกใจมาก' : total >= 70 ? 'พอใช้ได้' : total >= 40 ? 'ยังไม่ใช่' : 'เททิ้งเถอะ';
  return { rows, total, pay, verdict };
}
