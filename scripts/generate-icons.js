// 앱 아이콘 + 스플래시 + Android adaptive 자동 생성
// 디자인: 두 하트가 맞닿은 형태 (커플 앱 모티프)
// 팔레트: design-system tokens 그대로

const Jimp = require('../node_modules/jimp-compact');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
const SIZE = 1024;

// ─── palette ──────────────────────────────────────────────────────────────────
// 앱 accent.primary: #E27396 기반 그라디언트
const GRAD_TOP    = { r: 0xF5, g: 0x9C, b: 0xBC }; // #F59CBC (light rose)
const GRAD_BOTTOM = { r: 0xBD, g: 0x3E, b: 0x6C }; // #BD3E6C (deep rose)
const WHITE       = { r: 255,  g: 255,  b: 255  };
const ACCENT      = { r: 0xE2, g: 0x73, b: 0x96 }; // #E27396
const CREAM_BG    = 0xFFFBF7FF; // bg.base

// ─── utils ────────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function blendRGB(bg, fg, alpha) {
  return {
    r: lerp(bg.r, fg.r, alpha),
    g: lerp(bg.g, fg.g, alpha),
    b: lerp(bg.b, fg.b, alpha),
  };
}

// Rotated-Grid MSAA 4x — 심장 경계 안티에일리어싱
const MSAA = [[-0.375, -0.125], [0.125, -0.375],
              [ 0.375,  0.125], [-0.125,  0.375]];

function heartCoverage(px, py, cx, cy, r) {
  let inside = 0;
  for (const [dx, dy] of MSAA) {
    const xn = (px + dx - cx) / r;
    const yn = -(py + dy - cy) / r;   // y 뒤집기 → 하트 아래 꼭짓점
    if (Math.pow(xn*xn + yn*yn - 1, 3) - xn*xn * yn*yn*yn <= 0) inside++;
  }
  return inside / MSAA.length;
}

// ─── app icon (1024×1024) ─────────────────────────────────────────────────────
async function createAppIcon() {
  const img = new Jimp(SIZE, SIZE, 0xFFFFFFFF);

  // 두 하트 파라미터
  // r=200, offset ±118 → 하트 두 개가 중앙에서 살짝 겹침
  const r   = 200;
  const cx1 = SIZE / 2 - 118;
  const cx2 = SIZE / 2 + 118;
  const cy  = SIZE / 2 + 30;  // 살짝 아래 → 시각 중심 맞춤

  img.scan(0, 0, SIZE, SIZE, function(px, py, idx) {
    // 그라디언트 배경 (위: 연한 로즈 → 아래: 진한 로즈)
    const t = py / SIZE;
    const bg = {
      r: lerp(GRAD_TOP.r, GRAD_BOTTOM.r, t),
      g: lerp(GRAD_TOP.g, GRAD_BOTTOM.g, t),
      b: lerp(GRAD_TOP.b, GRAD_BOTTOM.b, t),
    };

    // 두 하트 커버리지 (OR)
    const cov = Math.min(1, heartCoverage(px, py, cx1, cy, r)
                         + heartCoverage(px, py, cx2, cy, r));
    const col = blendRGB(bg, WHITE, cov);

    this.bitmap.data[idx]   = col.r;
    this.bitmap.data[idx+1] = col.g;
    this.bitmap.data[idx+2] = col.b;
    this.bitmap.data[idx+3] = 255;
  });

  await img.write(path.join(ASSETS, 'icon.png'));
  console.log('✅ icon.png');
}

// ─── splash icon (1024×1024, 크림 배경 + 핑크 하트) ───────────────────────────
async function createSplashIcon() {
  const img = new Jimp(SIZE, SIZE, CREAM_BG);

  const r   = 160;
  const cx1 = SIZE / 2 - 95;
  const cx2 = SIZE / 2 + 95;
  const cy  = SIZE / 2 + 24;

  img.scan(0, 0, SIZE, SIZE, function(px, py, idx) {
    const cov = Math.min(1, heartCoverage(px, py, cx1, cy, r)
                         + heartCoverage(px, py, cx2, cy, r));
    if (cov <= 0) return;

    const bg = { r: this.bitmap.data[idx], g: this.bitmap.data[idx+1], b: this.bitmap.data[idx+2] };
    const col = blendRGB(bg, ACCENT, cov);
    this.bitmap.data[idx]   = col.r;
    this.bitmap.data[idx+1] = col.g;
    this.bitmap.data[idx+2] = col.b;
    this.bitmap.data[idx+3] = 255;
  });

  await img.write(path.join(ASSETS, 'splash-icon.png'));
  console.log('✅ splash-icon.png');
}

