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

async function main(): Promise<void> {
  await fontsReady();
  const root = document.querySelector('#stage') as HTMLElement;
  let stage: DrinkStage;
  try {
    stage = new DrinkStage({
      canvas: document.querySelector('#gl') as HTMLCanvasElement,
      stage: root,
      ticket: document.querySelector('#ticket') as HTMLElement,
      panel: document.querySelector('#panel-wrap') as HTMLElement,
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
