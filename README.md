# ชงชื่นใจ

เกมรถเข็นชงน้ำไทยแบบ 3D บนเว็บ ใช้ Three.js, TypeScript และ Vite

## คำสั่ง

```bash
npm install
npm run dev
npm run build
```

`npm run dev` เปิดที่ http://localhost:5180

## Deploy บน Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`

## โครงสร้าง

- `src/data.ts`: เมนู วัตถุดิบ ขั้นตอน และการคิดคะแนน
- `src/art.ts`: ภาพและพื้นผิวที่วาดด้วย canvas
- `src/models.ts`: โมเดลวัตถุดิบและของแต่ง
- `src/stage.ts`: ฉาก 3D แก้ว น้ำ และกล้อง
- `src/game.ts`: ลำดับการเล่น การคน และ UI
- `src/main.ts`: จุดเริ่มต้นของเกม