// ─── Android adaptive foreground (투명 배경, 흰 하트) ────────────────────────
async function createAndroidForeground() {
  const img = new Jimp(SIZE, SIZE, 0x00000000);

  const r   = 170;
  const cx1 = SIZE / 2 - 105;
  const cx2 = SIZE / 2 + 105;
  const cy  = SIZE / 2 + 25;

  img.scan(0, 0, SIZE, SIZE, function(px, py, idx) {
    const cov = Math.min(1, heartCoverage(px, py, cx1, cy, r)
                         + heartCoverage(px, py, cx2, cy, r));
    if (cov <= 0) return;
    this.bitmap.data[idx]   = 255;
    this.bitmap.data[idx+1] = 255;
    this.bitmap.data[idx+2] = 255;
    this.bitmap.data[idx+3] = Math.round(cov * 255);
  });

  await img.write(path.join(ASSETS, 'android-icon-foreground.png'));
  console.log('✅ android-icon-foreground.png');

  // monochrome = foreground 재사용
  await img.write(path.join(ASSETS, 'android-icon-monochrome.png'));
  console.log('✅ android-icon-monochrome.png');
}

// ─── Android adaptive background (그라디언트) ─────────────────────────────────
async function createAndroidBackground() {
  const img = new Jimp(SIZE, SIZE, 0xFFFFFFFF);
  img.scan(0, 0, SIZE, SIZE, function(px, py, idx) {
    const t = py / SIZE;
    this.bitmap.data[idx]   = lerp(GRAD_TOP.r, GRAD_BOTTOM.r, t);
    this.bitmap.data[idx+1] = lerp(GRAD_TOP.g, GRAD_BOTTOM.g, t);
    this.bitmap.data[idx+2] = lerp(GRAD_TOP.b, GRAD_BOTTOM.b, t);
    this.bitmap.data[idx+3] = 255;
  });
  await img.write(path.join(ASSETS, 'android-icon-background.png'));
  console.log('✅ android-icon-background.png');
}

// ─── favicon 32×32 ───────────────────────────────────────────────────────────
async function createFavicon() {
  const S = 32;
  const img = new Jimp(S, S, 0xFFFFFFFF);
  const r = 6.5, cx1 = S/2 - 4, cx2 = S/2 + 4, cy = S/2 + 1;

  img.scan(0, 0, S, S, function(px, py, idx) {
    const t = py / S;
    const bg = {
      r: lerp(GRAD_TOP.r, GRAD_BOTTOM.r, t),
      g: lerp(GRAD_TOP.g, GRAD_BOTTOM.g, t),
      b: lerp(GRAD_TOP.b, GRAD_BOTTOM.b, t),
    };
    const cov = Math.min(1, heartCoverage(px, py, cx1, cy, r)
                          + heartCoverage(px, py, cx2, cy, r));
    const col = blendRGB(bg, WHITE, cov);
    this.bitmap.data[idx]   = col.r;
    this.bitmap.data[idx+1] = col.g;
    this.bitmap.data[idx+2] = col.b;
    this.bitmap.data[idx+3] = 255;
  });

  await img.write(path.join(ASSETS, 'favicon.png'));
  console.log('✅ favicon.png (32×32)');
}

// ─── run all ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('아이콘 생성 중...');
  await createAppIcon();
  await createSplashIcon();
  await createAndroidForeground();
  await createAndroidBackground();
  await createFavicon();
  console.log('\n모두 완료! assets/ 폴더를 확인하세요.');
}

main().catch(err => { console.error(err); process.exit(1); });
