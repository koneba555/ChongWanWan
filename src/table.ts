import * as T from 'three';
import { ADD, ADD_IDS, BASE, GARNISH, VESSEL, type AddId, type BaseId, type VesselId } from './data';
import { makeBottle, makeCan, makeCarryBag, makeCooler, makeGarnish, makeHookRail, makeHotPot, makePlate, makeSodaBottle, makeTableSpoon, makeTin, makeUtensilCup, makeVesselStack } from './models';
import { buildShell, CUP_HOME, SERVE_HOME, type DrinkStage } from './stage';

export type ItemKind = 'base' | 'add' | 'garnish' | 'vessel' | 'spoon' | 'glass' | 'cooler' | 'ready';
export type DropTarget = 'cup' | 'serve';

export interface TableItem {
  kind: ItemKind;
  key: string;
  label: string;
  root: T.Object3D;
  home: T.Vector3;
  /** Height of the item above its root, for placing the name tag. */
  height: number;
  scale: number;
  hover: number;
  state: 'idle' | 'held' | 'acting' | 'hidden';
  actT: number;
  actPos: T.Vector3;
  actTilt: number;
  actSeconds: number;
  proxy: T.Mesh;
}

export interface TableRules {
  /** False when the item can't be picked up right now, for example while pouring. */
  canPick(item: TableItem): boolean;
  /** Which spots the item may be put on, used to light up the rings. */
  targets(item: TableItem): DropTarget[];
  /** Applies the drop. Returns how the item should act out, or null to send it straight home. */
  drop(item: TableItem, target: DropTarget): { pos: T.Vector3; tilt: number; seconds: number; hide?: boolean } | null;
  /** Extra text for the name tag, such as how many are in the glass. */
  tagExtra(item: TableItem): string;
  /** Hands a finished drink to whichever order card is under the pointer. False sends it back to the tray. */
  deliver(item: TableItem, clientX: number, clientY: number): boolean;
  /** Lets the order card under a carried drink light up. */
  aim(clientX: number, clientY: number): void;
}

const SHELF_Y = 0.95;
const SHELF_Z = -2.7;
const HOLD_PLANE = new T.Plane(new T.Vector3(0, 0, 1), -0.2);
/** How far from a spot, as a share of the screen height, a drop still lands on it. */
const DROP_REACH = 0.17;
const CLICK_DRIFT = 6;
/** The cooler stands on the floor at the front right, big and partly out of frame. */
const COOLER_AT = new T.Vector3(5.2, -0.9, 3.3);
const COOLER_SCALE = 1.9;
/** Spots on the tray where finished drinks wait to be handed over. */
/** Finished drinks hang in carry bags from S hooks on a rail at the top right. */
const RAIL_Y = 3.35;
const HOOK_DROP = 0.42;
export const HANG_SLOTS = [3.85, 4.9, 5.95].map((x) => new T.Vector3(x, RAIL_Y - HOOK_DROP, -2.2));
const HANG_SCALE = 0.42;
/** Hot water pot on its plate, where the waiting tray used to be. */
const HOT_POT = new T.Vector3(-3.55, 0.07, 0.9);
/** Cup by the condensed milk that the spoon and straw stand in. */
const UTENSIL_CUP = new T.Vector3(2.75, 0.02, -1.3);
const LID_OPEN = -1.95;

const hitMaterial = new T.MeshBasicMaterial({ visible: false });

const BASE_MODELS: Record<BaseId, () => T.Object3D> = {
  tea: () => makeTin('ชาไทย', '#d9601a', '#fff3df'),
  black: () => makeTin('ชาดำ', '#5a2410', '#f6d9a8'),
  green: () => makeTin('ชาเขียว', '#5f9b2a', '#f4f7e0'),
  coffee: () => makeTin('กาแฟ', '#3a2013', '#f3d9a4'),
  pea: () => makeBottle('อัญชัน', '#2a3cc4'),
  red: () => makeBottle('น้ำแดง', '#d6243c'),
};
const ADD_MODELS: Record<AddId, () => T.Object3D> = {
  cond: () => makeCan('นมข้น', '#f4ecd8', '#1d5aa8'),
  evap: () => makeCan('นมระเหย', '#c8342f', '#fff'),
  syrup: () => makeBottle('น้ำเชื่อม', '#e8c77a'),
  soda: makeSodaBottle,
  hot: makeHotPot,
  lemon: () => makeBottle('มะนาว', '#cfdc4a'),
};

export class Table {
  readonly items: TableItem[] = [];
  private hovered: TableItem | null = null;
  private held: TableItem | null = null;
  private heldTarget: DropTarget | null = null;
  private pressX = 0;
  private pressY = 0;
  private dragged = false;
  private clientX = 0;
  private clientY = 0;
  private pointerX = 0;
  private pointerY = 0;
  private readonly raycaster = new T.Raycaster();
  private readonly holdPoint = new T.Vector3(0, 2.4, 0.2);
  enabled = true;
  private coolerOpen = false;
  private coolerLid: T.Group | null = null;

