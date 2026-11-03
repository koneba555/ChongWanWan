import * as T from 'three';
import { drawGarland } from './art';
import {
  ADD,
  ADD_IDS,
  BASE,
  GARNISH,
  ICE,
  ICE_STEPS,
  MAX_PER_ADDITION,
  ORDERS,
  STIR_MAX,
  STIR_TURNS,
  VESSEL,
  blankDrink,
  recipeOf,
  score,
  sweetWord,
  type AddId,
  type BaseId,
  type GarnishId,
  type Order,
  type VesselId,
} from './data';
import { CUP_HOME, SERVE_HOME, type DrinkStage } from './stage';
import { Table, type DropTarget, type TableItem, type TableRules } from './table';

const $ = <E extends Element = HTMLElement>(sel: string) => document.querySelector<E>(sel) as E;
const RING_LENGTH = 138.2;
const KEY_STIR_SPEED = 9.4; // radians per second, about 1.5 turns

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: { id?: string; text?: string } = {}) {
  const e = document.createElement(tag);
  if (props.id) e.id = props.id;
  if (props.text !== undefined) e.textContent = props.text;
  return e;
}

function avatarSvg(o: Order): string {
  return `<svg viewBox="0 0 46 46" width="100%" height="100%"><rect width="46" height="46" fill="#ffeecb"/><path d="M6 46c1-11 8-15 17-15s16 4 17 15z" fill="${o.top}"/><circle cx="23" cy="21" r="11" fill="${o.skin}"/><path d="M11 21c-1-10 6-15 12-15s13 5 12 15c-3-6-8-8-12-8s-9 2-12 8z" fill="${o.hair}"/><circle cx="19" cy="22" r="1.4" fill="#231a14"/><circle cx="27" cy="22" r="1.4" fill="#231a14"/><path d="M19.5 26.5q3.5 3 7 0" stroke="#7a3b22" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`;
}

