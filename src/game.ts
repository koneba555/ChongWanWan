import * as T from 'three';
import { drawGarland } from './art';
import {
  ADD,
  ADD_IDS,
  BASE,
  GARNISH,
  COOLER_ICE,
  MAX_PER_ADDITION,
  BREWED,
  KID,
  LAST_DAY,
  NO_ICE_TAG,
  ORDERS,
  PARADOXES,
  STIR_MAX,
  STUBBORN,
  SWEET_TAG,
  TOP_UP_COST,
  STIR_TURNS,
  VESSEL,
  VESSEL_ASK,
  askLine,
  blankDrink,
  canSweeten,
  dayIntro,
  drinkMl,
  orderPrice,
  REVIEWS,
  WALKOUT_REVIEWS,
  ACCUSED_REVIEW,
  starText,
  plainName,
  rankOf,
  recipeOf,
  score,
  sweetWord,
  sweetened,
  type AddId,
  type BaseId,
  type Drink,
  type Order,
  type Paradox,
  type ParadoxAnswer,
  type SweetAsk,
  type VesselId,
} from './data';
import { PayDesk, type Fake, type PayKind } from './pay';
import { Phone } from './phone';
import { UPGRADES, clearSave, loadSave, noStats, writeSave, type RunStats, type UpgradeId } from './shop';
import { CUP_HOME, SERVE_HOME, type DrinkStage } from './stage';
import { HANG_SLOTS, Table, hookCount, type DropTarget, type TableItem, type TableRules } from './table';

const $ = <E extends Element = HTMLElement>(sel: string) => document.querySelector<E>(sel) as E;
const RING_LENGTH = 138.2;
const KEY_STIR_SPEED = 9.4; // radians per second, about 1.5 turns
const WAITING = 3;
/** Customers walk up one at a time: seconds between arrivals, sooner when the cart stands empty. */
const ARRIVE_GAP: [number, number] = [9, 15];
const EMPTY_GAP: [number, number] = [2, 4];
/** Chance the next arrival brings a friend along. */
const PAIR_SHARE = 0.2;
/** Most customers at the cart at once; the rush days fill every hook. */
const crowdFor = (day: number) => (day >= 6 ? 3 : 2);
/** Customers who come to the cart in one day. */
const DAY_CUSTOMERS = 8;
/** Seconds a customer waits on day 1; each later day they are a little less patient. */
const PATIENCE_START = 150;
const PATIENCE_DROP_PER_DAY = 6;
const PATIENCE_MIN = 90;
/** Tip for a good drink handed over while the customer still has more than half their patience. */
const QUICK_TIP = 10;
const QUICK_TIP_SHARE = 0.5;
const LIME_TIP = 5;
/** The QR stand makes customers willing to wait this much longer. */
const QR_PATIENCE = 1.2;
const FROTHER_SECONDS = 3;
/** From day 2, the share of customers who ask for a different sweetness, or no ice. */
const SWEET_ASK_SHARE = 0.4;
const NO_ICE_SHARE = 0.25;
/** Contradictory orders that come each day from day 2. */
const PARADOXES_PER_DAY = 2;
/** An iceless drink left half full: the share of customers who complain, and the pay they keep. */
const HALF_CUP_GRIPE = 0.6;
/** Tip from a no-ice customer whose cup was topped up to the brim. */
const FULL_CUP_TIP = 5;
/** Days in the middle of the week when customers ask for menus the cart can't make yet, and how many a day. */
const WISH_FROM = 3;
const WISH_TO = 6;
const WISHES_PER_DAY = 2;
const NO_STOCK_LINES = ['ไม่มีเหรอ งั้นไปร้านอื่นนะ', 'อ้าว ร้านข้างๆ เขามีนะ', 'เสียดายจัง ไว้มีแล้วบอกนะ', 'ไม่มีอีกแล้วเหรอ...'];

/** The first-day walkthrough: what to look at, and what to do, one step at a time. */
const COACH: { spot: string | null; text: string }[] = [
  { spot: '#orders', text: 'ลูกค้าสั่งอะไร ดูที่การ์ดทางซ้าย มีรูปแก้ว ชื่อเมนู ใส่แก้วหรือถุง และราคา' },
  { spot: '#orders .steps', text: 'สูตรอยู่ตรงนี้ ทำตามจากซ้ายไปขวา ทำขั้นไหนถูกแล้วจะขึ้นเครื่องหมายถูกให้' },
  { spot: null, text: 'ชงในแก้วตวงกลางเคาน์เตอร์: ลากกระป๋องผงชาบนชั้นมาใส่ กดกระติกน้ำร้อน แล้วลากนมหรือน้ำเชื่อมมาเติมตามจำนวนในสูตร' },
  { spot: null, text: 'ลากช้อนมาคนจนครบ 100% แล้วกดถังแช่สีแดง ลากแก้วหรือถุงใส่น้ำแข็งมาวาง จากนั้นลากแก้วตวงไปเท' },
  { spot: null, text: 'กด "ปิดฝา แขวนรอส่ง" น้ำจะไปแขวนบนตะขอ แล้วลากถุงจากตะขอไปวางที่การ์ดลูกค้า' },
  { spot: '#hud', text: 'ติดตรงไหน ดูคำแนะนำตรงนี้ จะบอกทีละขั้นว่าต้องทำอะไรต่อ' },
  { spot: '#top-right', text: 'ลูกค้าจ่ายเต็มราคาเสมอ แต่ชงไม่ตรงจะได้ดาวน้อย คะแนนร้านกับเงินดูตรงนี้' },
];

/** Share of customers who walk off and then post a one-star review. */
const WALKOUT_REVIEW_SHARE = 0.5;
/** Asking a customer to say their order again costs this share of their patience. */
const REPEAT_COST = 0.15;
/** Seconds between spoken orders floating across the top, so they never pile up. */
const SPEECH_GAP = 3.2;
/** From day 4 this share of slips are fake; from day 6 children may pay in coins, sometimes short. */
const FAKE_SLIP_SHARE = 0.3;
const COIN_SHARE = 0.6;
const SHORT_COIN_SHARE = 0.35;
/** The daughter, when called in, costs this much pocket money a day. */
const KID_WAGE = 100;
/** From day 6: a regular asking for the same again, and riders in a hurry. */
const REGULAR_SHARE = 0.3;
const RUSH_PATIENCE = 0.6;
/** The last day: an aunt who only asks prices, and the city officers moving carts on. */
const AUNT_SECONDS = 16;
const RAID_SECONDS = 4;
const RAID_FINE = 100;
const RAID_WAIT = 8;

const ANNOYED = ['(ถอนหายใจ) ', 'บอกไปแล้วนะ ', 'ฟังดีๆ นะ ', 'รอบสุดท้ายนะ '];
const CAUGHT: Record<Fake, string> = { amount: 'อุ๊ย พิมพ์ยอดผิด โอนใหม่ให้ละกัน', name: 'แหะๆ โอนผิดร้าน เดี๋ยวโอนใหม่', date: 'อ้าว สลิปเมื่อวาน... โอนให้ใหม่ก็ได้', short: 'จริงด้วย ขาดไป นี่เหรียญที่เหลือ' };
/** The aunt who asks the price of everything and buys nothing. */
const AUNT: Order = { ...ORDERS[0], name: 'ถามราคา', who: 'ป้าสมศรี', skin: '#e2b088', hair: '#9a9a9a', top: '#b5838d', quote: 'ชาเย็นแก้วละเท่าไหร่จ๊ะ... แล้วโกโก้ล่ะ... มีไข่มุกไหม... อ้อ ไม่เป็นไรจ้ะ แค่ถามดู' };

interface Customer {
  /** What the drink is scored against, after any special requests. */
  order: Order;
  /** The menu as the ticket writes it, at its normal recipe. */
  shown: Order;
  quote: string;
  /** Special requests marked on the ticket, such as less sweet or no ice. */
  tags: string[];
  /** A contradictory order waits for the seller to choose how to answer. */
  paradox?: Paradox;
  answer?: ParadoxAnswer;
  reply?: string;
  /** Share of the pay kept, and what the customer says, when the answer let them down. */
  /** Stars knocked off the review, and what the customer grumbles. */
  gripe?: { drop: number; line: string };
  /** Only asks prices and leaves; nothing to make. */
  browse?: boolean;
  /** Asks for a menu the cart can't make yet; what the cart would need to buy. */
  want?: UpgradeId;
  patience: number;
  total: number;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: { id?: string; className?: string; text?: string } = {}) {
  const e = document.createElement(tag);
  if (props.id) e.id = props.id;
  if (props.className) e.className = props.className;
  if (props.text !== undefined) e.textContent = props.text;
  return e;
}

function avatarSvg(o: Order): string {
  return `<svg viewBox="0 0 46 46" width="100%" height="100%"><rect width="46" height="46" fill="#ffeecb"/><path d="M6 46c1-11 8-15 17-15s16 4 17 15z" fill="${o.top}"/><circle cx="23" cy="21" r="11" fill="${o.skin}"/><path d="M11 21c-1-10 6-15 12-15s13 5 12 15c-3-6-8-8-12-8s-9 2-12 8z" fill="${o.hair}"/><circle cx="19" cy="22" r="1.4" fill="#231a14"/><circle cx="27" cy="22" r="1.4" fill="#231a14"/><path d="M19.5 26.5q3.5 3 7 0" stroke="#7a3b22" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`;
}

