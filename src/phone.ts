import { CATEGORIES, COMING_SOON, UPGRADES, type Category, type Upgrade, type UpgradeId } from './shop';

/** What the phone needs from the game: the till, what is owned, and a way to buy. */
export interface PhoneShop {
  money(): number;
  owned(): ReadonlySet<UpgradeId>;
  buy(id: UpgradeId): void;
}

type View = { page: 'home' } | { page: 'item'; id: UpgradeId } | { page: 'done'; id: UpgradeId } | { page: 'orders' };

const APP = 'ช้อปเหมียว';

/** Little product photos, drawn in a 100×100 box. */
const PICS: Record<string, string> = {
  frother: '<rect x="44" y="8" width="12" height="36" rx="6" fill="#1c1c1e"/><circle cx="54" cy="20" r="2.4" fill="#4caf50"/><rect x="49" y="44" width="2.4" height="34" fill="#c9c7c2"/><ellipse cx="50" cy="82" rx="11" ry="5" fill="none" stroke="#9a9893" stroke-width="2.6"/><ellipse cx="50" cy="82" rx="6" ry="2.6" fill="none" stroke="#b9b7b2" stroke-width="1.4"/>',
  kettle: '<rect x="27" y="30" width="46" height="58" rx="10" fill="#f1ece0" stroke="#d8d0bd"/><path d="M27 32 Q50 10 73 32 Z" fill="#8d8f93"/><rect x="44" y="18" width="12" height="6" rx="3" fill="#d8312a"/><rect x="45" y="46" width="4" height="30" rx="2" fill="#9ec7d8"/><rect x="66" y="34" width="14" height="7" rx="2" fill="#8d8f93"/>',
  lime: '<path d="M14 52 Q50 98 86 52 Z" fill="#dcd8cf" stroke="#b9b5ac"/><circle cx="36" cy="48" r="13" fill="#5ea12b"/><circle cx="36" cy="48" r="10" fill="#d9e66a"/><circle cx="60" cy="44" r="13" fill="#5ea12b"/><circle cx="60" cy="44" r="10" fill="#d9e66a"/><circle cx="49" cy="58" r="12" fill="#4d8f22"/><path d="M60 34 L60 54 M50 44 L70 44" stroke="#c4d455" stroke-width="1.2"/>',
  whip: '<rect x="38" y="30" width="24" height="60" rx="6" fill="#e9e7f2"/><rect x="38" y="48" width="24" height="18" fill="#6a8fd8"/><path d="M44 30 L50 10 L56 30 Z" fill="#c9c7d2"/>',
  pearl: '<path d="M20 50 Q50 92 80 50 Z" fill="#f4e6cf"/><g fill="#3a2414"><circle cx="35" cy="54" r="6"/><circle cx="48" cy="58" r="6"/><circle cx="61" cy="54" r="6"/><circle cx="42" cy="66" r="6"/><circle cx="56" cy="66" r="6"/><circle cx="50" cy="48" r="6"/></g>',
  sealer: '<rect x="18" y="40" width="64" height="44" rx="6" fill="#e6e1d6"/><rect x="30" y="14" width="40" height="30" rx="5" fill="#d8312a"/><rect x="40" y="58" width="20" height="24" fill="#bfe6f0" stroke="#9cc"/>',
  espresso: '<rect x="18" y="16" width="64" height="70" rx="6" fill="#bfc2c6"/><rect x="18" y="16" width="64" height="16" rx="6" fill="#5b5f66"/><rect x="40" y="38" width="20" height="8" rx="3" fill="#2b2b2b"/><rect x="40" y="62" width="20" height="16" rx="3" fill="#fff"/><path d="M60 66 h6 v6 h-6" fill="none" stroke="#fff" stroke-width="2"/>',
};