  constructor(
    private readonly stage: DrinkStage,
    private readonly stageEl: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly tagEl: HTMLElement,
    private readonly rules: TableRules,
  ) {
    this.setOut();
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    addEventListener('pointermove', (e) => this.onMove(e));
    addEventListener('pointerup', () => this.onUp());
  }

  private add(kind: ItemKind, key: string, label: string, model: T.Object3D, x: number, y: number, z: number, scale: number): TableItem {
    const root = new T.Group();
    root.add(model);
    root.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(model);
    const size = box.getSize(new T.Vector3());
    const center = box.getCenter(new T.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;
    const home = new T.Vector3(x, y, z);
    root.position.copy(home);
    root.scale.setScalar(scale);
    // The hit area hugs each item, with a minimum so thin things like the straw can still be grabbed.
    const reach = 0.3 / scale;
    const proxy = new T.Mesh(new T.BoxGeometry(size.x + 0.15 / scale, Math.max(size.y, reach) + 0.1 / scale, Math.max(size.z, reach) + 0.1 / scale), hitMaterial);
    proxy.position.y = size.y / 2;
    root.add(proxy);
    this.stage.tableG.add(root);
    const item = this.makeItem(kind, key, label, root, home, size.y * scale, scale, proxy);
    this.items.push(item);
    return item;
  }

  /** Bags a finished drink and hangs it on a hook. */
  addReady(model: T.Object3D, slot: number, label: string): TableItem {
    const at = HANG_SLOTS[slot];
    const item = this.add('ready', String(slot), label, makeCarryBag(model), at.x, 0, at.z, HANG_SCALE);
    // The bag's handles reach the bottom of the hook.
    item.home.y = at.y - item.height;
    item.root.position.y = item.home.y;
    return item;
  }

  removeItem(item: TableItem): void {
    item.root.removeFromParent();
    this.items.splice(this.items.indexOf(item), 1);
    if (this.hovered === item) this.hovered = null;
  }

  private makeItem(kind: ItemKind, key: string, label: string, root: T.Object3D, home: T.Vector3, height: number, scale: number, proxy: T.Mesh): TableItem {
    return { kind, key, label, root, home, height, scale, hover: 0, state: 'idle', actT: 0, actPos: new T.Vector3(), actTilt: 0, actSeconds: 0, proxy };
  }

  /** Sets every ingredient out on the shelf and table. */
  private setOut(): void {
    (Object.keys(BASE) as BaseId[]).forEach((k, i) => this.add('base', k, BASE[k].n, BASE_MODELS[k](), -2.85 + i * 1.14, SHELF_Y, SHELF_Z, 0.8));
    // Everything stays off the mat, in a group on each side of the glasses.
    const addAt: Record<AddId, [number, number]> = { soda: [-2.75, -1.5], syrup: [-3.6, -1.5], lemon: [-4.45, -1.5], cond: [3.45, -1.5], evap: [4.25, -1.5], hot: [HOT_POT.x, HOT_POT.z] };
    ADD_IDS.forEach((k) => this.add('add', k, ADD[k], ADD_MODELS[k](), addAt[k][0], k === 'hot' ? HOT_POT.y : 0.02, addAt[k][1], k === 'hot' ? 0.8 : 0.72));

    const holder = makeUtensilCup();
    holder.position.copy(UTENSIL_CUP);
    this.stage.tableG.add(holder);
    const spoon = makeTableSpoon();
    spoon.rotation.z = -Math.PI / 2;
    this.add('spoon', 'spoon', 'ช้อนคน', spoon, UTENSIL_CUP.x - 0.1, UTENSIL_CUP.y + 0.08, UTENSIL_CUP.z, 0.68);
    this.add('garnish', 'straw', GARNISH.straw, makeGarnish('straw', 'cup'), UTENSIL_CUP.x + 0.12, UTENSIL_CUP.y + 0.08, UTENSIL_CUP.z + 0.05, 0.32);

    const cooler = makeCooler();
    this.coolerLid = cooler.lid;
    this.add('cooler', 'cooler', 'ถังแช่', cooler.model, COOLER_AT.x, COOLER_AT.y, COOLER_AT.z, COOLER_SCALE);
    // The vessels wait inside the cooler and rise out above it when it opens.
    const vessels: [VesselId, () => T.Object3D, number, number][] = [
      ['cup', () => makeVesselStack(() => buildShell('cup', false), 2, 0.28), 3.55, 0.36],
      ['carrier', () => buildShell('carrier', true), 4.65, 0.34],
    ];
    vessels.forEach(([k, model, x, sc]) => this.add('vessel', k, VESSEL[k], model(), x, 1.95, 2.75, sc));
    this.setCooler(false);

    const plate = makePlate(0.85);
    plate.position.set(HOT_POT.x, 0.02, HOT_POT.z);
    const rail = makeHookRail(HANG_SLOTS.map((s) => s.x - HANG_SLOTS[1].x), 3.6, HOOK_DROP, 3);
    rail.position.set(HANG_SLOTS[1].x, RAIL_Y, HANG_SLOTS[0].z);
    this.stage.tableG.add(plate, rail);

    // The measuring glass is picked up in place, so it joins the list without being re-parented.
    const cupProxy = new T.Mesh(new T.CylinderGeometry(0.85, 0.75, 1.9, 16), hitMaterial);
    cupProxy.position.y = 0.9;
    this.stage.cupG.add(cupProxy);
    this.items.push(this.makeItem('glass', 'glass', 'แก้วตวง', this.stage.cupG, CUP_HOME.clone(), 1.75, 1, cupProxy));
  }

  /** Opens the cooler to show the vessels inside, or closes it again. */
  setCooler(open: boolean): void {
    this.coolerOpen = open;
    for (const item of this.items) {
      if (item.kind !== 'vessel' || item.state === 'held' || item.state === 'acting') continue;
      if (open) {
        item.state = 'idle';
        item.root.visible = true;
        item.root.position.set(item.home.x, 0.8, COOLER_AT.z);
      } else {
        item.state = 'hidden';
        item.root.visible = false;
      }
    }
  }

  find(kind: ItemKind, key: string): TableItem | undefined {
    return this.items.find((i) => i.kind === kind && i.key === key);
  }

  /** Puts a hidden item, such as the spoon, back on the table. */
  sendHome(item: TableItem): void {
    item.state = 'idle';
    item.root.visible = true;
  }

  private setPointer(e: PointerEvent): void {
    const r = this.canvas.getBoundingClientRect();
    this.clientX = e.clientX;
    this.clientY = e.clientY;
    this.pointerX = e.clientX - r.left;
    this.pointerY = e.clientY - r.top;
  }

  private itemAtPointer(): TableItem | null {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new T.Vector2((this.pointerX / r.width) * 2 - 1, -(this.pointerY / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.stage.camera);
    const pickable = this.items.filter((i) => i.state === 'idle' && this.rules.canPick(i));
    const hit = this.raycaster.intersectObjects(pickable.map((i) => i.proxy), false)[0];
    return hit ? pickable.find((i) => i.proxy === hit.object) ?? null : null;
  }

  private targetAtPointer(item: TableItem): DropTarget | null {
    const r = this.canvas.getBoundingClientRect();
    const spots: [DropTarget, T.Vector3][] = [['cup', CUP_HOME], ['serve', SERVE_HOME]];
    let best: DropTarget | null = null;
    let bestDist = DROP_REACH * r.height;
    for (const [name, at] of spots) {
      if (!this.rules.targets(item).includes(name)) continue;
      const p = this.stage.screenPoint(at.x, at.y + 1.1, at.z);
      const d = Math.hypot(p.x * r.width - this.pointerX, p.y * r.height - this.pointerY);
      if (d < bestDist) {
        bestDist = d;
        best = name;
      }
    }
    return best;
  }

  private onDown(e: PointerEvent): void {
    if (!this.enabled) return;
    this.setPointer(e);
    if (this.held) {
      this.release();
      return;
    }
    const item = this.itemAtPointer();
    if (!item) return;
    if (item.kind === 'cooler') {
      this.setCooler(!this.coolerOpen);
      return;
    }
    this.held = item;
    item.state = 'held';
    this.pressX = this.pointerX;
    this.pressY = this.pointerY;
    this.dragged = false;
    this.updateHoldPoint();
    this.stageEl.classList.add('holding');
  }

  private onMove(e: PointerEvent): void {
    if (!this.enabled) return;
    this.setPointer(e);
    if (this.held) {
      if (Math.hypot(this.pointerX - this.pressX, this.pointerY - this.pressY) > CLICK_DRIFT) this.dragged = true;
      this.updateHoldPoint();
      this.heldTarget = this.targetAtPointer(this.held);
      if (this.held.kind === 'ready') this.rules.aim(this.clientX, this.clientY);
    } else {
      this.hovered = this.itemAtPointer();
      this.stageEl.classList.toggle('can-pick', this.hovered !== null);
    }
  }

  /** A press without a drag leaves the item in hand, so it can also be carried with plain clicks. */
  private onUp(): void {
    if (this.held && this.dragged) this.release();
  }

  private release(): void {
    const item = this.held;
    if (!item) return;
    if (item.kind === 'ready') {
      this.held = null;
      this.hovered = null;
      this.stageEl.classList.remove('holding');
      this.rules.aim(-1, -1);
      if (!this.rules.deliver(item, this.clientX, this.clientY)) item.state = 'idle';
      return;
    }
    const target = this.targetAtPointer(item);
    this.held = null;
    this.heldTarget = null;
    this.hovered = null;
    this.stageEl.classList.remove('holding');
    this.stage.setDropHints(false, false);
    const act = target ? this.rules.drop(item, target) : null;
    if (act?.hide) {
      item.state = 'hidden';
      item.root.visible = false;
    } else if (act) {
      item.state = 'acting';
      item.actT = 0;
      item.actPos.copy(act.pos);
      item.actTilt = act.tilt;
      item.actSeconds = act.seconds;
    } else if (item.kind === 'vessel' && !this.coolerOpen) {
      // A vessel taken out goes back into the cooler once the lid shuts.
      item.state = 'hidden';
      item.root.visible = false;
    } else {
      item.state = 'idle';
    }
  }

  private updateHoldPoint(): void {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new T.Vector2((this.pointerX / r.width) * 2 - 1, -(this.pointerY / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.stage.camera);
    const p = this.raycaster.ray.intersectPlane(HOLD_PLANE, new T.Vector3());
    if (p) this.holdPoint.set(p.x, Math.max(0.5, p.y - 0.5), p.z);
  }

  update(dt: number, elapsed: number): void {
    const near = Math.min(1, dt * 11);
    if (this.coolerLid) this.coolerLid.rotation.x += ((this.coolerOpen ? LID_OPEN : 0) - this.coolerLid.rotation.x) * Math.min(1, dt * 7);
    for (const item of this.items) {
      if (item.state === 'hidden') continue;
      if (item.kind === 'glass' && this.stage.pouring) continue;
      const isHover = item === this.hovered && item.state === 'idle';
      item.hover += ((isHover || item.state === 'held' ? 1 : 0) - item.hover) * near;
      const { root } = item;
      if (item.state === 'held') {
        root.position.lerp(this.holdPoint, Math.min(1, dt * 18));
        root.rotation.z += (-0.12 - root.rotation.z) * near;
      } else if (item.state === 'acting') {
        item.actT += dt / item.actSeconds;
        root.position.lerp(item.actPos, near);
        const tip = Math.sin(Math.min(1, item.actT) * Math.PI);
        root.rotation.z += (item.actTilt * Math.min(1, tip * 2) - root.rotation.z) * near;
        if (item.actT >= 1) item.state = 'idle';
      } else {
        // Hanging bags and the cooler stay where they are; they still grow a little under the pointer.
        const still = item.kind === 'cooler' || item.kind === 'ready';
        const lift = still ? 0 : item.hover * (item.kind === 'glass' ? 0.25 : 0.6);
        const bob = isHover && !still ? Math.sin(elapsed * 3) * 0.04 : 0;
        root.position.x += (item.home.x - root.position.x) * near;
        root.position.y += (item.home.y + lift + bob - root.position.y) * near;
        root.position.z += (item.home.z - root.position.z) * near;
        root.rotation.z += -root.rotation.z * near;
      }
      if (item.kind !== 'glass' && item.kind !== 'cooler') {
        root.scale.setScalar(item.scale * (1 + item.hover * 0.22));
        root.rotation.y += ((item.hover > 0.02 ? Math.sin(elapsed * 1.6) * 0.35 : 0) - root.rotation.y) * near;
      }
    }
    if (this.held) {
      const allowed = this.rules.targets(this.held);
      this.stage.setDropHints(allowed.includes('cup'), allowed.includes('serve'));
    }
    this.updateTag();
  }

  private updateTag(): void {
    const item = this.held ?? this.hovered;
    if (!item || item.state === 'hidden') {
      this.tagEl.hidden = true;
      return;
    }
    const p = item.root.position;
    const s = this.stage.screenPoint(p.x, p.y + item.height * (1 + item.hover * 0.22) + 0.2, p.z);
    const extra = item.kind === 'cooler' ? (this.coolerOpen ? '(กดเพื่อปิด)' : '(กดเพื่อเลือกภาชนะ)') : this.rules.tagExtra(item);
    const going = this.held && this.heldTarget ? (this.heldTarget === 'cup' ? ' → แก้วตวง' : ' → ภาชนะ') : '';
    const text = item.label + (extra ? ` ${extra}` : '') + going;
    if (this.tagEl.textContent !== text) this.tagEl.textContent = text;
    this.tagEl.hidden = false;
    // Keep the tag on screen for things at the edge, like the cooler.
    this.tagEl.style.left = `${Math.min(0.9, Math.max(0.1, s.x)) * 100}%`;
    this.tagEl.style.top = `${s.y * 100}%`;
  }
}
