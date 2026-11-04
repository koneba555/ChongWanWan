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
  ORDERS,
  STIR_MAX,
  STIR_TURNS,
  VESSEL,
  VESSEL_ASK,
  blankDrink,
  drinkMl,
  orderPrice,
  recipeOf,
  score,
  sweetWord,
  type AddId,
  type BaseId,
  type Drink,
  type Order,
  type VesselId,
} from './data';
import { Phone } from './phone';
import { UPGRADES, clearSave, loadSave, writeSave, type UpgradeId } from './shop';
import { CUP_HOME, SERVE_HOME, type DrinkStage } from './stage';
import { HANG_SLOTS, Table, hookCount, type DropTarget, type TableItem, type TableRules } from './table';

const $ = <E extends Element = HTMLElement>(sel: string) => document.querySelector<E>(sel) as E;
const RING_LENGTH = 138.2;
const KEY_STIR_SPEED = 9.4; // radians per second, about 1.5 turns
const WAITING = 3;
const RESULT_SECONDS = 4.5;
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

interface Customer {
  order: Order;
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
  return `${parts.join(' + ')}${d.pearls ? ' + ไข่มุก' : ''}${d.whip ? ' + วิปครีม' : ''}${d.sealed ? ' · ซีลฝา' : ''}${d.garnish === 'straw' ? ' · มีหลอด' : ''}`;
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
  const resultCard = $('#result-card');
  const dayCard = $('#day-card');

  const saved = loadSave();
  let day = saved.day;
  let money = saved.money;
  const owned = new Set<UpgradeId>(saved.owned);

  let drink = blankDrink();
  /** Customers at the cart, by card slot; null once a slot has no one left to come. */
  const waiting: (Customer | null)[] = [];
  /** Finished drinks hanging on the hooks, by slot. */
  const tray: ({ drink: Drink; item: TableItem } | null)[] = HANG_SLOTS.map(() => null);
  let resultTimer = 0;
  let dayOpen = false;
  let arrived = 0;
  const today = { done: 0, served: 0, walked: 0, earned: 0, tips: 0 };

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
  const persist = () => writeSave({ day, money, owned: [...owned] });
  const showMoney = () => ($('#money-n').textContent = String(money));
  let dingTimer = 0;
  /** The QR sound box reads out each payment. */
  const ding = (amount: number) => {
    const box = $('#ding');
    box.textContent = `ได้รับเงิน ${amount} บาท`;
    box.hidden = false;
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = '';
    clearTimeout(dingTimer);
    dingTimer = window.setTimeout(() => (box.hidden = true), 2400);
  };