/** Short description of a finished drink, for its name tag on the hook. */
function describe(d: Drink): string {
  const parts = [d.base ? BASE[d.base].n : 'ไม่มีน้ำฐาน', ...ADD_IDS.filter((k) => d.milk[k]).map((k) => ADD[k] + (d.milk[k] > 1 ? ` ×${d.milk[k]}` : ''))];
  return `${parts.join(' + ')}${d.pearls ? ' + ไข่มุก' : ''}${d.whip ? ' + วิปครีม' : ''}${d.sealed ? ' · ซีลฝา' : ''}`;
}

export function startGame(stage: DrinkStage): void {
  const stageEl = $('#stage');
  const canvas = $<HTMLCanvasElement>('#gl');
  const garland = $<HTMLCanvasElement>('#garland');
  const ordersEl = $('#orders');
  const contents = $('#contents');
  const hint = $('#hint');
  const stirBox = $('#stir');
  const finishBtn = $<HTMLButtonElement>('#serve');
  const resetBtn = $<HTMLButtonElement>('#reset');
  const spoonBtn = $<HTMLButtonElement>('#spoon-done');
  const iceBtn = $<HTMLButtonElement>('#ice-out');
  const topBtn = $<HTMLButtonElement>('#top-up');
  const resultCard = $('#result-card');
  const dayCard = $('#day-card');

  const saved = loadSave();
  let day = saved.day;
  let money = saved.money;
  const owned = new Set<UpgradeId>(saved.owned);
  let stats: RunStats = saved.stats;
  const regulars: number[] = saved.regulars;
  /** The daughter writes the tickets and counts the money on the first two days, or when called in. */
  let hired = false;
  const kidHere = () => day <= 2 || hired;

  let drink = blankDrink();
  /** Customers at the cart, by card slot; null once a slot has no one left to come. */
  const waiting: (Customer | null)[] = [];
  /** Finished drinks hanging on the hooks, by slot. */
  const tray: ({ drink: Drink; item: TableItem } | null)[] = HANG_SLOTS.map(() => null);
  let nextArrival = 0;
  let dayOpen = false;
  let arrived = 0;
  /** Which arrivals of the day bring a contradictory order, and which have come already. */
  const paradoxAt = new Set<number>();
  const paradoxUsed = new Set<Paradox>();
  const today = { done: 0, served: 0, walked: 0, earned: 0, tips: 0, fakeLost: 0, fakeCount: 0, wants: [] as UpgradeId[] };
  /** Which arrivals of the day ask for a menu the cart doesn't sell. */
  const wishAt = new Set<number>();
  /** The day pauses while the first-day walkthrough is open. */
  let paused = false;
  /** Seconds the cart has been open today, and when the officers come on the last day. */
  let dayClock = 0;
  let raidAt = -1;
  /** The day is over but a customer is still holding up a slip. */
  let closing = false;
  /** Which arrival on the last day is the aunt. */
  let auntAt = -1;
  const payDesk = new PayDesk(stageEl);

  let stirring = false;
  /** Seconds left on the frother's run; it stirs by itself while above zero. */
  let frotherLeft = 0;
  let stirTime = 0;
  let turnRate = 0;
  let spoonAngle = 0;
  let lastPointerAngle: number | null = null;
  let pendingAngle = 0;
  let keyStir = false;
  let mouseX = 0;
  let mouseY = 0;

  const say = (text: string) => {
    hint.textContent = text;
  };
  const trayCount = () => tray.filter(Boolean).length;
  const persist = () => writeSave({ day, money, owned: [...owned], stats, regulars });
  const showMoney = () => ($('#money-n').textContent = String(money));
  const rating = () => (stats.reviews ? stats.stars / stats.reviews : 0);
  const showRating = () => ($('#rating-n').textContent = stats.reviews ? `★ ${rating().toFixed(1)} (${stats.reviews} รีวิว)` : 'ยังไม่มีรีวิว');
  /** A customer posts a review on the shop's map page; the shop's stars are the average of them all. */
  const postReview = (stars: number) => {
    stats.stars += stars;
    stats.reviews++;
    showRating();
    persist();
  };
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

  /** Walks the seller through the first drink; the day waits until it's closed. */
  const coachEl = $('#coach');
  function coach(): void {
    let step = 0;
    paused = true;
    const clearSpot = () => document.querySelectorAll('.spot, .lift').forEach((e) => e.classList.remove('spot', 'lift'));
    const done = () => {
      clearSpot();
      coachEl.hidden = true;
      paused = false;
    };
    const show = () => {
      clearSpot();
      const s = COACH[step];
      const target = s.spot ? document.querySelector<HTMLElement>(s.spot) : null;
      target?.classList.add('spot');
      // A nested target only shows above the dimming if its panel is lifted too.
      target?.parentElement?.closest('#orders, #top')?.classList.add('lift');
      coachEl.classList.toggle('dim', !target);
      coachEl.querySelector('.coach-n')!.textContent = `วิธีชง ${step + 1}/${COACH.length}`;
      coachEl.querySelector('.coach-text')!.textContent = s.text;
      coachEl.querySelector('.coach-next')!.textContent = step === COACH.length - 1 ? 'เริ่มชงเลย' : 'ถัดไป';
      coachEl.hidden = false;
    };
    coachEl.querySelector<HTMLButtonElement>('.coach-next')!.onclick = () => (++step < COACH.length ? show() : done());
    coachEl.querySelector<HTMLButtonElement>('.coach-skip')!.onclick = done;
    show();
  }

  /** The recipe book: every menu the cart can make, and what the rest would need. */
  const bookBtn = $<HTMLButtonElement>('#book-btn');
  const book = $('#book');
  function openBook(): void {
    book.textContent = '';
    const head = el('div', { className: 'book-head' });
    const close = el('button', { className: 'close', text: '×' });
    close.type = 'button';
    close.setAttribute('aria-label', 'ปิดตำรา');
    close.addEventListener('click', () => (book.hidden = true));
    head.append(el('h2', { text: 'ตำราชง' }), close);
    const list = el('ul', { className: 'book-list' });
    const seen = new Set<string>();
    [...ORDERS].sort((a, b) => Number(!!missingFor(a)) - Number(!!missingFor(b))).forEach((o) => {
      const name = plainName(o);
      const key = name + recipeOf(o);
      if (seen.has(key)) return;
      seen.add(key);
      const need = missingFor(o);
      const li = el('li', { className: need ? 'locked' : '' });
      li.append(el('b', { text: name }), el('span', { text: need ? `ต้องมี ${UPGRADES.find((u) => u.id === need)?.name ?? need}` : recipeOf(o) }));
      list.append(li);
    });
    book.append(head, list);
    book.hidden = false;
  }
  bookBtn.addEventListener('click', () => (book.hidden ? openBook() : (book.hidden = true)));
  let dingTimer = 0;
  /** A short note that pops up by the money: the sound box reading out a payment, or what a customer says. */
  const toast = (text: string) => {
    const box = $('#ding');
    box.textContent = text;
    box.hidden = false;
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = '';
    clearTimeout(dingTimer);
    dingTimer = window.setTimeout(() => (box.hidden = true), 2400);
  };
  const ding = (amount: number) => toast(`ได้รับเงิน ${amount} บาท`);

  // Upgrades are bought on the phone shop app, opened from the end-of-day card.
  const phone = new Phone({
    money: () => money,
    owned: () => owned,
    day: () => day,
    buy(id) {
      const u = UPGRADES.find((x) => x.id === id);
      if (!u || owned.has(id) || money < u.price) return;
      money -= u.price;
      owned.add(id);
      table.applyUpgrades(owned);
      persist();
      showMoney();
    },
  });

  /** Keeps each done button just in front of the glass it belongs to. */
  function pinButton(button: HTMLElement, at: T.Vector3): void {
    if (button.hidden) return;
    const p = stage.screenPoint(at.x, at.y, at.z + 1.05);
    button.style.left = `${p.x * 100}%`;
    button.style.top = `${p.y * 100}%`;
  }

  /** Keeps a button just to the right of the serving vessel. */
  function pinBeside(button: HTMLElement): void {
    if (button.hidden) return;
    const p = stage.screenPoint(SERVE_HOME.x + 1.35, 0.6, SERVE_HOME.z);
    button.style.left = `${p.x * 100}%`;
    button.style.top = `${p.y * 100}%`;
  }

  function nextHint(): string {
    if (frotherLeft > 0) return 'เครื่องตีฟองนมกำลังคนให้';
    if (stirring) return drink.mix >= 1 ? 'เข้ากันดีแล้ว กดปุ่มใต้แก้วเพื่อวางช้อน' : 'หมุนเมาส์เป็นวงรอบแก้วตวง ยิ่งหมุนเร็ว ยิ่งเสร็จไว หรือกดปุ่ม S ค้างไว้';
    if (!drink.poured) {
      if (!drink.base) {
        return trayCount()
          ? 'ลากถุงที่แขวนรอส่งด้านบนไปวางบนตั๋วของลูกค้าที่สั่ง หรือเริ่มชงแก้วใหม่'
          : owned.has('espresso') && waiting.some((c) => c?.order.base === 'espresso')
            ? `${kidHere() ? 'เลือกออเดอร์ทางซ้าย' : 'ฟังลูกค้าสั่ง'} แล้วลากน้ำฐานมาใส่แก้วตวง เมนูเอสเพรสโซ่ให้กดที่เครื่องชงด้านซ้ายหลัง`
            : kidHere()
              ? 'เลือกออเดอร์ทางซ้าย แล้วลากน้ำฐานมาใส่แก้วตวง'
              : 'ฟังลูกค้าสั่งจากข้อความที่ลอยผ่าน แล้วลากน้ำฐานมาใส่แก้วตวง ลืมก็กด "ห๊ะ อะไรนะคะ" ที่ตั๋วลูกค้า';
      }
      if (BREWED.includes(drink.base) && !drink.milk.hot) {
        return owned.has('kettle') ? 'ชา กาแฟ ต้องชงกับน้ำร้อน กดที่กระติกน้ำร้อนด้านซ้าย' : 'ชา กาแฟ ต้องชงกับน้ำร้อน ลากกาน้ำร้อนด้านซ้ายมาเทลงแก้วตวง';
      }
      // Tickets marked with a sweetness say how far to move from the normal recipe.
      if (drink.mix < 1 && waiting.some((c) => c?.tags.some((t) => t.startsWith('หวาน') || t === 'ไม่หวาน'))) {
        return 'ตั๋วที่มีป้ายความหวาน ปรับจากสูตรปกติ หวานน้อยลดนมข้นหรือน้ำเชื่อม 1 ส่วน ไม่หวานไม่ใส่เลย หวานมากเพิ่ม 1 ส่วน แล้วคนให้เข้ากัน';
      }
      if (drink.mix < 1) {
        return owned.has('frother')
          ? 'เติมส่วนผสมตามสูตร แล้วลากเครื่องตีฟองนมหรือช้อนมาใส่แก้วตวงเพื่อคน'
          : 'เติมส่วนผสมตามสูตร แล้วลากช้อนข้างนมข้นมาใส่แก้วตวงเพื่อคน';
      }
      if (!drink.vessel) return 'กดที่ถังแช่สีแดงมุมขวาเพื่อเปิดฝา แล้วลากแก้วหรือถุงหิ้วมาวางข้างแก้วตวง';
      if (owned.has('pearl') && !drink.pearls && waiting.some((c) => c?.order.pearls)) return 'ถ้าสั่งไข่มุก ลากชามไข่มุกมาตักใส่ภาชนะก่อน แล้วลากแก้วตวงไปเท';
      if (drink.ice !== 'none' && waiting.some((c) => c?.order.ice === 'none')) return 'ถ้าลูกค้าไม่เอาน้ำแข็ง กดปุ่ม "ไม่ใส่น้ำแข็ง" ข้างภาชนะก่อน แล้วลากแก้วตวงไปเท';
      return 'ลากแก้วตวงไปเทลงภาชนะ';
    }
    if (drink.ice === 'none' && !drink.topped && !stage.pouring) return `ไม่ใส่น้ำแข็ง น้ำเลยได้ครึ่งแก้ว จะกดเติมให้เต็ม (ค่าวัตถุดิบ ${TOP_UP_COST} บาท) หรือแขวนส่งครึ่งแก้วก็ได้`;
    if (drink.vessel === 'cup' && !drink.whip && !drink.sealed) {
      if (owned.has('whip') && waiting.some((c) => c?.order.whip)) return 'ถ้าสั่งวิปครีม ลากกระป๋องวิปครีมมาโปะหน้าแก้ว แล้วกดแขวนรอส่ง';
      if (owned.has('sealer') && waiting.some((c) => c?.order.sealed)) return 'ไรเดอร์ขอซีลฝา กดที่เครื่องซีลข้างภาชนะ แล้วกดแขวนรอส่ง (ใส่ถุงพร้อมหลอดให้เอง)';
    }
    return 'กดปุ่มใต้ภาชนะเพื่อปิดฝา ใส่หลอด แล้วแขวนรอส่ง';
  }

  function updateHud(): void {
    const parts: string[] = [];
    if (drink.base) parts.push(BASE[drink.base].n);
    ADD_IDS.forEach((k) => {
      if (drink.milk[k]) parts.push(ADD[k] + (drink.milk[k] > 1 ? ` ×${drink.milk[k]}` : ''));
    });
    const lines: string[] = [];
    lines.push(parts.length ? `${drink.poured ? 'ในภาชนะ' : 'ในแก้วตวง'}: ${parts.join(' + ')} · ${sweetWord(drink.milk)}` : 'แก้วตวงยังว่างอยู่');
    const extras: string[] = [];
    if (parts.length) extras.push(`คนแล้ว ${Math.round(drink.mix * 100)}%`);
    if (drink.vessel) extras.push(VESSEL[drink.vessel]);
    if (drink.vessel && drink.ice === 'none') extras.push(drink.topped ? 'ไม่ใส่น้ำแข็ง เติมเต็มแก้ว' : 'ไม่ใส่น้ำแข็ง');
    if (drink.pearls) extras.push('ไข่มุก');
    if (drink.whip) extras.push('วิปครีม');
    if (drink.sealed) extras.push('ซีลฝาแล้ว');
    if (drink.garnish !== 'none') extras.push(GARNISH[drink.garnish]);
    extras.push(`แขวนรอส่ง ${trayCount()}/${hookCount(owned)}`);
    lines.push(extras.join(' · '));
    contents.textContent = lines.join('\n');
    if (!stirring) say(nextHint());
    finishBtn.hidden = !drink.poured || stage.pouring;
    resetBtn.hidden = !parts.length && !drink.vessel && drink.garnish === 'none';
    spoonBtn.hidden = !stirring || frotherLeft > 0;
    iceBtn.hidden = day < 2 || !drink.vessel || drink.poured || drink.ice === 'none';
    topBtn.hidden = !drink.poured || stage.pouring || drink.ice !== 'none' || drink.topped;
    stirBox.hidden = !stirring;
    updateSteps();
    $('#day').textContent = String(day);
    $('#order-no').textContent = String(today.done);
    $('#day-total').textContent = String(DAY_CUSTOMERS);
  }

  function updateStirUI(): void {
    $('#ring-fg').setAttribute('stroke-dashoffset', String(RING_LENGTH * (1 - drink.mix)));
    $('#stir-pct').textContent = `${Math.round(drink.mix * 100)}%`;
    $('#stir-speed').textContent = Math.abs(turnRate).toFixed(1);
    $('#stir-time').textContent = stirTime.toFixed(1);
    say(nextHint());
  }

  /** Takes the spoon or frother out of the glass and puts it back where it lives. */
  function stopStirring(): void {
    if (!stirring) return;
    stirring = false;
    frotherLeft = 0;
    turnRate = 0;
    stage.setSpoon(false);
    stage.setFrother(false);
    table.enabled = true;
    ['spoon', 'frother'].forEach((k) => {
      const tool = table.find(k as 'spoon' | 'frother', k);
      if (tool && tool.state === 'hidden' && (k === 'spoon' || owned.has('frother'))) table.sendHome(tool);
    });
    updateHud();
  }

  const aboveCup = (y: number) => new T.Vector3(CUP_HOME.x - 0.75, y, CUP_HOME.z);
  const aboveServe = (y: number) => new T.Vector3(SERVE_HOME.x, y, SERVE_HOME.z);

  /** The order card under a screen point, if any. */
  function cardAt(clientX: number, clientY: number): HTMLElement | null {
    for (const e of document.elementsFromPoint(clientX, clientY)) {
      const card = (e as HTMLElement).closest<HTMLElement>('.order:not(.empty)');
      if (card) return card;
    }
    return null;
  }

  /** Pours one measure of an addition into the measuring glass. False when the glass can't take it. */
  function addToGlass(k: AddId): boolean {
    if (drink.poured) {
      say('เทลงภาชนะไปแล้ว ถ้าจะเติมต้องกดเทใหม่');
      return false;
    }
    if (drink.milk[k] >= MAX_PER_ADDITION) {
      say(`ใส่${ADD[k]}ครบ ${MAX_PER_ADDITION} ส่วนแล้ว`);
      return false;
    }
    drink.milk[k]++;
    drink.mix *= 0.4;
    stage.pour(k === 'hot' || k === 'soda' ? '#e6f3f6' : k === 'syrup' ? '#f3e2b0' : k === 'lemon' ? '#efe48a' : '#f8e7cc');
    stage.applyDrink(drink, false);
    updateHud();
    return true;
  }

  const rules: TableRules = {
    canPick(item) {
      if (stage.pouring || !dayOpen) return false;
      if (item.kind === 'glass') return !drink.poured;
      return true;
    },
    targets(item) {
      switch (item.kind) {
        case 'base':
        case 'add':
        case 'spoon':
        case 'frother':
          return drink.poured ? [] : ['cup'];
        case 'glass':
          return drink.vessel ? ['serve'] : [];
        case 'vessel':
          return drink.poured ? [] : ['serve'];
        case 'garnish':
          return drink.vessel ? ['serve'] : [];
        case 'topping':
          if (item.key === 'whip') return drink.poured && drink.vessel === 'cup' && !drink.whip && !drink.sealed ? ['serve'] : [];
          return drink.vessel && !drink.poured && !drink.pearls ? ['serve'] : [];
        case 'sealer':
        case 'cooler':
        case 'ready':
          return [];
      }
    },
    drop(item: TableItem, target: DropTarget) {
      if (!rules.targets(item).includes(target)) return null;
      let act: ReturnType<TableRules['drop']> = null;
      if (item.kind === 'base') {
        drink.base = item.key as BaseId;
        drink.mix *= 0.4;
        if (!BREWED.includes(drink.base)) stage.pour(BASE[drink.base].stream);
        act = { pos: aboveCup(3), tilt: -1.15, seconds: 0.9 };
      } else if (item.kind === 'add') {
        if (!addToGlass(item.key as AddId)) return null;
        return { pos: aboveCup(3), tilt: item.key === 'lemon' && owned.has('lime') ? 0 : -1.15, seconds: 0.9 };
      } else if (item.kind === 'spoon' || item.kind === 'frother') {
        stirring = true;
        table.enabled = false;
        lastPointerAngle = null;
        if (item.kind === 'frother') {
          frotherLeft = FROTHER_SECONDS;
          stage.setFrother(true);
        } else {
          stage.setSpoon(true);
        }
        act = { pos: new T.Vector3(), tilt: 0, seconds: 0, hide: true };
      } else if (item.kind === 'vessel') {
        drink.vessel = item.key as VesselId;
        drink.ice = COOLER_ICE;
        stage.showVessel(drink.vessel);
        table.setCooler(false);
      } else if (item.kind === 'glass') {
        if (!drink.base || drinkMl(drink) === 0) {
          say('แก้วตวงยังไม่มีน้ำ ใส่น้ำฐานและน้ำร้อนก่อน');
          return null;
        }
        drink.poured = true;
        stage.startPour(drink);
      } else if (item.kind === 'topping' && item.key === 'whip') {
        drink.whip = true;
        act = { pos: aboveServe(4.4), tilt: -2.7, seconds: 0.9 };
      } else if (item.kind === 'topping') {
        drink.pearls = true;
        act = { pos: aboveServe(3.1), tilt: -1.0, seconds: 0.8 };
      } else if (item.kind === 'garnish') {
        drink.garnish = 'straw';
        act = { pos: aboveServe(3.1), tilt: 0, seconds: 0.4 };
      }
      if (item.kind !== 'vessel' && item.kind !== 'glass') stage.applyDrink(drink, false);
      else if (item.kind === 'vessel') stage.applyDrink(drink, true);
      updateHud();
      return act;
    },
    press(item) {
      if (!dayOpen || stage.pouring) return;
      // The thermo pot pumps hot water into the measuring glass.
      if (item.key === 'hot') {
        addToGlass('hot');
        return;
      }
      // The espresso machine pulls a shot straight into the measuring glass.
      if (item.key === 'espresso') {
        if (drink.poured) say('เทลงภาชนะไปแล้ว ถ้าจะเติมต้องกดเทใหม่');
        else if (drink.base === 'espresso') say('ชงช็อตเอสเพรสโซ่ลงแก้วตวงแล้ว');
        else {
          drink.base = 'espresso';
          drink.mix *= 0.4;
          stage.pour(BASE.espresso.stream);
          stage.applyDrink(drink, false);
          updateHud();
        }
        return;
      }
      // The sealer presses film onto the poured cup on the mat.
      if (item.key !== 'sealer') return;
      if (!drink.poured || drink.vessel !== 'cup') say('ซีลได้เฉพาะแก้วพลาสติกที่เทน้ำแล้ว');
      else if (drink.whip) say('แก้ววิปครีมซีลไม่ได้ ใช้ฝาโดมแทน');
      else if (drink.sealed) say('แก้วนี้ซีลฝาแล้ว');
      else {
        drink.sealed = true;
        stage.applyDrink(drink, false);
        updateHud();
      }
    },
    tagExtra(item) {
      if (item.kind === 'add' && drink.milk[item.key as AddId]) return `×${drink.milk[item.key as AddId]}`;
      if (item.kind === 'ready') {
        const entry = tray[Number(item.key)];
        return entry ? `· ${describe(entry.drink)}` : '';
      }
      return '';
    },
    aim(clientX, clientY) {
      const target = cardAt(clientX, clientY);
      ordersEl.querySelectorAll('.order').forEach((c) => c.classList.toggle('aim', c === target));
    },
    deliver(item, clientX, clientY) {
      const card = cardAt(clientX, clientY);
      const slot = Number(item.key);
      const entry = tray[slot];
      if (!card || !entry || !dayOpen) {
        say('วางถุงบนตั๋วของลูกค้าที่สั่ง เพื่อส่งให้ลูกค้า');
        return false;
      }
      const c = waiting[Number(card.dataset.slot)];
      if (c?.paradox && !c.answer) {
        say('ตอบลูกค้าที่ตั๋วก่อนว่าจะทำยังไง');
        return false;
      }
      if (c?.want) {
        say(`${c.shown.who}ถามหา${plainName(c.shown)} ร้านเรายังไม่มี`);
        return false;
      }
      if (c?.browse) {
        say(`${c.shown.who}แค่ถามราคา ไม่ได้สั่งอะไร`);
        return false;
      }
      handOver(Number(card.dataset.slot), entry.drink);
      table.removeItem(item);
      tray[slot] = null;
      updateHud();
      return true;
    },
  };

  const table = new Table(stage, stageEl, canvas, $('#tag'), rules);
  table.applyUpgrades(owned);

  /** Picks a customer who isn't already waiting, when there are enough to choose from. */
  /** Menus that need a bought powder or topping only come up once the cart has it. */
  const canMake = (o: Order) =>
    (o.base !== 'cocoa' || owned.has('cocoa')) && (o.base !== 'matcha' || owned.has('matcha')) && (o.base !== 'espresso' || owned.has('espresso')) && (!o.pearls || owned.has('pearl')) && (!o.whip || owned.has('whip')) && (!o.sealed || owned.has('sealer'));

  /** The first thing the cart would have to buy to make this menu, or null if it can already. */
  const missingFor = (o: Order): UpgradeId | null =>
    o.base === 'cocoa' && !owned.has('cocoa') ? 'cocoa'
    : o.base === 'matcha' && !owned.has('matcha') ? 'matcha'
    : o.base === 'espresso' && !owned.has('espresso') ? 'espresso'
    : o.pearls && !owned.has('pearl') ? 'pearl'
    : o.whip && !owned.has('whip') ? 'whip'
    : o.sealed && !owned.has('sealer') ? 'sealer'
    : null;

  /** A customer asking for a menu the cart can't make yet. */
  function wishCustomer(total: number): Customer | null {
    const locked = ORDERS.filter((o) => missingFor(o) && !waiting.some((w) => w?.shown === o));
    const o = pick(locked);
    if (!o) return null;
    const name = plainName(o);
    const quote = pick([`มี${name}ไหม`, `ร้านนี้มี${name}หรือเปล่า`, `ขอ${name}แก้วนึงได้ไหม`]);
    return { order: o, shown: o, quote, tags: [], browse: true, want: missingFor(o) ?? undefined, patience: total, total };
  }

  /** The seller owns up to not selling it; the customer goes elsewhere, and the cart remembers what was asked for. */
  function sorry(slot: number): void {
    const c = waiting[slot];
    if (!c?.want) return;
    today.wants.push(c.want);
    showResult('ไม่มีขาย', `${c.shown.who}: "${pick(NO_STOCK_LINES)}"`, []);
    customerDone(slot);
  }

  function newOrder(): Order {
    const here = waiting.filter((c): c is Customer => c !== null).map((c) => c.shown);
    const free = ORDERS.filter((o) => canMake(o) && !here.includes(o));
    const pool = free.length ? free : ORDERS.filter(canMake);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** Ticket photos are rendered once per order and reused. */
  const thumbs = new Map<Order, string>();
  function thumbFor(o: Order): void {
    if (!thumbs.has(o)) thumbs.set(o, stage.snapOrder(o, drink));
  }

  /** The next customer of the day walks up, or null once everyone has come. */
  function arrive(first?: Order): Customer | null {
    if (arrived >= DAY_CUSTOMERS) return null;
    arrived++;
    // With the QR stand nobody waits for change, so customers put up with a longer wait.
    let total = Math.max(PATIENCE_MIN, PATIENCE_START - (day - 1) * PATIENCE_DROP_PER_DAY) * (owned.has('qr') ? QR_PATIENCE : 1);
    // On the last day one arrival is the aunt who only asks prices.
    if (day === LAST_DAY && arrived === auntAt) return { order: AUNT, shown: AUNT, quote: AUNT.quote, tags: [], browse: true, patience: AUNT_SECONDS, total: AUNT_SECONDS };
    // Regulars come back for the drink they loved and expect it remembered.
    if (day >= 6 && !first && regulars.length && Math.random() < REGULAR_SHARE) {
      const o = ORDERS[regulars[Math.floor(Math.random() * regulars.length)]];
      if (o && canMake(o) && !waiting.some((w) => w?.shown === o)) {
        thumbFor(o);
        return { order: o, shown: o, quote: 'เอาเหมือนเดิมนะ', tags: [], patience: total, total };
      }
    }
    if (wishAt.has(arrived)) {
      const w = wishCustomer(total);
      if (w) return w;
    }
    const p = paradoxAt.has(arrived) ? pickParadox() : null;
    if (p) {
      thumbFor(p.order);
      return { order: p.order, shown: p.order, quote: p.quote, tags: [], paradox: p, patience: total, total };
    }
    const shown = first ?? newOrder();
    thumbFor(shown);
    let order = shown;
    let sweet: SweetAsk | null = null;
    let noIce = false;
    if (day >= 2 && !first) {
      if (canSweeten(shown) && Math.random() < SWEET_ASK_SHARE) {
        const r = Math.random();
        // Red syrup is sweet by itself, so it never comes without sweetness except as a contradictory order.
        sweet = r < 0.5 ? 'less' : r < 0.75 && shown.base !== 'red' ? 'none' : 'more';
        order = sweetened(order, sweet);
      }
      if (Math.random() < NO_ICE_SHARE) {
        noIce = true;
        order = { ...order, ice: 'none' };
      }
    }
    const tags = [...(sweet ? [SWEET_TAG[sweet]] : []), ...(noIce ? [NO_ICE_TAG] : [])];
    let quote = tags.length ? askLine(shown, sweet, noIce) : shown.quote;
    if (day >= 6 && shown.who.startsWith('ไรเดอร์')) {
      total *= RUSH_PATIENCE;
      quote = `เร็วๆ นะ งานรีบ ${quote}`;
    }
    return { order, shown, quote, tags, patience: total, total };
  }

  /** A contradictory order the cart can make that has not come yet today. */
  function pickParadox(): Paradox | null {
    const left = PARADOXES.filter((p) => canMake(p.order) && !paradoxUsed.has(p));
    const p = left[Math.floor(Math.random() * left.length)] ?? null;
    if (p) paradoxUsed.add(p);
    return p;
  }

  /** How the seller answers a contradictory order decides what the drink should be and how the customer takes it. */
  function answerParadox(slot: number, a: ParadoxAnswer): void {
    const c = waiting[slot];
    if (!c?.paradox || c.answer) return;
    const p = c.paradox;
    c.answer = a;
    stats.paradoxes++;
    if (a === 'explain') stats.explained++;
    if (a === 'literal') {
      c.order = p.literal;
      c.tags = [p.literalTag];
      c.gripe = { drop: 1, line: p.literalGripe };
      c.reply = 'ได้ค่ะ ทำตามสั่งเลย';
    } else if (a === 'ignore') {
      c.order = p.order;
      c.gripe = { drop: 2, line: p.ignoreGripe };
      c.reply = '(ทำเป็นไม่ได้ยิน ชงสูตรปกติ)';
    } else if (Math.random() < STUBBORN) {
      // Some customers dig in; they get what they asked for and are happy with it.
      c.order = p.literal;
      c.tags = [p.literalTag];
      c.reply = `เรา: ${p.explain}\n${p.order.who}: ${p.stubborn}`;
    } else {
      c.order = p.sensible;
      c.tags = [p.sensibleTag];
      c.reply = `เรา: ${p.explain}\n${p.order.who}: ${p.accept}`;
    }
    renderOrders();
    updateHud();
  }

  function renderOrders(fresh = -1): void {
    ordersEl.textContent = '';
    if (!waiting.some(Boolean)) ordersEl.append(el('article', { className: 'order empty', text: dayOpen ? 'ยังไม่มีลูกค้า รอสักครู่...' : 'ไม่มีลูกค้ารอ' }));
    waiting.forEach((c, i) => {
      if (!c) return;
      const o = c.shown;
      const blind = !kidHere() && !c.browse;
      const card = el('article', { className: `order${i === fresh ? ' new' : ''}${c.paradox && !c.answer ? ' ask' : ''}${blind ? ' blind' : ''}` });
      card.dataset.slot = String(i);
      const img = el('img');
      img.src = blind || c.browse ? `data:image/svg+xml,${encodeURIComponent(avatarSvg(o).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}` : thumbs.get(o) ?? '';
      img.alt = blind ? o.who : `${o.name} ${VESSEL_ASK[o.vessel]}`;
      const text = el('div');
      const who = el('div', { className: 'who' });
      const face = el('span', { className: 'face' });
      face.innerHTML = avatarSvg(o);
      who.append(face, el('span', { text: `${o.who}: ${c.quote}` }));
      if (c.want) {
        text.append(el('div', { className: 'name', text: `ถามหา ${plainName(o)}` }), who, el('div', { className: 'reply', text: 'ร้านเรายังไม่มีเมนูนี้' }));
        const no = el('button', { className: 'again', text: 'ขอโทษนะ ยังไม่มีขาย' });
        no.type = 'button';
        no.addEventListener('click', () => sorry(i));
        text.append(no);
      } else if (c.browse) {
        text.append(el('div', { className: 'name', text: 'แค่ถามราคา' }), who);
      } else if (blind) {
        // Nobody wrote it down: the seller has to remember what was said, or ask again.
        text.append(el('div', { className: 'name', text: o.who }));
        const again = el('button', { className: 'again', text: 'ห๊ะ อะไรนะคะ?' });
        again.type = 'button';
        again.addEventListener('click', () => repeat(i));
        text.append(again);
      } else {
        text.append(el('div', { className: 'name', text: `${c.tags.length || c.paradox ? plainName(o) : o.name} · ${VESSEL_ASK[o.vessel]}` }), who);
      }
      if (c.browse) {
        // Nothing to answer or make.
      } else if (c.paradox && !c.answer) {
        // The seller has to choose how to answer before the ticket shows a recipe.
        const choices = el('div', { className: 'choices' });
        ([['literal', 'ทำตามที่สั่ง'], ['explain', 'อธิบายให้ลูกค้าฟัง'], ['ignore', 'ทำเป็นไม่ได้ยิน ชงปกติ']] as const).forEach(([a, label]) => {
          const b = el('button', { text: label });
          b.type = 'button';
          b.addEventListener('click', () => answerParadox(i, a));
          choices.append(b);
        });
        text.append(choices);
      } else {
        if (c.reply) text.append(el('div', { className: 'reply', text: c.reply }));
      }
      if (!c.browse && !blind && !(c.paradox && !c.answer)) {
        const recipe = el('div', { className: 'recipe' });
        recipe.append(el('div', { className: 'recipe-head', text: `สูตร${c.tags.length ? 'ปกติ' : ''} · ${orderPrice(o)} บาท` }));
        const steps = el('ul', { className: 'steps' });
        // Ticks only make sense when the drink to make is the recipe as written.
        if (c.order === o) steps.classList.add('live');
        stepsOf(o).forEach((s) => {
          const li = el('li', { text: s.label });
          li.dataset.k = s.k;
          steps.append(li);
        });
        recipe.append(steps);
        if (c.tags.length) recipe.append(...c.tags.map((t) => el('span', { className: 'tag', text: t })));
        text.append(recipe);
      }
      const wait = el('div', { className: 'wait' });
      wait.setAttribute('role', 'progressbar');
      wait.setAttribute('aria-label', `เวลารอของ${o.who}`);
      wait.append(el('i'));
      card.append(img, text, wait);
      ordersEl.append(card);
    });
    updatePatienceBars();
  }

  /** What goes into the drink, to tick off as it is added. */
  function stepsOf(o: Order): { k: string; label: string }[] {
    const out = [{ k: 'base', label: BASE[o.base].n }];
    ADD_IDS.forEach((k) => {
      if (o.milk[k]) out.push({ k, label: ADD[k] + (o.milk[k] > 1 ? ` ×${o.milk[k]}` : '') });
    });
    if (o.pearls) out.push({ k: 'pearls', label: 'ไข่มุก' });
    if (o.whip) out.push({ k: 'whip', label: 'วิปครีม' });
    if (o.sealed) out.push({ k: 'sealed', label: 'ซีลฝา' });
    return out;
  }

  /** Ticks each recipe step the drink in hand already matches. */
  function updateSteps(): void {
    ordersEl.querySelectorAll<HTMLElement>('.order[data-slot]').forEach((card) => {
      const c = waiting[Number(card.dataset.slot)];
      if (!c) return;
      const o = c.order;
      card.querySelectorAll<HTMLElement>('.steps.live li').forEach((li) => {
        const k = li.dataset.k ?? '';
        const done =
          k === 'base' ? drink.base === o.base
          : k === 'pearls' ? drink.pearls
          : k === 'whip' ? drink.whip
          : k === 'sealed' ? drink.sealed
          : drink.milk[k as AddId] === o.milk[k as AddId];
        li.classList.toggle('done', done);
        li.classList.toggle('over', !done && (ADD_IDS as string[]).includes(k) && drink.milk[k as AddId] > o.milk[k as AddId]);
      });
    });
  }

  function updatePatienceBars(): void {
    ordersEl.querySelectorAll<HTMLElement>('.order[data-slot]').forEach((card) => {
      const c = waiting[Number(card.dataset.slot)];
      const bar = card.querySelector<HTMLElement>('.wait');
      if (!c || !bar) return;
      const share = Math.max(0, c.patience / c.total);
      (bar.firstElementChild as HTMLElement).style.width = `${share * 100}%`;
      bar.classList.toggle('low', share <= QUICK_TIP_SHARE && share > 0.2);
      bar.classList.toggle('out', share <= 0.2);
    });
  }

  function showResult(title: string, line: string, rows: { label: string; got: number; max: number }[]): void {
    resultCard.textContent = '';
    const list = el('ul', { id: 'breakdown' });
    rows.forEach((row) => {
      const li = el('li');
      li.append(el('span', { text: row.label }), el('b', { text: `${row.got}/${row.max}` }));
      list.append(li);
    });
    const review = /^[★☆]/.test(title);
    if (review) resultCard.append(el('small', { className: 'kicker', text: 'รีวิวใหม่บนแผนที่' }));
    resultCard.append(el('div', { id: 'verdict', className: review ? 'stars' : '', text: title }), el('div', { id: 'earn', text: line }), list);
    const close = el('button', { className: 'close', text: '×' });
    close.type = 'button';
    close.setAttribute('aria-label', 'ปิดรีวิว');
    resultCard.append(close);
    resultCard.hidden = false;
  }

  /** A customer is finished with, served or not; their slot goes to the next arrival. */
  function customerDone(slot: number): void {
    today.done++;
    waiting[slot] = null;
    if (!waiting.some(Boolean)) nextArrival = Math.min(nextArrival, dayClock + between(EMPTY_GAP));
    renderOrders();
    updateHud();
    if (today.done >= DAY_CUSTOMERS) endDay();
  }

  function handOver(slot: number, given: Drink): void {
    const c = waiting[slot];
    if (!c) return;
    const r = score(given, c.order);
    // Nobody pays less for a drink they don't like; they pay the price and take it out on the review.
    const pay = orderPrice(c.order);
    let stars = r.stars;
    const said: string[] = [];
    if (c.gripe) {
      stars -= c.gripe.drop;
      said.push(c.gripe.line);
    }
    // A no-ice drink left half full may get a complaint; topped up, it gets thanks.
    const iceless = c.order.ice === 'none' && given.ice === 'none';
    let full = 0;
    if (iceless && given.topped) {
      full = FULL_CUP_TIP;
      said.push('เต็มแก้วเลย ใจดีจัง');
    } else if (iceless && Math.random() < HALF_CUP_GRIPE) {
      stars--;
      said.push('จ่ายเท่าเดิม ได้ครึ่งแก้ว?!');
    } else if (iceless) {
      said.push('เอ๊ะ ครึ่งแก้ว... ช่างเถอะ');
    }
    stars = Math.max(1, Math.min(5, stars));
    const quick = stars >= 4 && c.patience / c.total > QUICK_TIP_SHARE ? QUICK_TIP : 0;
    const lime = owned.has('lime') && c.order.milk.lemon > 0 && given.milk.lemon === c.order.milk.lemon ? LIME_TIP : 0;
    const tip = stars >= 4 ? quick + lime + full : 0;
    today.served++;
    stats.served++;
    if (r.total >= 100) {
      stats.perfect++;
      // A drink made just right turns the customer into a regular.
      const idx = ORDERS.indexOf(c.shown);
      if (idx >= 0 && !regulars.includes(idx)) regulars.push(idx);
    }
    const tipText = tip ? ` · ทิป ${tip}${lime ? ` (มะนาวสด ${lime})` : ''}` : '';
    postReview(stars);
    const words = `\n"${said.length ? said.join(' ') : pick(REVIEWS[stars])}"`;
    const title = starText(stars);
    const amount = pay + tip;
    const kind: PayKind = day >= 6 && c.order.who.startsWith('น้อง') && Math.random() < COIN_SHARE ? 'coins' : 'slip';
    if (kidHere() || (kind === 'slip' && owned.has('soundbox'))) {
      receive(pay, tip);
      if (owned.has('soundbox') && !kidHere()) ding(amount);
      showResult(title, `${c.order.who} · +${pay} บาท${tipText}${words}`, r.rows);
    } else {
      showResult(title, `${c.order.who} · ${kind === 'slip' ? 'ยื่นสลิปจ่าย' : 'จ่ายเหรียญ'} ${amount} บาท${words}`, r.rows);
      const fake: Fake | null =
        kind === 'slip' ? (day >= 4 && Math.random() < FAKE_SLIP_SHARE ? (['amount', 'name', 'date'] as const)[Math.floor(Math.random() * 3)] : null) : Math.random() < SHORT_COIN_SHARE ? 'short' : null;
      collect(c.order, kind, fake, pay, tip);
    }
    persist();
    customerDone(slot);
  }

  /** Money that has really come in. */
  function receive(pay: number, tip: number): void {
    money += pay + tip;
    today.earned += pay;
    today.tips += tip;
    stats.earned += pay + tip;
    showMoney();
    persist();
  }

  /** Customers waiting to show their slip or coins, one at a time. */
  const payQueue: (() => void)[] = [];
  function nextPayment(): void {
    if (payDesk.busy) return;
    const next = payQueue.shift();
    if (next) next();
    else if (closing) {
      closing = false;
      endDay();
    }
  }

  /** The seller looks at the slip or counts the coins and says whether it is all there. */
  function collect(o: Order, kind: PayKind, fake: Fake | null, pay: number, tip: number): void {
    const amount = pay + tip;
    payQueue.push(() =>
      payDesk.show({ who: o.who, face: avatarSvg(o), amount, kind, fake, quick: day >= 4 }, (v) => {
        if (v === 'ok' && !fake) {
          receive(pay, tip);
          toast(`ได้รับเงิน ${amount} บาท`);
        } else if (v === 'ok') {
          // Taken in by a fake: the drink is gone and the money never comes.
          today.fakeLost += amount;
          today.fakeCount++;
          stats.fakeMissed++;
          stats.fakeLost += amount;
          toast(`${o.who} รับน้ำแล้วเดินไป`);
        } else if (fake) {
          stats.fakeCaught++;
          receive(pay, tip);
          toast(`${o.who}: "${CAUGHT[fake]}"`);
        } else {
          stats.wrongAccuse++;
          receive(pay, tip);
          postReview(1);
          showResult(starText(1), `${o.who}\n"${ACCUSED_REVIEW}"`, []);
          toast(`${o.who}: "${kind === 'slip' ? 'โอนแล้วจริงๆ ดูดีๆ สิ!' : 'นับดีๆ สิ ครบแล้วนะ!'}"`);
        }
        persist();
        nextPayment();
      }),
    );
    nextPayment();
  }

  /** Spoken orders float across the top when nobody is writing them down. */
  const lane = el('div', { id: 'speech' });
  lane.setAttribute('aria-live', 'polite');
  stageEl.append(lane);
  let speechFree = 0;
  function speak(c: Customer, text: string): void {
    const now = performance.now();
    const wait = Math.max(0, speechFree - now);
    speechFree = now + wait + SPEECH_GAP * 1000;
    window.setTimeout(() => {
      const b = el('div', { className: 'bubble' });
      const face = el('span', { className: 'face' });
      face.innerHTML = avatarSvg(c.shown);
      b.append(face, el('span', { text: `${c.shown.who}: ${text}` }));
      b.addEventListener('animationend', () => b.remove());
      lane.append(b);
    }, wait);
  }
  function announce(c: Customer | null): void {
    if (c && !kidHere() && !c.browse) speak(c, c.quote);
  }
  /** Asking again works, but the customer is less patient for it. */
  function repeat(slot: number): void {
    const c = waiting[slot];
    if (!c) return;
    c.patience -= c.total * REPEAT_COST;
    stats.asked++;
    speak(c, `${ANNOYED[Math.floor(Math.random() * ANNOYED.length)]}${c.quote}`);
    updatePatienceBars();
  }

  /** On the last day the city officers sweep the street once; the cart has seconds to move. */
  function raid(): void {
    const box = el('section', { className: 'raid' });
    const go = el('button', { className: 'pill', text: 'เข็นรถหลบ!' });
    go.type = 'button';
    const bar = el('div', { className: 'raid-bar' });
    box.append(el('b', { text: 'เทศกิจมาแล้ว!' }), el('span', { text: 'เข็นรถหลบเร็ว ไม่งั้นโดนปรับ' }), go, bar);
    bar.style.animationDuration = `${RAID_SECONDS}s`;
    stageEl.append(box);
    const timer = window.setTimeout(() => {
      box.remove();
      money -= RAID_FINE;
      stats.fined += RAID_FINE;
      showMoney();
      persist();
      toast(`โดนเทศกิจปรับ ${RAID_FINE} บาท`);
    }, RAID_SECONDS * 1000);
    go.addEventListener('click', () => {
      clearTimeout(timer);
      box.remove();
      // Hiding the cart costs the waiting customers some time.
      waiting.forEach((c) => c && (c.patience -= RAID_WAIT));
      toast('หลบทัน! ลูกค้ารอนานขึ้นนิดหน่อย');
    });
    go.focus();
  }

  function walkOut(slot: number): void {
    const c = waiting[slot];
    if (!c) return;
    if (c.want) {
      // Left standing without an answer: still a sale the cart could have had, and maybe a sour review.
      today.wants.push(c.want);
      if (Math.random() < WALKOUT_REVIEW_SHARE) {
        postReview(1);
        showResult(starText(1), `${c.shown.who} เดินออกไปแล้ว\n"ถามว่ามี${plainName(c.shown)}ไหม ไม่มีใครตอบเลย"`, []);
      } else showResult('ไม่มีขาย', `${c.shown.who} เดินไปร้านอื่นแล้ว`, []);
      customerDone(slot);
      return;
    }
    if (c.browse) {
      showResult('แค่ถามราคา', `${c.shown.who}: "ไม่เป็นไรจ้ะ แค่ถามดู"`, []);
      customerDone(slot);
      return;
    }
    today.walked++;
    stats.walked++;
    // Not everyone who walks off bothers to post, but those who do give one star.
    if (Math.random() < WALKOUT_REVIEW_SHARE) {
      postReview(1);
      showResult(starText(1), `${c.order.who} เดินออกไปแล้ว\n"${pick(WALKOUT_REVIEWS)}"`, []);
    } else showResult('รอนานเกินไป', `${c.order.who} เดินออกไปแล้ว`, []);
    customerDone(slot);
  }

  function clearDrink(): void {
    stopStirring();
    drink = blankDrink();
    stirTime = 0;
    stage.resetPositions();
    stage.setGarnish('none', true);
    stage.showVessel(null);
    stage.applyDrink(drink, true);
    updateHud();
  }

  /** Bags the finished drink, hangs it on a free hook and clears the work area for the next one. */
  function finish(): void {
    if (!drink.vessel || !drink.poured || stage.pouring) return;
    const slot = tray.findIndex((entry, i) => !entry && i < hookCount(owned));
    if (slot < 0) {
      say('ตะขอแขวนรอส่งเต็มแล้ว ส่งถุงให้ลูกค้าก่อน');
      return;
    }
    stopStirring();
    stage.setVessel(drink.vessel, !drink.sealed);
    stage.packUp(drink.sealed);
    const item = table.addReady(stage.bakeServing(), slot, VESSEL[drink.vessel]);
    tray[slot] = { drink: { ...drink, milk: { ...drink.milk } }, item };
    clearDrink();
  }

  function startDay(): void {
    today.done = today.served = today.walked = today.earned = today.tips = 0;
    arrived = 0;
    waiting.length = 0;
    paradoxAt.clear();
    paradoxUsed.clear();
    today.fakeLost = today.fakeCount = 0;
    today.wants = [];
    wishAt.clear();
    dayClock = 0;
    raidAt = day === LAST_DAY ? 50 + Math.random() * 60 : -1;
    auntAt = day === LAST_DAY ? 3 + Math.floor(Math.random() * (DAY_CUSTOMERS - 3)) : -1;
    lane.textContent = '';
    speechFree = 0;
    // Contradictory orders come at random points of the day, never first.
    if (day >= 2) while (paradoxAt.size < PARADOXES_PER_DAY) paradoxAt.add(2 + Math.floor(Math.random() * (DAY_CUSTOMERS - 1)));
    // In the middle of the week some customers ask for menus the cart doesn't sell yet.
    if (day >= WISH_FROM && day <= WISH_TO && ORDERS.some((o) => missingFor(o)))
      while (wishAt.size < WISHES_PER_DAY) {
        const n = 2 + Math.floor(Math.random() * (DAY_CUSTOMERS - 1));
        if (!paradoxAt.has(n)) wishAt.add(n);
      }
    // Day one always opens with the Thai iced tea, which the hints walk through.
    waiting.push(arrive(day === 1 ? ORDERS[0] : undefined));
    while (waiting.length < WAITING) waiting.push(null);
    nextArrival = between(ARRIVE_GAP);
    waiting.forEach(announce);
    tray.forEach((entry, i) => {
      if (entry) table.removeItem(entry.item);
      tray[i] = null;
    });
    clearDrink();
    dayOpen = true;
    dayCard.hidden = true;
    dayCard.classList.remove('intro');
    bookBtn.hidden = day < 2;
    renderOrders();
    updateHud();
    if (day === 1) coach();
  }

  function endDay(): void {
    // Anyone still holding up a slip is dealt with first.
    if (payDesk.busy || payQueue.length) {
      closing = true;
      return;
    }
    dayOpen = false;
    lane.textContent = '';
    resultCard.hidden = true;
    table.setCooler(false);
    day++;
    persist();
    if (day > LAST_DAY) renderFinal();
    else renderDayCard(day - 1);
  }

  /** Tells the story of the day about to open and what will happen in it. */
  function showIntro(): void {
    dayOpen = false;
    hired = false;
    const intro = dayIntro(day);
    $('#day').textContent = String(day);
    dayCard.textContent = '';
    dayCard.classList.add('intro');
    dayCard.append(el('div', { className: 'kicker', text: `วันที่ ${day}` }), el('h2', { text: intro.title }), el('p', { className: 'story', text: intro.story }));
    const go = el('button', { className: 'pill', text: 'เริ่มขาย' });
    go.type = 'button';
    go.addEventListener('click', startDay);
    const row = el('div', { className: 'row end' });
    if (owned.has('call') && day > 2) {
      const call = el('button', { className: 'ghost', text: money >= KID_WAGE ? `โทรหา${KID} (ค่าขนม ${KID_WAGE} บาท)` : `เงินไม่พอจ้าง${KID}` });
      call.type = 'button';
      call.disabled = money < KID_WAGE;
      call.addEventListener('click', () => {
        if (hired || money < KID_WAGE) return;
        hired = true;
        money -= KID_WAGE;
        showMoney();
        persist();
        call.replaceWith(el('p', { className: 'kid-says', text: `${KID}: "ได้ค่ะแม่ เดี๋ยวไปช่วยจด แต่ขอชานมไข่มุกแก้วนึงนะ"` }));
      });
      row.append(call);
    }
    row.append(go);
    dayCard.append(row);
    dayCard.hidden = false;
    go.focus();
  }

  /** Throws away the whole run and starts again from day one. */
  function resetRun(): void {
    phone.close();
    const s = clearSave();
    day = s.day;
    money = s.money;
    stats = noStats();
    showRating();
    regulars.length = 0;
    owned.clear();
    table.applyUpgrades(owned);
    showMoney();
    showIntro();
  }

  /** After the last day: the rank, the numbers behind it, and a line to share. */
  function renderFinal(): void {
    dayOpen = false;
    const r = rankOf(stats);
    dayCard.textContent = '';
    dayCard.classList.add('intro');
    dayCard.append(el('div', { className: 'kicker', text: `ผลทดสอบแม่ค้า ${LAST_DAY} วัน` }), el('h2', { text: r.title }), el('div', { className: 'score', text: `${r.score}/100` }), el('p', { className: 'story', text: r.line }));
    const grid = el('div', { className: 'stats' });
    ([
      ['เสิร์ฟ', stats.served],
      ['คะแนนร้าน', stats.reviews ? `★ ${rating().toFixed(1)}` : '-'],
      ['ชงเป๊ะ', stats.perfect],
      ['เดินหนี', stats.walked],
      ['รายได้รวม', stats.earned],
      ['จับสลิปปลอม', stats.fakeCaught],
      ['โดนสลิปปลอม', stats.fakeMissed],
      ['คุยกับลูกค้า', `${stats.explained}/${stats.paradoxes}`],
      ['ถามซ้ำ', stats.asked],
    ] as const).forEach(([label, value]) => {
      const box = el('div');
      box.append(el('b', { text: String(value) }), el('span', { text: label }));
      grid.append(box);
    });
    const share = el('button', { className: 'ghost', text: 'คัดลอกผลไปอวด' });
    share.type = 'button';
    share.addEventListener('click', () => {
      const text = `ฉันได้ฉายา "${r.title}" ${r.score}/100 จากการขายน้ำชงหน้าโรงเรียน ${LAST_DAY} วัน ในเกมชงหวานหวาน`;
      navigator.clipboard?.writeText(text).then(() => (share.textContent = 'คัดลอกแล้ว'), () => (share.textContent = text));
    });
    const again = el('button', { className: 'pill', text: 'ทดสอบใหม่' });
    again.type = 'button';
    again.addEventListener('click', resetRun);
    const row = el('div', { className: 'row end' });
    row.append(share, again);
    dayCard.append(grid, row);
    dayCard.hidden = false;
    again.focus();
  }

  /** Summary of the day just closed, and the shop. */
  function renderDayCard(closed: number): void {
    dayCard.textContent = '';
    dayCard.classList.remove('intro');
    dayCard.append(el('h2', { text: `ปิดร้าน วันที่ ${closed}` }));
    const stats = el('div', { className: 'stats' });
    ([['เสิร์ฟ', `${today.served}`], ['เดินหนี', `${today.walked}`], ['รายได้', `${today.earned}`], ['ทิป', `${today.tips}`], ['คะแนนร้าน', rating() ? `★ ${rating().toFixed(1)}` : '-']] as const).forEach(([label, value]) => {
      const box = el('div');
      box.append(el('b', { text: value }), el('span', { text: label }));
      stats.append(box);
    });
    if (today.wants.length) {
      const asked = new Map<UpgradeId, number>();
      today.wants.forEach((w) => asked.set(w, (asked.get(w) ?? 0) + 1));
      const list = [...asked].map(([id, n]) => `${UPGRADES.find((u) => u.id === id)?.name ?? id}${n > 1 ? ` ×${n}` : ''}`).join(' · ');
      dayCard.append(el('p', { className: 'reveal wants', text: `วันนี้ลูกค้าถามหาของที่ร้านไม่มี: ${list}` }));
    }
    if (today.fakeLost) {
      dayCard.append(el('p', { className: 'reveal', text: `ปิดร้านแล้วเปิดแอปธนาคารเช็กยอด เงินไม่เข้า ${today.fakeLost} บาท จากสลิป ${today.fakeCount} ใบ...` }));
    }
    const heading = el('h3', { text: 'อัปเกรดร้าน' });
    heading.append(el('span', { className: 'wallet', text: `เงินในร้าน ${money} บาท` }));
    const left = UPGRADES.filter((u) => !owned.has(u.id) && (u.from ?? 1) <= day);
    const fresh = UPGRADES.filter((u) => u.from === day).length;
    const affordable = left.filter((u) => u.price <= money).length;
    const shop = el('button', { className: 'phone-cta' });
    shop.type = 'button';
    shop.innerHTML = '<svg viewBox="0 0 34 34" aria-hidden="true"><rect x="9" y="2" width="16" height="30" rx="4" fill="#fff"/><rect x="11" y="6" width="12" height="20" rx="1" fill="#ff5a24"/><circle cx="17" cy="29" r="1.3" fill="#ff5a24"/></svg>';
    const words = el('span');
    words.append(
      el('b', { text: 'เปิดแอปช้อปเหมียว' }),
      el('small', { text: `${fresh ? `มีของใหม่เข้า ${fresh} ชิ้น · ` : ''}${left.length ? `ซื้อของเข้าร้าน · มีของที่เงินพอซื้อ ${affordable} ชิ้น` : 'ซื้ออัปเกรดที่มีขายครบแล้ว รอของใหม่เข้า'}` }),
    );
    shop.append(words);
    shop.addEventListener('click', () => phone.open(() => renderDayCard(closed)));
    dayCard.append(stats, heading, shop);
    const actions = el('div', { className: 'row' });
    const restart = el('button', { className: 'ghost', text: 'เริ่มเกมใหม่ทั้งหมด' });
    restart.type = 'button';
    restart.addEventListener('click', () => {
      // A second press confirms, since this throws away money and upgrades.
      if (restart.dataset.armed !== '1') {
        restart.dataset.armed = '1';
        restart.textContent = 'กดอีกครั้งเพื่อล้างเงินและอัปเกรด';
        return;
      }
      resetRun();
    });
    const open = el('button', { className: 'pill', text: `เปิดร้าน วันที่ ${day}` });
    open.type = 'button';
    open.addEventListener('click', showIntro);
    actions.append(restart, open);
    dayCard.append(actions);
    dayCard.hidden = false;
    open.focus();
  }

  function stirFrame(dt: number): void {
    if (!stirring) {
      pendingAngle = 0;
      return;
    }
    let raw = pendingAngle / Math.max(dt, 0.001);
    spoonAngle += pendingAngle;
    pendingAngle = 0;
    if (frotherLeft > 0) {
      // The frother whirls on its own and finishes the mix in a fixed time.
      frotherLeft -= dt;
      raw = 0;
      spoonAngle += 30 * dt;
      if (stage.hasCupLiquid) {
        stirTime += dt;
        drink.mix = Math.min(1, drink.mix + dt / FROTHER_SECONDS);
        if (Math.abs(drink.mix - stage.paintedMix) > 0.025 || drink.mix === 1) stage.paintLiquid(drink);
      }
      stage.setStirAngle(spoonAngle);
      updateStirUI();
      if (frotherLeft <= 0 || drink.mix >= 1) stopStirring();
      return;
    }
    if (keyStir) {
      raw = KEY_STIR_SPEED;
      spoonAngle += raw * dt;
    }
    turnRate += (raw / (2 * Math.PI) - turnRate) * Math.min(1, dt * 4);
    stage.setStirAngle(spoonAngle);
    const speed = Math.abs(turnRate);
    if (speed > 0.15 && stage.hasCupLiquid && drink.mix < 1) {
      stirTime += dt;
      drink.mix = Math.min(1, drink.mix + (Math.min(speed, STIR_MAX) / STIR_TURNS) * dt);
      if (Math.abs(drink.mix - stage.paintedMix) > 0.025 || drink.mix === 1) stage.paintLiquid(drink);
      updateHud();
    }
    updateStirUI();
  }

  const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);

  /** The next one or two customers walk up, if there is room at the cart. */
  function walkUp(): void {
    nextArrival = dayClock + between(ARRIVE_GAP);
    const room = crowdFor(day) - waiting.filter(Boolean).length;
    if (room <= 0 || arrived >= DAY_CUSTOMERS) return;
    const count = room > 1 && Math.random() < PAIR_SHARE ? 2 : 1;
    for (let n = 0; n < count; n++) {
      const slot = waiting.indexOf(null);
      const c = slot < 0 ? null : arrive();
      if (!c) break;
      waiting[slot] = c;
      announce(c);
      renderOrders(slot);
    }
    updateHud();
  }

  function patienceFrame(dt: number): void {
    if (!dayOpen || paused) return;
    dayClock += dt;
    if (raidAt >= 0 && dayClock >= raidAt) {
      raidAt = -1;
      raid();
    }
    if (dayClock >= nextArrival) walkUp();
    waiting.forEach((c, i) => {
      if (!c) return;
      c.patience -= dt;
      if (c.patience <= 0) walkOut(i);
    });
    updatePatienceBars();
  }

  stageEl.addEventListener('pointermove', (e) => {
    const r = stageEl.getBoundingClientRect();
    mouseX = (e.clientX - r.left) / r.width - 0.5;
    mouseY = (e.clientY - r.top) / r.height - 0.5;
    if (!stirring || frotherLeft > 0) {
      lastPointerAngle = null;
      return;
    }
    const c = stage.screenPoint(CUP_HOME.x, 1, CUP_HOME.z);
    const dx = e.clientX - r.left - c.x * r.width;
    const dy = e.clientY - r.top - c.y * r.height;
    if (Math.hypot(dx, dy) < 14) {
      lastPointerAngle = null;
      return;
    }
    const a = Math.atan2(dy, dx);
    if (lastPointerAngle !== null) {
      let d = a - lastPointerAngle;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      pendingAngle += Math.max(-1.4, Math.min(1.4, d));
    }
    lastPointerAngle = a;
  });
  addEventListener('keydown', (e) => {
    if (e.key === 's' || e.key === 'S') keyStir = true;
  });
  addEventListener('keyup', (e) => {
    if (e.key === 's' || e.key === 'S') keyStir = false;
  });
  addEventListener('blur', () => {
    keyStir = false;
  });
  addEventListener('resize', () => {
    stage.layout();
    drawGarland(garland);
  });
  finishBtn.addEventListener('click', finish);
  resetBtn.addEventListener('click', clearDrink);
  iceBtn.addEventListener('click', () => {
    drink.ice = 'none';
    stage.applyDrink(drink, false);
    updateHud();
  });
  topBtn.addEventListener('click', () => {
    if (!drink.poured || drink.ice !== 'none' || drink.topped) return;
    drink.topped = true;
    money -= TOP_UP_COST;
    today.earned -= TOP_UP_COST;
    showMoney();
    persist();
    stage.applyDrink(drink, false);
    updateHud();
  });
  spoonBtn.addEventListener('click', stopStirring);
  resultCard.addEventListener('click', () => (resultCard.hidden = true));

  drawGarland(garland);
  showMoney();
  showRating();
  stage.layout();
  if (day > LAST_DAY) renderFinal();
  else showIntro();

  // Dev mode: shortcuts for checking the summary, the shop and walk-outs without playing a whole day.
  // It shows on the dev server, or on the live site when the address ends in ?dev.
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('dev')) {
    const panel = $('#dev-panel');
    const tools = $('#dev-tools');
    let devServes = 0;
    $('#dev-toggle').addEventListener('click', () => {
      tools.hidden = !tools.hidden;
      $('#dev-toggle').setAttribute('aria-expanded', String(!tools.hidden));
    });
    const devOrder = (pick: (o: Order) => boolean) => {
      const slot = waiting.findIndex(Boolean);
      const c = waiting[slot];
      if (!c) return;
      const menus = ORDERS.filter(pick);
      c.order = menus.find((o) => !waiting.some((w) => w?.shown === o)) ?? menus.find((o) => o !== c.shown) ?? menus[0];
      c.shown = c.order;
      c.quote = c.order.quote;
      c.tags = [];
      c.paradox = c.answer = c.reply = c.gripe = undefined;
      c.patience = c.total;
      thumbFor(c.order);
      renderOrders(slot);
      updateHud();
    };
    const actions: Record<string, () => void> = {
      'dev-end-day': () => {
        if (dayOpen) endDay();
      },
      'dev-money': () => {
        money += 500;
        showMoney();
        persist();
        // Refresh the shop so newly affordable upgrades can be bought.
        if (!dayCard.hidden && !phone.isOpen) renderDayCard(day - 1);
        phone.refresh();
      },
      // Swap the first waiting customer for a lemon order (to try the fresh-lime tip) or a pearl order.
      'dev-lemon': () => devOrder((o) => o.milk.lemon > 0),
      'dev-pearl': () => devOrder((o) => o.pearls),
      'dev-whip': () => devOrder((o) => o.whip),
      'dev-sealed': () => devOrder((o) => o.sealed),
      'dev-wish': () => {
        const slot = waiting.findIndex(Boolean);
        const c = slot < 0 ? null : wishCustomer(waiting[slot]!.total);
        if (!c) return;
        waiting[slot] = c;
        renderOrders(slot);
      },
      'dev-espresso': () => devOrder((o) => o.base === 'espresso'),
      'dev-paradox': () => {
        const slot = waiting.findIndex(Boolean);
        const c = waiting[slot];
        const p = PARADOXES.filter((x) => canMake(x.order))[Math.floor(Math.random() * 4)];
        if (!c || !p) return;
        thumbFor(p.order);
        Object.assign(c, { order: p.order, shown: p.order, quote: p.quote, tags: [], paradox: p, answer: undefined, reply: undefined, gripe: undefined, patience: c.total });
        renderOrders(slot);
        updateHud();
      },
      'dev-noice': () => {
        const slot = waiting.findIndex(Boolean);
        const c = waiting[slot];
        if (!c || c.paradox) return;
        c.order = { ...c.order, ice: 'none' };
        if (!c.tags.includes(NO_ICE_TAG)) c.tags.push(NO_ICE_TAG);
        c.quote = askLine(c.shown, null, true);
        renderOrders(slot);
        updateHud();
      },
      'dev-rush': () => {
        waiting.forEach((c) => c && (c.patience = Math.min(c.patience, 5)));
      },
      'dev-reset': resetRun,
      'dev-serve': () => {
        const slot = waiting.findIndex(Boolean);
        const c = waiting[slot];
        if (!c) return;
        // Hands over the order as made, or with one thing wrong every other press.
        devServes++;
        const given: Drink = { ...blankDrink(), ...c.order, milk: { ...c.order.milk }, mix: 1, poured: true, topped: false };
        if (devServes % 2 === 0) given.vessel = given.vessel === 'cup' ? 'carrier' : 'cup';
        handOver(slot, given);
      },
      'dev-slip': () => {
        const c = waiting.find(Boolean);
        if (c) collect(c.shown, 'slip', (['amount', 'name', 'date'] as const)[Math.floor(Math.random() * 3)], 45, 0);
      },
      'dev-coins': () => {
        const c = waiting.find(Boolean);
        if (c) collect(c.shown, 'coins', Math.random() < 0.5 ? 'short' : null, 45, 0);
      },
      'dev-raid': raid,
      'dev-final': () => {
        day = LAST_DAY + 1;
        persist();
        renderFinal();
      },
    };
    Object.entries(actions).forEach(([id, run]) => $(`#${id}`).addEventListener('click', run));
    panel.hidden = false;
  }

  let last = performance.now();
  let elapsed = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    stirFrame(dt);
    patienceFrame(dt);
    table.update(dt, elapsed);
    pinButton(finishBtn, SERVE_HOME);
    pinButton(spoonBtn, CUP_HOME);
    pinBeside(iceBtn);
    pinBeside(topBtn);
    if (stage.update(dt, elapsed, mouseX, mouseY)) updateHud();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
