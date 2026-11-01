import { drawGarland } from './art';
import {
  ADD,
  ADD_IDS,
  BASE,
  GARNISH,
  ICE,
  MAX_PER_ADDITION,
  ORDERS,
  STEPS,
  STIR_MAX,
  STIR_TURNS,
  VESSEL,
  blankDrink,
  noAdditions,
  recipeOf,
  score,
  sweetWord,
  type AddId,
  type BaseId,
  type GarnishId,
  type IceId,
  type Order,
  type StepId,
  type VesselId,
} from './data';
import type { DrinkStage } from './stage';

const $ = <E extends Element = HTMLElement>(sel: string) => document.querySelector<E>(sel) as E;
const RING_LENGTH = 276.46;
const PHONE_WIDTH = 760;
const KEY_STIR_SPEED = 9.4; // radians per second, about 1.5 turns

interface Card {
  key: string;
  label: string;
  img: string;
  selected?: boolean;
  count?: number;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: { id?: string; className?: string; text?: string } = {}) {
  const e = document.createElement(tag);
  if (props.id) e.id = props.id;
  if (props.className) e.className = props.className;
  if (props.text !== undefined) e.textContent = props.text;
  return e;
}

function button(className: string, text: string, onClick?: () => void, id?: string) {
  const b = el('button', { className, text, id });
  b.type = 'button';
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

function avatarSvg(o: Order): string {
  return `<svg viewBox="0 0 46 46" width="100%" height="100%"><rect width="46" height="46" fill="#ffeecb"/><path d="M6 46c1-11 8-15 17-15s16 4 17 15z" fill="${o.top}"/><circle cx="23" cy="21" r="11" fill="${o.skin}"/><path d="M11 21c-1-10 6-15 12-15s13 5 12 15c-3-6-8-8-12-8s-9 2-12 8z" fill="${o.hair}"/><circle cx="19" cy="22" r="1.4" fill="#231a14"/><circle cx="27" cy="22" r="1.4" fill="#231a14"/><path d="M19.5 26.5q3.5 3 7 0" stroke="#7a3b22" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`;
}

export function startGame(stage: DrinkStage): void {
  const stageEl = $('#stage');
  const panel = $('#panel');
  const foot = $('#foot');
  const garland = $<HTMLCanvasElement>('#garland');
  const icons = stage.buildIcons();

  let drink = blankDrink();
  let step = 0;
  let orderIdx = 0;
  let orderNo = 1;
  let money = 0;
  let served = false;

  let stirTime = 0;
  let turnRate = 0;
  let spoonAngle = 0;
  let lastPointerAngle: number | null = null;
  let pendingAngle = 0;
  let keyStir = false;
  let mouseX = 0;
  let mouseY = 0;

  const stepId = (): StepId => STEPS[step].id;
  const relayout = () => requestAnimationFrame(() => stage.layout());

  function renderOrder(): void {
    const o = ORDERS[orderIdx];
    $('#order-name').textContent = `${o.name} · ${o.vessel === 'bag' ? 'ใส่ถุง' : 'ใส่แก้ว'}`;
    $('#quote').textContent = `${o.who}: ${o.quote}`;
    $('#recipe').textContent = `สูตร: ${recipeOf(o)}`;
    $('#avatar').innerHTML = avatarSvg(o);
    $<HTMLImageElement>('#target').src = stage.snapOrder(o, drink);
    $('#order-no').textContent = String(orderNo);
  }

  function cardsFor(id: StepId): Card[] {
    switch (id) {
      case 'base':
        return (Object.keys(BASE) as BaseId[]).map((k) => ({ key: k, label: BASE[k].n, img: icons[k], selected: drink.base === k }));
      case 'milk':
        return [
          ...ADD_IDS.map((k) => ({ key: k as string, label: ADD[k], img: icons[k], count: drink.milk[k] })),
          { key: 'dump', label: 'ล้างที่เติม', img: icons.dump },
        ];
      case 'vessel':
        return (Object.keys(VESSEL) as VesselId[]).map((k) => ({ key: k, label: VESSEL[k], img: icons[`v_${k}`], selected: drink.vessel === k }));
      case 'ice':
        return (Object.keys(ICE) as IceId[]).map((k) => ({ key: k, label: ICE[k].n, img: icons[`i_${k}`], selected: drink.ice === k }));
      case 'garnish':
        return (Object.keys(GARNISH) as GarnishId[]).map((k) => ({ key: k, label: GARNISH[k], img: icons[`g_${k}`], selected: drink.garnish === k }));
      case 'stir':
        return [];
    }
  }

  function backButton(): HTMLButtonElement {
    return button('ghost', 'ย้อนกลับ', () => {
      step--;
      renderPanel();
    });
  }

  function renderPanel(): void {
    panel.textContent = '';
    foot.textContent = '';
    stage.setSpoon(!served && stepId() === 'stir');
    if (served) {
      renderResult();
      relayout();
      return;
    }
    const st = STEPS[step];
    const dots = el('div', { id: 'dots' });
    STEPS.forEach((_, i) => dots.append(el('i', { className: i <= step ? 'on' : '' })));
    const title = el('div', { id: 'step-title', text: st.title });

    if (st.id === 'stir') {
      const box = el('div', { id: 'stir' });
      box.innerHTML = `<svg id="ring" viewBox="0 0 110 110" role="img" aria-label="ความเข้ากันของเครื่องดื่ม"><circle cx="55" cy="55" r="44" fill="none" stroke="#3a2212" stroke-width="10"/><circle id="ring-fg" cx="55" cy="55" r="44" fill="none" stroke="#f2c14e" stroke-width="10" stroke-linecap="round" stroke-dasharray="${RING_LENGTH}" transform="rotate(-90 55 55)"/><text id="stir-pct" x="55" y="63" text-anchor="middle">0%</text></svg><div id="stir-stats"><div>ความเร็ว<b id="stir-speed">0.0</b>รอบ/วินาที</div><div>เวลาที่ใช้<b id="stir-time">0.0</b>วินาที</div></div><div id="stir-msg"></div>`;
      panel.append(dots, title, box);
      foot.append(backButton(), button('pill', 'ขั้นต่อไป', () => {
        step++;
        renderPanel();
      }, 'next'));
      updateStirUI();
      relayout();
      return;
    }

    const grid = el('div', { id: 'grid' });
    const cards = cardsFor(st.id);
    const phoneCols = cards.length === 6 ? 3 : cards.length === 2 ? 2 : 4;
    grid.style.setProperty('--cols', String(innerWidth < PHONE_WIDTH ? phoneCols : 2));
    cards.forEach((c) => {
      const b = button(`card${c.selected ? ' sel' : ''}`, '', () => choose(st.id, c.key), `card-${st.id}-${c.key}`);
      const img = el('img');
      img.src = c.img;
      img.alt = '';
      b.append(img, el('span', { text: c.label }));
      if (c.count) b.append(el('em', { text: `×${c.count}` }));
      grid.append(b);
    });
    const hint = el('div', { id: 'hint', text: st.id === 'milk' ? `ความหวาน: ${sweetWord(drink.milk)} · กดซ้ำเพื่อเติมอีก` : st.hint });
    panel.append(dots, title, grid, hint);

    if (stage.phase === 'pouring') {
      foot.append(button('pill', 'กำลังเท'));
      relayout();
      return;
    }
    if (step > 0 && st.id !== 'ice') foot.append(backButton());
    const nextLabel = st.id === 'vessel' ? 'เทลงภาชนะ' : step < STEPS.length - 1 ? 'ขั้นต่อไป' : 'ชงเสร็จ เสิร์ฟเลย';
    foot.append(button('pill', nextLabel, () => {
      if (st.id === 'base' && !drink.base) {
        hint.textContent = 'เทน้ำฐานก่อน แล้วค่อยไปขั้นต่อไป';
        return;
      }
      if (st.id === 'vessel') {
        if (!drink.vessel) {
          hint.textContent = 'เลือกแก้วหรือถุงก่อน แล้วค่อยเท';
          return;
        }
        startPour();
        return;
      }
      if (step < STEPS.length - 1) {
        step++;
        renderPanel();
      } else {
        serve();
      }
    }, 'next'));
    relayout();
  }

  function choose(id: StepId, key: string): void {
    if (stage.phase === 'pouring') return;
    if (id === 'vessel') drink.vessel = key as VesselId;
    if (id === 'base') {
      drink.base = key as BaseId;
      drink.mix *= 0.4;
      stage.pour(BASE[key as BaseId].stream);
    }
    if (id === 'milk') {
      if (key === 'dump') {
        drink.milk = noAdditions();
      } else {
        const k = key as AddId;
        if (drink.milk[k] >= MAX_PER_ADDITION) return;
        drink.milk[k]++;
        drink.mix *= 0.4;
        stage.pour('#f8e7cc');
      }
    }
    if (id === 'ice') drink.ice = key as IceId;
    if (id === 'garnish') drink.garnish = key as GarnishId;
    stage.applyDrink(drink, false);
    renderPanel();
    document.getElementById(`card-${id}-${key}`)?.focus({ preventScroll: true });
  }

  function updateStirUI(): void {
    const ring = document.getElementById('ring-fg');
    if (!ring) return;
    ring.setAttribute('stroke-dashoffset', String(RING_LENGTH * (1 - drink.mix)));
    $('#stir-pct').textContent = `${Math.round(drink.mix * 100)}%`;
    $('#stir-speed').textContent = Math.abs(turnRate).toFixed(1);
    $('#stir-time').textContent = stirTime.toFixed(1);
    $('#stir-msg').textContent = drink.mix >= 1
      ? 'เข้ากันดีแล้ว ไปเลือกภาชนะได้เลย'
      : innerWidth < PHONE_WIDTH
        ? 'ลากนิ้วเป็นวงรอบแก้ว ยิ่งหมุนเร็ว ยิ่งเสร็จไว'
        : 'หมุนเมาส์เป็นวงรอบแก้ว ยิ่งหมุนเร็ว ยิ่งเสร็จไว หรือกดปุ่ม S ค้างไว้';
  }

  function startPour(): void {
    if (!drink.vessel) return;
    turnRate = 0;
    stage.startPour({ ...drink, vessel: drink.vessel });
    renderPanel();
  }

  function serve(): void {
    if (!drink.vessel) return;
    served = true;
    stage.setVessel(drink.vessel, true);
    money += score(drink, ORDERS[orderIdx]).pay;
    $('#money-n').textContent = String(money);
    renderPanel();
  }

  function renderResult(): void {
    const r = score(drink, ORDERS[orderIdx]);
    const box = el('div', { id: 'result' });
    const list = el('ul', { id: 'breakdown' });
    r.rows.forEach((row) => {
      const li = el('li');
      li.append(el('span', { text: row.label }), el('b', { text: `${row.got}/${row.max}` }));
      list.append(li);
    });
    box.append(el('div', { id: 'verdict', text: r.verdict }), el('div', { id: 'earn', text: r.pay ? `+${r.pay} บาท` : 'ไม่ได้เงิน' }), list);
    panel.append(box);
    foot.append(button('pill', 'รับออเดอร์ถัดไป', nextOrder, 'next'));
  }

  function nextOrder(): void {
    // Any order except the one just served.
    orderIdx = (orderIdx + 1 + Math.floor(Math.random() * (ORDERS.length - 1))) % ORDERS.length;
    orderNo++;
    drink = blankDrink();
    step = 0;
    served = false;
    stirTime = 0;
    turnRate = 0;
    stage.phase = 'cup';
    stage.setGarnish('none', true);
    stage.syncVessels();
    stage.applyDrink(drink, true);
    renderOrder();
    renderPanel();
  }

  function stirFrame(dt: number): void {
    if (stage.phase !== 'cup' || served || stepId() !== 'stir') {
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
    }
    updateStirUI();
  }

  stageEl.addEventListener('pointermove', (e) => {
    const r = stageEl.getBoundingClientRect();
    mouseX = (e.clientX - r.left) / r.width - 0.5;
    mouseY = (e.clientY - r.top) / r.height - 0.5;
    if (stage.phase !== 'cup' || served || stepId() !== 'stir') {
      lastPointerAngle = null;
      return;
    }
    const c = stage.cupScreenPoint();
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
    renderPanel();
  });

  drawGarland(garland);
  renderOrder();
  renderPanel();
  stage.layout();
  stage.applyDrink(drink, true);

  let last = performance.now();
  let elapsed = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    stirFrame(dt);
    if (stage.update(dt, elapsed, mouseX, mouseY)) {
      step = STEPS.findIndex((s) => s.id === 'ice');
      renderPanel();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
