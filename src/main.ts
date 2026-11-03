import './style.css';
import { startGame } from './game';
import { DrinkStage } from './stage';

const NO_WEBGL = 'เบราว์เซอร์นี้เปิด WebGL ไม่ได้ เกมจึงแสดงภาพสามมิติไม่ได้ ลองเปิดด้วย Chrome หรือ Edge';

/** Ingredient labels are painted onto textures, so the Thai fonts must be ready first. */
async function fontsReady(): Promise<void> {
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2500));
  const fonts = Promise.all([document.fonts.load('500 40px Mitr', 'ชา'), document.fonts.load('700 40px Charm', 'ชา')]).then(() => undefined);
  await Promise.race([fonts, timeout]).catch(() => undefined);
}

/** Phones and tablets have no mouse to hover with, so the game isn't playable on them yet. */
const touchOnly = matchMedia('(hover: none) and (pointer: coarse)').matches;

async function main(): Promise<void> {
  const root = document.querySelector('#stage') as HTMLElement;
  if (touchOnly) {
    document.documentElement.classList.add('touch-only');
    return;
  }
  await fontsReady();
  let stage: DrinkStage;
  try {
    stage = new DrinkStage({
      canvas: document.querySelector('#gl') as HTMLCanvasElement,
      stage: root,
    });
  } catch {
    const message = document.createElement('div');
    message.id = 'err';
    message.textContent = NO_WEBGL;
    root.append(message);
    return;
  }
  startGame(stage);
}

void main();
