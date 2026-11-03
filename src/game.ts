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
  recipeOf,
  score,
  sweetWord,
  type AddId,
  type BaseId,
  type Drink,
  type Order,
  type VesselId,
} from './data';
import { CUP_HOME, SERVE_HOME, type DrinkStage } from './stage';
import { HANG_SLOTS, Table, type DropTarget, type TableItem, type TableRules } from './table';

const $ = <E extends Element = HTMLElement>(sel: string) => document.querySelector<E>(sel) as E;
const RING_LENGTH = 138.2;
const KEY_STIR_SPEED = 9.4; // radians per second, about 1.5 turns
const WAITING = 3;
const RESULT_SECONDS = 4.5;

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

/** Short description of a finished drink, for its name tag on the tray. */
function describe(d: Drink): string {
  const parts = [d.base ? BASE[d.base].n : 'ไม่มีน้ำฐาน', ...ADD_IDS.filter((k) => d.milk[k]).map((k) => ADD[k] + (d.milk[k] > 1 ? ` ×${d.milk[k]}` : ''))];
  return `${parts.join(' + ')}${d.garnish === 'straw' ? ' · มีหลอด' : ''}`;
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

  let drink = blankDrink();
  let money = 0;
  let servedCount = 0;
  /** Customers waiting at the cart; each card shows one. */
  const waiting: Order[] = [];
  /** Finished drinks hanging on the hooks, by slot. */
  const tray: ({ drink: Drink; item: TableItem } | null)[] = HANG_SLOTS.map(() => null);
  let resultTimer = 0;

  let stirring = false;
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

  /** Keeps each done button just in front of the glass it belongs to. */
  function pinButton(button: HTMLElement, at: T.Vector3): void {
    if (button.hidden) return;
    const p = stage.screenPoint(at.x, at.y, at.z + 1.05);
    button.style.left = `${p.x * 100}%`;
    button.style.top = `${p.y * 100}%`;
  }

  function nextHint(): string {
    if (stirring) return drink.mix >= 1 ? 'เข้ากันดีแล้ว กดปุ่มใต้แก้วเพื่อวางช้อน' : 'หมุนเมาส์เป็นวงรอบแก้วตวง ยิ่งหมุนเร็ว ยิ่งเสร็จไว หรือกดปุ่ม S ค้างไว้';
    if (!drink.poured) {
      if (!drink.base) {
        return trayCount()
          ? 'ลากถุงที่แขวนรอส่งมุมขวาบนไปวางบนตั๋วของลูกค้าที่สั่ง หรือเริ่มชงแก้วใหม่'
          : 'เลือกออเดอร์ทางซ้าย แล้วลากน้ำฐานมาใส่แก้วตวง';
      }
      if (BREWED.includes(drink.base) && !drink.milk.hot) return 'ชา กาแฟ ต้องชงกับน้ำร้อน ลากกาน้ำร้อนด้านซ้ายมาเทลงแก้วตวง';
      if (drink.mix < 1) return 'เติมส่วนผสมตามสูตร แล้วลากช้อนข้างนมข้นมาใส่แก้วตวงเพื่อคน';
      if (!drink.vessel) return 'กดที่ถังแช่สีแดงมุมขวาเพื่อเปิดฝา แล้วลากแก้วหรือถุงหิ้วมาวางข้างแก้วตวง';
      return 'ลากแก้วตวงไปเทลงภาชนะ';
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
    if (drink.garnish !== 'none') extras.push(GARNISH[drink.garnish]);
    extras.push(`แขวนรอส่ง ${trayCount()}/${HANG_SLOTS.length}`);
    lines.push(extras.join(' · '));
    contents.textContent = lines.join('\n');
    if (!stirring) say(nextHint());
    finishBtn.hidden = !drink.poured || stage.pouring;
    resetBtn.hidden = !parts.length && !drink.vessel && drink.garnish === 'none';
    spoonBtn.hidden = !stirring;
    stirBox.hidden = !stirring;
  }

  function updateStirUI(): void {
    $('#ring-fg').setAttribute('stroke-dashoffset', String(RING_LENGTH * (1 - drink.mix)));
    $('#stir-pct').textContent = `${Math.round(drink.mix * 100)}%`;
    $('#stir-speed').textContent = Math.abs(turnRate).toFixed(1);
    $('#stir-time').textContent = stirTime.toFixed(1);
    say(nextHint());
  }

  function stopStirring(): void {
    if (!stirring) return;
    stirring = false;
    turnRate = 0;
    stage.setSpoon(false);
    table.enabled = true;
    const spoon = table.find('spoon', 'spoon');
    if (spoon) table.sendHome(spoon);
    updateHud();
  }

  const aboveCup = (y: number) => new T.Vector3(CUP_HOME.x - 0.75, y, CUP_HOME.z);
  const aboveServe = (y: number) => new T.Vector3(SERVE_HOME.x, y, SERVE_HOME.z);

  /** The order card under a screen point, if any. */
  function cardAt(clientX: number, clientY: number): HTMLElement | null {
    for (const e of document.elementsFromPoint(clientX, clientY)) {
      const card = (e as HTMLElement).closest<HTMLElement>('.order');
      if (card) return card;
    }
    return null;
  }

  const rules: TableRules = {
    canPick(item) {
      if (stage.pouring) return false;
      if (item.kind === 'glass') return !drink.poured;
      return true;
    },
    targets(item) {
      switch (item.kind) {
        case 'base':
        case 'add':
        case 'spoon':
          return drink.poured ? [] : ['cup'];
        case 'glass':
          return drink.vessel ? ['serve'] : [];
        case 'vessel':
          return drink.poured ? [] : ['serve'];
        case 'garnish':
          return drink.vessel ? ['serve'] : [];
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
        const k = item.key as AddId;
        if (drink.milk[k] >= MAX_PER_ADDITION) {
          say(`ใส่${ADD[k]}ครบ ${MAX_PER_ADDITION} ส่วนแล้ว`);
          return null;
        }
        drink.milk[k]++;
        drink.mix *= 0.4;
        stage.pour(k === 'hot' || k === 'soda' ? '#e6f3f6' : k === 'syrup' ? '#f3e2b0' : k === 'lemon' ? '#efe48a' : '#f8e7cc');
        act = { pos: aboveCup(3), tilt: -1.15, seconds: 0.9 };
      } else if (item.kind === 'spoon') {
        stirring = true;
        table.enabled = false;
        lastPointerAngle = null;
        stage.setSpoon(true);
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
      } else if (item.kind === 'garnish') {
        drink.garnish = 'straw';
        act = { pos: aboveServe(3.1), tilt: 0, seconds: 0.4 };
      }
      if (item.kind !== 'vessel' && item.kind !== 'glass') stage.applyDrink(drink, false);
      else if (item.kind === 'vessel') stage.applyDrink(drink, true);
      updateHud();
      return act;
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
      if (!card || !entry) {
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

  /** Picks a customer who isn't already waiting, when there are enough to choose from. */
  function newOrder(): Order {
    const free = ORDERS.filter((o) => !waiting.includes(o));
    const pool = free.length ? free : ORDERS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** Ticket photos are rendered once per order and reused. */
  const thumbs = new Map<Order, string>();
  function thumbFor(o: Order): void {
    if (!thumbs.has(o)) thumbs.set(o, stage.snapOrder(o, drink));
  }

  function renderOrders(fresh = -1): void {
    ordersEl.textContent = '';
    waiting.forEach((o, i) => {
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
      text.append(el('div', { className: 'name', text: `${o.name} · ${VESSEL_ASK[o.vessel]}` }), who, el('div', { className: 'recipe', text: `สูตร: ${recipeOf(o)}` }));
      card.append(img, text);
      ordersEl.append(card);
    });
  }

  function showResult(o: Order, r: ReturnType<typeof score>): void {
    resultCard.textContent = '';
    const list = el('ul', { id: 'breakdown' });
    r.rows.forEach((row) => {
      const li = el('li');
      li.append(el('span', { text: row.label }), el('b', { text: `${row.got}/${row.max}` }));
      list.append(li);
    });
    resultCard.append(el('div', { id: 'verdict', text: r.verdict }), el('div', { id: 'earn', text: `${o.who} · ${r.pay ? `+${r.pay} บาท` : 'ไม่ได้เงิน'}` }), list);
    resultCard.hidden = false;
    clearTimeout(resultTimer);
    resultTimer = window.setTimeout(() => (resultCard.hidden = true), RESULT_SECONDS * 1000);
  }

  function handOver(orderSlot: number, given: Drink): void {
    const o = waiting[orderSlot];
    const r = score(given, o);
    money += r.pay;
    servedCount++;
    $('#money-n').textContent = String(money);
    $('#order-no').textContent = String(servedCount);
    showResult(o, r);
    waiting[orderSlot] = newOrder();
    thumbFor(waiting[orderSlot]);
    renderOrders(orderSlot);
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
    const slot = tray.indexOf(null);
    if (slot < 0) {
      say('ตะขอแขวนรอส่งเต็มแล้ว ส่งถุงให้ลูกค้าก่อน');
      return;
    }
    stopStirring();
    stage.setVessel(drink.vessel, true);
    const item = table.addReady(stage.bakeServing(), slot, VESSEL[drink.vessel]);
    tray[slot] = { drink: { ...drink, milk: { ...drink.milk } }, item };
    clearDrink();
  }

  function stirFrame(dt: number): void {
    if (!stirring) {
      pendingAngle = 0;
      return;
    }
    let raw = pendingAngle / Math.max(dt, 0.001);
    spoonAngle += pendingAngle;
    pendingAngle = 0;
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

  stageEl.addEventListener('pointermove', (e) => {
    const r = stageEl.getBoundingClientRect();
    mouseX = (e.clientX - r.left) / r.width - 0.5;
    mouseY = (e.clientY - r.top) / r.height - 0.5;
    if (!stirring) {
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
  // The first customer always wants the Thai iced tea; the rest arrive at random.
  waiting.push(ORDERS[0]);
  while (waiting.length < WAITING) waiting.push(newOrder());
  waiting.forEach(thumbFor);
  renderOrders();
  stage.layout();
  stage.applyDrink(drink, true);
  updateHud();

  let last = performance.now();
  let elapsed = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    stirFrame(dt);
    table.update(dt, elapsed);
    pinButton(finishBtn, SERVE_HOME);
    pinButton(spoonBtn, CUP_HOME);
    if (stage.update(dt, elapsed, mouseX, mouseY)) updateHud();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