export function startGame(stage: DrinkStage): void {
  const stageEl = $('#stage');
  const canvas = $<HTMLCanvasElement>('#gl');
  const garland = $<HTMLCanvasElement>('#garland');
  const contents = $('#contents');
  const hint = $('#hint');
  const stirBox = $('#stir');
  const serveBtn = $<HTMLButtonElement>('#serve');
  const resetBtn = $<HTMLButtonElement>('#reset');
  const spoonBtn = $<HTMLButtonElement>('#spoon-done');
  const resultCard = $('#result-card');

  let drink = blankDrink();
  let orderIdx = 0;
  let orderNo = 1;
  let money = 0;
  let served = false;

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

  function nextHint(): string {
    if (served) return 'เสิร์ฟแล้ว กดรับออเดอร์ถัดไปได้เลย';
    if (stirring) return drink.mix >= 1 ? 'เข้ากันดีแล้ว กดวางช้อนได้เลย' : 'หมุนเมาส์เป็นวงรอบแก้วตวง ยิ่งหมุนเร็ว ยิ่งเสร็จไว หรือกดปุ่ม S ค้างไว้';
    if (!drink.poured) {
      if (!drink.base) return 'เอาเมาส์ชี้ของบนชั้นเพื่อดูชื่อ แล้วลากน้ำฐานมาใส่แก้วตวง';
      if (drink.mix < 1) return 'เติมส่วนผสมตามสูตร แล้วลากช้อนมาใส่แก้วตวงเพื่อคน';
      if (!drink.vessel) return 'ลากแก้วพลาสติกหรือถุงมาวางบนวงทองด้านขวา';
      return 'ลากแก้วตวงไปเทลงภาชนะ';
    }
    return 'ลากน้ำแข็งและของแต่งมาใส่ภาชนะ แล้วกดเสิร์ฟ';
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
    if (drink.vessel) extras.push(VESSEL[drink.vessel]);
    if (drink.ice !== 'none') extras.push(`น้ำแข็ง${ICE[drink.ice].n}`);
    if (drink.garnish !== 'none') extras.push(GARNISH[drink.garnish]);
    if (parts.length) extras.unshift(`คนแล้ว ${Math.round(drink.mix * 100)}%`);
    if (extras.length) lines.push(extras.join(' · '));
    contents.textContent = lines.join('\n');
    if (!stirring) say(nextHint());
    serveBtn.hidden = !drink.poured || stage.pouring || served;
    resetBtn.hidden = served || (!parts.length && !drink.vessel && drink.ice === 'none' && drink.garnish === 'none');
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

  const rules: TableRules = {
    canPick(item) {
      if (served || stage.pouring) return false;
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
        case 'ice':
        case 'garnish':
          return drink.vessel ? ['serve'] : [];
      }
    },
    drop(item: TableItem, target: DropTarget) {
      if (!rules.targets(item).includes(target)) return null;
      let act: ReturnType<TableRules['drop']> = null;
      if (item.kind === 'base') {
        drink.base = item.key as BaseId;
        drink.mix *= 0.4;
        stage.pour(BASE[drink.base].stream);
        act = { pos: aboveCup(3), tilt: -1.15, seconds: 0.9 };
      } else if (item.kind === 'add') {
        const k = item.key as AddId;
        if (drink.milk[k] >= MAX_PER_ADDITION) {
          say(`ใส่${ADD[k]}ครบ ${MAX_PER_ADDITION} ส่วนแล้ว`);
          return null;
        }
        drink.milk[k]++;
        drink.mix *= 0.4;
        stage.pour('#f8e7cc');
        act = { pos: aboveCup(3), tilt: -1.15, seconds: 0.9 };
      } else if (item.kind === 'spoon') {
        stirring = true;
        table.enabled = false;
        lastPointerAngle = null;
        stage.setSpoon(true);
        act = { pos: new T.Vector3(), tilt: 0, seconds: 0, hide: true };
      } else if (item.kind === 'vessel') {
        drink.vessel = item.key as VesselId;
        stage.showVessel(drink.vessel);
      } else if (item.kind === 'glass') {
        if (!drink.base) {
          say('แก้วตวงยังไม่มีน้ำ เทน้ำฐานก่อน');
          return null;
        }
        drink.poured = true;
        stage.startPour(drink);
      } else if (item.kind === 'ice') {
        const at = ICE_STEPS.indexOf(drink.ice);
        drink.ice = ICE_STEPS[Math.min(ICE_STEPS.length - 1, at + 1)];
        act = { pos: aboveServe(3.1), tilt: -0.5, seconds: 0.5 };
      } else if (item.kind === 'garnish') {
        drink.garnish = item.key as GarnishId;
        act = { pos: aboveServe(3.1), tilt: 0, seconds: 0.4 };
      }
      if (item.kind !== 'vessel' && item.kind !== 'glass') stage.applyDrink(drink, false);
      else if (item.kind === 'vessel') stage.applyDrink(drink, true);
      updateHud();
      return act;
    },
    tagExtra(item) {
      if (item.kind === 'add' && drink.milk[item.key as AddId]) return `×${drink.milk[item.key as AddId]}`;
      if (item.kind === 'ice' && drink.ice !== 'none') return `(${ICE[drink.ice].n})`;
      return '';
    },
  };

  const table = new Table(stage, stageEl, canvas, $('#tag'), rules);

  function renderOrder(): void {
    const o = ORDERS[orderIdx];
    $('#order-name').textContent = `${o.name} · ${o.vessel === 'bag' ? 'ใส่ถุง' : 'ใส่แก้ว'}`;
    $('#quote').textContent = `${o.who}: ${o.quote}`;
    $('#recipe').textContent = `สูตร: ${recipeOf(o)}`;
    $('#avatar').innerHTML = avatarSvg(o);
    $<HTMLImageElement>('#target').src = stage.snapOrder(o, drink);
    $('#order-no').textContent = String(orderNo);
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

  function serve(): void {
    if (!drink.vessel || !drink.poured) return;
    served = true;
    stopStirring();
    stage.setVessel(drink.vessel, true);
    const r = score(drink, ORDERS[orderIdx]);
    money += r.pay;
    $('#money-n').textContent = String(money);
    resultCard.textContent = '';
    const list = el('ul', { id: 'breakdown' });
    r.rows.forEach((row) => {
      const li = el('li');
      li.append(el('span', { text: row.label }), el('b', { text: `${row.got}/${row.max}` }));
      list.append(li);
    });
    const next = el('button', { id: 'next', text: 'รับออเดอร์ถัดไป' });
    next.type = 'button';
    next.className = 'pill';
    next.addEventListener('click', nextOrder);
    resultCard.append(el('div', { id: 'verdict', text: r.verdict }), el('div', { id: 'earn', text: r.pay ? `+${r.pay} บาท` : 'ไม่ได้เงิน' }), list, next);
    resultCard.hidden = false;
    updateHud();
  }

  function nextOrder(): void {
    // Any order except the one just served.
    orderIdx = (orderIdx + 1 + Math.floor(Math.random() * (ORDERS.length - 1))) % ORDERS.length;
    orderNo++;
    served = false;
    resultCard.hidden = true;
    clearDrink();
    renderOrder();
    updateHud();
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
  serveBtn.addEventListener('click', serve);
  resetBtn.addEventListener('click', clearDrink);
  spoonBtn.addEventListener('click', stopStirring);

  drawGarland(garland);
  renderOrder();
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
    if (stage.update(dt, elapsed, mouseX, mouseY)) updateHud();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