  // Upgrades are bought on the phone shop app, opened from the end-of-day card.
  const phone = new Phone({
    money: () => money,
    owned: () => owned,
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

  function nextHint(): string {
    if (frotherLeft > 0) return 'เครื่องตีฟองนมกำลังคนให้';
    if (stirring) return drink.mix >= 1 ? 'เข้ากันดีแล้ว กดปุ่มใต้แก้วเพื่อวางช้อน' : 'หมุนเมาส์เป็นวงรอบแก้วตวง ยิ่งหมุนเร็ว ยิ่งเสร็จไว หรือกดปุ่ม S ค้างไว้';
    if (!drink.poured) {
      if (!drink.base) {
        return trayCount()
          ? 'ลากถุงที่แขวนรอส่งด้านบนไปวางบนตั๋วของลูกค้าที่สั่ง หรือเริ่มชงแก้วใหม่'
          : owned.has('espresso') && waiting.some((c) => c?.order.base === 'espresso')
            ? 'เลือกออเดอร์ทางซ้าย แล้วลากน้ำฐานมาใส่แก้วตวง เมนูเอสเพรสโซ่ให้กดที่เครื่องชงด้านซ้ายหน้า'
            : 'เลือกออเดอร์ทางซ้าย แล้วลากน้ำฐานมาใส่แก้วตวง';
      }
      if (BREWED.includes(drink.base) && !drink.milk.hot) {
        return owned.has('kettle') ? 'ชา กาแฟ ต้องชงกับน้ำร้อน กดที่กระติกน้ำร้อนด้านซ้าย' : 'ชา กาแฟ ต้องชงกับน้ำร้อน ลากกาน้ำร้อนด้านซ้ายมาเทลงแก้วตวง';
      }
      if (drink.mix < 1) {
        return owned.has('frother')
          ? 'เติมส่วนผสมตามสูตร แล้วลากเครื่องตีฟองนมหรือช้อนมาใส่แก้วตวงเพื่อคน'
          : 'เติมส่วนผสมตามสูตร แล้วลากช้อนข้างนมข้นมาใส่แก้วตวงเพื่อคน';
      }
      if (!drink.vessel) return 'กดที่ถังแช่สีแดงมุมขวาเพื่อเปิดฝา แล้วลากแก้วหรือถุงหิ้วมาวางข้างแก้วตวง';
      if (owned.has('pearl') && !drink.pearls && waiting.some((c) => c?.order.pearls)) return 'ถ้าสั่งไข่มุก ลากชามไข่มุกมาตักใส่ภาชนะก่อน แล้วลากแก้วตวงไปเท';
      return 'ลากแก้วตวงไปเทลงภาชนะ';
    }
    if (drink.vessel === 'cup' && !drink.whip && !drink.sealed) {
      if (owned.has('whip') && waiting.some((c) => c?.order.whip)) return 'ถ้าสั่งวิปครีม ลากกระป๋องวิปครีมมาโปะหน้าแก้ว แล้วค่อยใส่หลอดและแขวนรอส่ง';
      if (owned.has('sealer') && waiting.some((c) => c?.order.sealed)) return 'ไรเดอร์ขอซีลฝา กดที่เครื่องซีลข้างภาชนะ แล้วค่อยใส่หลอดและแขวนรอส่ง';
    }
    return 'ถ้าลูกค้าขอหลอด ลากหลอดข้างนมข้นมาใส่ แล้วกดปุ่มใต้ภาชนะเพื่อแขวนรอส่ง';
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
    stirBox.hidden = !stirring;
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

  function newOrder(): Order {
    const here = waiting.filter((c): c is Customer => c !== null).map((c) => c.order);
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
    const order = first ?? newOrder();
    thumbFor(order);
    // With the QR stand nobody waits for change, so customers put up with a longer wait.
    const total = Math.max(PATIENCE_MIN, PATIENCE_START - (day - 1) * PATIENCE_DROP_PER_DAY) * (owned.has('qr') ? QR_PATIENCE : 1);
    return { order, patience: total, total };
  }

  function renderOrders(fresh = -1): void {
    ordersEl.textContent = '';
    waiting.forEach((c, i) => {
      if (!c) {
        ordersEl.append(el('article', { className: 'order empty', text: 'ไม่มีลูกค้ารอ' }));
        return;
      }
      const o = c.order;
      const card = el('article', { className: `order${i === fresh ? ' new' : ''}` });
      card.dataset.slot = String(i);
      const img = el('img');
      img.src = thumbs.get(o) ?? '';
      img.alt = `${o.name} ${VESSEL_ASK[o.vessel]}`;
      const text = el('div');
      const who = el('div', { className: 'who' });
      const face = el('span', { className: 'face' });
      face.innerHTML = avatarSvg(o);
      who.append(face, el('span', { text: `${o.who}: ${o.quote}` }));
      text.append(el('div', { className: 'name', text: `${o.name} · ${VESSEL_ASK[o.vessel]}` }), who, el('div', { className: 'recipe', text: `สูตร: ${recipeOf(o)} · ${orderPrice(o)} บาท` }));
      const wait = el('div', { className: 'wait' });
      wait.setAttribute('role', 'progressbar');
      wait.setAttribute('aria-label', `เวลารอของ${o.who}`);
      wait.append(el('i'));
      card.append(img, text, wait);
      ordersEl.append(card);
    });
    updatePatienceBars();
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
    resultCard.append(el('div', { id: 'verdict', text: title }), el('div', { id: 'earn', text: line }), list);
    resultCard.hidden = false;
    clearTimeout(resultTimer);
    resultTimer = window.setTimeout(() => (resultCard.hidden = true), RESULT_SECONDS * 1000);
  }

  /** A customer is finished with, served or not; their slot goes to the next arrival. */
  function customerDone(slot: number): void {
    today.done++;
    waiting[slot] = arrive();
    renderOrders(slot);
    updateHud();
    if (today.done >= DAY_CUSTOMERS) endDay();
  }

  function handOver(slot: number, given: Drink): void {
    const c = waiting[slot];
    if (!c) return;
    const r = score(given, c.order);
    const quick = r.total >= 70 && c.patience / c.total > QUICK_TIP_SHARE ? QUICK_TIP : 0;
    const lime = owned.has('lime') && c.order.milk.lemon > 0 && given.milk.lemon === c.order.milk.lemon ? LIME_TIP : 0;
    const tip = r.pay ? quick + lime : 0;
    money += r.pay + tip;
    today.served++;
    today.earned += r.pay;
    today.tips += tip;
    showMoney();
    persist();
    const tipText = tip ? ` · ทิป ${tip}${lime ? ` (มะนาวสด ${lime})` : ''}` : '';
    if (owned.has('qr') && r.pay) ding(r.pay + tip);
    showResult(r.verdict, `${c.order.who} · ${r.pay ? `+${r.pay} บาท${tipText}` : 'ไม่ได้เงิน'}`, r.rows);
    customerDone(slot);
  }

  function walkOut(slot: number): void {
    const c = waiting[slot];
    if (!c) return;
    today.walked++;
    showResult('รอนานเกินไป', `${c.order.who} เดินออกไปแล้ว`, []);
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
    const item = table.addReady(stage.bakeServing(), slot, VESSEL[drink.vessel]);
    tray[slot] = { drink: { ...drink, milk: { ...drink.milk } }, item };
    clearDrink();
  }

  function startDay(): void {
    today.done = today.served = today.walked = today.earned = today.tips = 0;
    arrived = 0;
    waiting.length = 0;
    // Day one always opens with the Thai iced tea, which the hints walk through.
    waiting.push(arrive(day === 1 ? ORDERS[0] : undefined));
    while (waiting.length < WAITING) waiting.push(arrive());
    tray.forEach((entry, i) => {
      if (entry) table.removeItem(entry.item);
      tray[i] = null;
    });
    clearDrink();
    dayOpen = true;
    dayCard.hidden = true;
    renderOrders();
    updateHud();
  }

  function endDay(): void {
    dayOpen = false;
    resultCard.hidden = true;
    table.setCooler(false);
    day++;
    persist();
    renderDayCard(day - 1);
  }

  /** Summary of the day just closed, and the shop. */
  function renderDayCard(closed: number): void {
    dayCard.textContent = '';
    dayCard.append(el('h2', { text: `ปิดร้าน วันที่ ${closed}` }));
    const stats = el('div', { className: 'stats' });
    ([['เสิร์ฟ', `${today.served}`], ['เดินหนี', `${today.walked}`], ['รายได้', `${today.earned}`], ['ทิป', `${today.tips}`]] as const).forEach(([label, value]) => {
      const box = el('div');
      box.append(el('b', { text: value }), el('span', { text: label }));
      stats.append(box);
    });
    const heading = el('h3', { text: 'อัปเกรดร้าน' });
    heading.append(el('span', { className: 'wallet', text: `เงินในร้าน ${money} บาท` }));
    const left = UPGRADES.filter((u) => !owned.has(u.id));
    const affordable = left.filter((u) => u.price <= money).length;
    const shop = el('button', { className: 'phone-cta' });
    shop.type = 'button';
    shop.innerHTML = '<svg viewBox="0 0 34 34" aria-hidden="true"><rect x="9" y="2" width="16" height="30" rx="4" fill="#fff"/><rect x="11" y="6" width="12" height="20" rx="1" fill="#ff5a24"/><circle cx="17" cy="29" r="1.3" fill="#ff5a24"/></svg>';
    const words = el('span');
    words.append(
      el('b', { text: 'เปิดแอปช้อปเหมียว' }),
      el('small', { text: left.length ? `ซื้อของเข้าร้าน · มีของที่เงินพอซื้อ ${affordable} ชิ้น` : 'ซื้ออัปเกรดที่มีขายครบแล้ว รอของใหม่เข้า' }),
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
      const s = clearSave();
      day = s.day;
      money = s.money;
      owned.clear();
      table.applyUpgrades(owned);
      showMoney();
      startDay();
    });
    const open = el('button', { className: 'pill', text: `เปิดร้าน วันที่ ${day}` });
    open.type = 'button';
    open.addEventListener('click', startDay);
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

  function patienceFrame(dt: number): void {
    if (!dayOpen) return;
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
  spoonBtn.addEventListener('click', stopStirring);
  resultCard.addEventListener('click', () => (resultCard.hidden = true));

  drawGarland(garland);
  showMoney();
  stage.layout();
  startDay();

  // Dev mode: shortcuts for checking the summary, the shop and walk-outs without playing a whole day.
  // It shows on the dev server, or on the live site when the address ends in ?dev.
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('dev')) {
    const panel = $('#dev-panel');
    const tools = $('#dev-tools');
    $('#dev-toggle').addEventListener('click', () => {
      tools.hidden = !tools.hidden;
      $('#dev-toggle').setAttribute('aria-expanded', String(!tools.hidden));
    });
    const devOrder = (pick: (o: Order) => boolean) => {
      const slot = waiting.findIndex(Boolean);
      const c = waiting[slot];
      if (!c) return;
      const menus = ORDERS.filter(pick);
      c.order = menus.find((o) => !waiting.some((w) => w?.order === o)) ?? menus.find((o) => o !== c.order) ?? menus[0];
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
      'dev-espresso': () => devOrder((o) => o.base === 'espresso'),
      'dev-rush': () => {
        waiting.forEach((c) => c && (c.patience = Math.min(c.patience, 5)));
      },
      'dev-reset': () => {
        phone.close();
        const s = clearSave();
        day = s.day;
        money = s.money;
        owned.clear();
        table.applyUpgrades(owned);
        showMoney();
        startDay();
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
    if (stage.update(dt, elapsed, mouseX, mouseY)) updateHud();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