const pic = (key: string) => `<svg viewBox="0 0 100 100" aria-hidden="true">${PICS[key] ?? ''}</svg>`;
const baht = (n: number) => `฿${n.toLocaleString('th-TH')}`;
/** "12.4พัน" style, the way shop apps print how many have sold. */
const soldText = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}พัน` : String(n));
const off = (u: Upgrade) => Math.round((1 - u.price / u.was) * 100);

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html) e.innerHTML = html;
  return e;
}

/**
 * The shop on the vendor's phone: a made-up marketplace app with categories, product pages and checkout.
 * It opens over a dimmed screen and hands each purchase back to the game.
 */
export class Phone {
  private readonly root = el('div');
  private readonly screen = el('div', 'screen');
  private readonly body = el('div', 'app-body');
  private readonly search = el('input');
  private readonly wallet = el('span', 'app-wallet');
  private readonly clock = el('span');
  private readonly tabs = el('nav', 'app-tabs');
  private view: View = { page: 'home' };
  private category: Category | 'all' = 'all';
  private confirming = false;
  private opener: HTMLElement | null = null;
  private onClose: () => void = () => {};

  constructor(private readonly shop: PhoneShop) {
    this.root.id = 'phone';
    this.root.hidden = true;
    const device = el('div', 'device');
    device.setAttribute('role', 'dialog');
    device.setAttribute('aria-modal', 'true');
    device.setAttribute('aria-label', `แอป ${APP} ซื้ออัปเกรดร้าน`);

    const status = el('div', 'status');
    status.append(this.clock, el('span', 'notch'), el('span', '', '<i class="sig"></i><i class="bat"></i>'));

    const head = el('header', 'app-head');
    const logo = el('div', 'app-logo', `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9 L7 3 L10 8 H14 L17 3 L19 9 Q21 13 19 17 Q16 21 12 21 Q8 21 5 17 Q3 13 5 9 Z" fill="#fff"/><circle cx="9.5" cy="13" r="1.2" fill="#ff6a2b"/><circle cx="14.5" cy="13" r="1.2" fill="#ff6a2b"/></svg><b>${APP}</b>`);
    this.search.type = 'search';
    this.search.placeholder = 'ค้นหาของเข้าร้าน';
    this.search.setAttribute('aria-label', 'ค้นหาสินค้า');
    this.search.addEventListener('input', () => {
      // A search looks through every category.
      this.category = 'all';
      this.go({ page: 'home' });
    });
    head.append(logo, this.wallet, this.search);

    [['home', 'หน้าแรก', '<path d="M4 11 L12 4 L20 11 V20 H4 Z"/>'], ['orders', 'การซื้อของฉัน', '<path d="M5 4 H19 V20 H5 Z M8 9 H16 M8 13 H16 M8 17 H12"/>']].forEach(([page, label, path]) => {
      const b = el('button', '', `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg><span>${label}</span>`);
      b.type = 'button';
      b.dataset.page = page;
      b.addEventListener('click', () => this.go({ page: page as 'home' | 'orders' }));
      this.tabs.append(b);
    });

    this.screen.append(status, head, this.body, this.tabs);
    const home = el('button', 'home-bar');
    home.type = 'button';
    home.setAttribute('aria-label', 'ปิดโทรศัพท์');
    home.addEventListener('click', () => this.close());
    device.append(this.screen, home);

    const close = el('button', 'phone-close', 'เก็บโทรศัพท์ <kbd>Esc</kbd>');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    this.root.append(device, close);
    // Clicking the dimmed table around the phone puts it away too.
    this.root.addEventListener('click', (e) => e.target === this.root && this.close());
    this.root.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (this.confirming) this.render(false);
      else this.close();
    });
    document.querySelector('#stage')?.append(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(onClose: () => void = () => {}): void {
    this.opener = document.activeElement as HTMLElement | null;
    this.onClose = onClose;
    this.search.value = '';
    this.category = 'all';
    this.view = { page: 'home' };
    this.clock.textContent = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    this.root.hidden = false;
    this.render(false);
    this.search.focus();
  }

  close(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.onClose();
    this.opener?.focus();
  }

  /** Redraws after the till changes from outside, such as Dev mode. */
  refresh(): void {
    if (this.isOpen) this.render(this.confirming);
  }

  private go(view: View): void {
    this.view = view;
    this.render(false);
    this.body.scrollTop = 0;
  }

  private render(confirming: boolean): void {
    this.confirming = confirming;
    this.wallet.textContent = `กระเป๋าร้าน ${baht(this.shop.money())}`;
    this.screen.dataset.page = this.view.page;
    this.tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.page === this.view.page || (b.dataset.page === 'home' && this.view.page === 'item')));
    this.body.textContent = '';
    this.screen.querySelector('.sheet')?.remove();
    if (this.view.page === 'home') this.renderHome();
    else if (this.view.page === 'item') this.renderItem(this.view.id, confirming);
    else if (this.view.page === 'done') this.renderDone(this.view.id);
    else this.renderOrders();
  }

  private renderHome(): void {
    const q = this.search.value.trim();
    if (!q) {
      this.body.append(el('div', 'banner', '<b>โปรร้านน้ำ ลดแรงทุกวัน</b><span>ส่งฟรีถึงรถเข็น ใช้เงินในร้านจ่ายได้เลย</span>'));
    }
    const chips = el('div', 'chips');
    chips.setAttribute('role', 'tablist');
    [{ id: 'all' as const, name: 'ทั้งหมด' }, ...CATEGORIES].forEach((c) => {
      const b = el('button', this.category === c.id ? 'on' : '');
      b.type = 'button';
      b.textContent = c.name;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(this.category === c.id));
      b.addEventListener('click', () => {
        this.category = c.id;
        this.render(false);
      });
      chips.append(b);
    });
    this.body.append(chips);

    const match = (name: string, cat: Category) => (this.category === 'all' || cat === this.category) && name.includes(q);
    const grid = el('div', 'grid');
    UPGRADES.filter((u) => match(u.name, u.category)).forEach((u) => {
      const has = this.shop.owned().has(u.id);
      const card = el('button', `card${has ? ' owned' : ''}`, `
        <div class="pic">${pic(u.id)}<span class="badge off">-${off(u)}%</span>${has ? '<span class="stamp">ซื้อแล้ว</span>' : ''}</div>
        <div class="name">${u.name}</div>
        <div class="tags"><span>ส่งฟรี</span><span>ร้านแนะนำ</span></div>
        <div class="price"><b>${baht(u.price)}</b><small>ขายแล้ว ${soldText(u.sold)}</small></div>`);
      card.type = 'button';
      card.addEventListener('click', () => this.go({ page: 'item', id: u.id }));
      grid.append(card);
    });
    COMING_SOON.filter((c) => match(c.name, c.category)).forEach((c) => {
      grid.append(el('div', 'card soon', `
        <div class="pic">${pic(c.key)}<span class="stamp">เร็วๆ นี้</span></div>
        <div class="name">${c.name}</div>
        <div class="tags"><span>รอของเข้า</span></div>
        <div class="price"><b>${baht(c.price)}</b><small>ยังไม่เปิดขาย</small></div>`));
    });
    if (!grid.children.length) grid.append(el('p', 'empty', `ไม่เจอ “${q.replace(/[<>&"]/g, '')}” ลองคำอื่น`));
    this.body.append(grid);
  }

  private renderItem(id: UpgradeId, confirming: boolean): void {
    const u = UPGRADES.find((x) => x.id === id) as Upgrade;
    const money = this.shop.money();
    const has = this.shop.owned().has(id);
    const back = el('button', 'back', '‹ กลับ');
    back.type = 'button';
    back.addEventListener('click', () => this.go({ page: 'home' }));
    const stars = '★★★★★'.slice(0, Math.round(u.stars)).padEnd(5, '☆');
    this.body.append(back, el('div', 'item', `
      <div class="hero">${pic(u.id)}</div>
      <div class="sale"><b>${baht(u.price)}</b><s>${baht(u.was)}</s><span class="badge off">-${off(u)}%</span></div>
      <h3>${u.name}</h3>
      <div class="meta"><span class="stars" aria-label="${u.stars} ดาว">${stars}</span> ${u.stars} · ขายแล้ว ${soldText(u.sold)} ชิ้น</div>
      <div class="ship">ส่งฟรี · ถึงรถเข็นก่อนเปิดร้านวันพรุ่งนี้</div>
      <div class="seller"><i>${u.seller.slice(0, 1)}</i><div><b>${u.seller}</b><small>ร้านค้าแนะนำ · ตอบแชทเร็ว</small></div></div>
      <h4>ช่วยร้านคุณยังไง</h4>
      <p>${u.effect}</p>`));

    const bar = el('div', 'buy-bar');
    const buy = el('button', 'buy');
    buy.type = 'button';
    if (has) {
      buy.textContent = 'ซื้อแล้ว อยู่บนโต๊ะร้าน';
      buy.disabled = true;
    } else if (money < u.price) {
      buy.textContent = `เงินไม่พอ ขาดอีก ${baht(u.price - money)}`;
      buy.disabled = true;
    } else {
      buy.textContent = `ซื้อเลย ${baht(u.price)}`;
      buy.addEventListener('click', () => this.render(true));
    }
    bar.append(buy);
    this.body.append(bar);

    if (confirming && !has && money >= u.price) {
      const sheet = el('div', 'sheet');
      sheet.append(el('div', 'sheet-card', `
        <h4>ยืนยันการสั่งซื้อ</h4>
        <div class="line"><span>${u.name}</span><b>${baht(u.price)}</b></div>
        <div class="line"><span>ค่าส่ง</span><b><s>${baht(38)}</s> ฟรี</b></div>
        <div class="line"><span>ชำระด้วยกระเป๋าร้าน</span><b>${baht(money)} → ${baht(money - u.price)}</b></div>`));
      const row = el('div', 'sheet-row');
      const cancel = el('button', 'ghosty', 'ยกเลิก');
      cancel.type = 'button';
      cancel.addEventListener('click', () => this.render(false));
      const ok = el('button', 'buy', 'ยืนยันสั่งซื้อ');
      ok.type = 'button';
      ok.addEventListener('click', () => {
        this.shop.buy(id);
        this.go({ page: 'done', id });
      });
      row.append(cancel, ok);
      sheet.firstElementChild?.append(row);
      sheet.addEventListener('click', (e) => e.target === sheet && this.render(false));
      this.screen.append(sheet);
      ok.focus();
    }
  }

  private renderDone(id: UpgradeId): void {
    const u = UPGRADES.find((x) => x.id === id) as Upgrade;
    const done = el('div', 'done', `
      <div class="tick" aria-hidden="true">✓</div>
      <h3>สั่งซื้อสำเร็จ</h3>
      <p>ไรเดอร์แมวส่ง <b>${u.name}</b> ถึงรถเข็นแล้ว จะวางอยู่บนโต๊ะตอนเปิดร้าน</p>
      <div class="hero small">${pic(u.id)}</div>`);
    const more = el('button', 'buy', 'ช้อปต่อ');
    more.type = 'button';
    more.addEventListener('click', () => this.go({ page: 'home' }));
    done.append(more);
    this.body.append(done);
    more.focus();
  }

  private renderOrders(): void {
    this.body.append(el('h3', 'section', 'การซื้อของฉัน'));
    const mine = UPGRADES.filter((u) => this.shop.owned().has(u.id));
    if (!mine.length) {
      this.body.append(el('p', 'empty', 'ยังไม่เคยสั่งของ เก็บเงินจากการขายน้ำแล้วมาช้อปกัน'));
      return;
    }
    mine.forEach((u) => this.body.append(el('div', 'order-row', `<div class="pic">${pic(u.id)}</div><div><b>${u.name}</b><small>${u.seller}</small><span class="ok">จัดส่งสำเร็จ</span></div><b>${baht(u.price)}</b>`)));
  }
}
