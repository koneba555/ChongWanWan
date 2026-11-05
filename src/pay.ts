/**
 * The till without the daughter: a customer holds up a bank slip, or a handful of coins,
 * and the seller decides whether the money is really all there.
 */

export type PayKind = 'slip' | 'coins';
/** How a slip or a handful of coins can be wrong. */
export type Fake = 'amount' | 'name' | 'date' | 'short';

export interface Payment {
  who: string;
  face: string;
  amount: number;
  kind: PayKind;
  fake: Fake | null;
  /** The slip is only flashed for a moment. */
  quick: boolean;
}

export type PayVerdict = 'ok' | 'reject';

export const SHOP_NAME = 'ร้านชงหวานหวาน';
/** Seconds a quickly flashed slip stays readable, and how long a second look lasts. */
const FLASH_SECONDS = 2.6;
const AGAIN_SECONDS = 1.8;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Coins that add up to a total, biggest first, the way a child empties a pocket. */
function coinsFor(total: number): number[] {
  const coins: number[] = [];
  let left = total;
  // A few fives and ones mixed in make it a real count rather than a glance.
  const fives = Math.min(Math.floor(left / 5), 1 + Math.floor(Math.random() * 3));
  const ones = Math.min(left - fives * 5, Math.floor(Math.random() * 4));
  left -= fives * 5 + ones;
  while (left >= 10) {
    coins.push(10);
    left -= 10;
  }
  while (left >= 5) {
    coins.push(5);
    left -= 5;
  }
  for (let i = 0; i < fives; i++) coins.push(5);
  for (let i = 0; i < ones + left; i++) coins.push(1);
  return coins.sort(() => Math.random() - 0.5);
}

export class PayDesk {
  private readonly root = el('section', 'pay-card');
  private timer = 0;
  private done: ((v: PayVerdict) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root.hidden = true;
    this.root.setAttribute('aria-live', 'polite');
    parent.append(this.root);
  }

  get busy(): boolean {
    return this.done !== null;
  }

  show(p: Payment, done: (v: PayVerdict) => void): void {
    this.done = done;
    clearTimeout(this.timer);
    this.root.textContent = '';
    const head = el('div', 'pay-head');
    const face = el('span', 'face');
    face.innerHTML = p.face;
    const words = el('div');
    words.append(el('b', '', p.who), el('span', '', p.kind === 'slip' ? ' ยื่นสลิปให้ดู' : ' เทเหรียญใส่มือ'));
    words.append(el('small', '', `ต้องจ่าย ${p.amount} บาท`));
    head.append(face, words);

    const proof = p.kind === 'slip' ? this.slip(p) : this.coins(p);
    const cover = el('div', 'pay-cover', p.kind === 'slip' ? 'ลูกค้าเก็บโทรศัพท์แล้ว' : '');
    cover.hidden = true;
    const view = el('div', 'pay-view');
    view.append(proof, cover);

    const actions = el('div', 'pay-actions');
    const ok = el('button', 'pill', p.kind === 'slip' ? 'เงินเข้าแล้ว ขอบคุณค่ะ' : 'ครบแล้ว ขอบคุณจ้า');
    const no = el('button', 'ghost', p.kind === 'slip' ? 'สลิปไม่ถูกนะคะ' : 'ยังขาดอยู่นะ');
    ok.type = no.type = 'button';
    ok.addEventListener('click', () => this.finish('ok'));
    no.addEventListener('click', () => this.finish('reject'));
    actions.append(ok);
    if (p.quick) {
      const again = el('button', 'ghost', 'ขอดูอีกทีค่ะ');
      again.type = 'button';
      again.addEventListener('click', () => {
        cover.hidden = true;
        cover.textContent = 'ดูไม่ทันเหรอ... เก็บแล้วนะ';
        clearTimeout(this.timer);
        this.timer = window.setTimeout(() => (cover.hidden = false), AGAIN_SECONDS * 1000);
      });
      actions.append(again);
      this.timer = window.setTimeout(() => (cover.hidden = false), FLASH_SECONDS * 1000);
    }
    actions.append(no);
    this.root.append(head, view, actions);
    this.root.hidden = false;
    ok.focus();
  }

  private finish(v: PayVerdict): void {
    clearTimeout(this.timer);
    this.root.hidden = true;
    const done = this.done;
    this.done = null;
    done?.(v);
  }

  private slip(p: Payment): HTMLElement {
    const now = new Date();
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const shown = p.fake === 'amount' ? (Math.random() < 0.5 ? (p.amount / 10).toFixed(2) : String(p.amount - 5)) : String(p.amount);
    const to = p.fake === 'name' ? (Math.random() < 0.5 ? 'ร้านชงหวานๆ' : 'นายชง หวานหวาน') : SHOP_NAME;
    const date = p.fake === 'date' ? `เมื่อวาน ${time}` : `วันนี้ ${time}`;
    const slip = el('div', 'slip');
    slip.append(el('div', 'bank', 'เหมียวแบงก์'), el('div', 'ok', '✓ โอนเงินสำเร็จ'), el('div', 'amt', `${shown} บาท`));
    const list = el('dl');
    [
      ['จาก', p.who],
      ['ไปยัง', to],
      ['วันที่', date],
      ['เลขที่รายการ', String(Math.floor(1e9 + Math.random() * 9e9))],
    ].forEach(([k, v]) => list.append(el('dt', '', k), el('dd', '', v)));
    slip.append(list);
    return slip;
  }

  private coins(p: Payment): HTMLElement {
    const total = p.fake === 'short' ? p.amount - (1 + Math.floor(Math.random() * 5)) : p.amount;
    const pile = el('div', 'coins');
    coinsFor(total).forEach((c) => pile.append(el('span', `coin c${c}`, String(c))));
    return pile;
  }
}
