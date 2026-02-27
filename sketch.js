let cam;
let saveBtn;
let img;
let buffer;
let TILES_X, TILES_Y;

let sliderA = document.getElementById("sliderA");
let sliderB = document.getElementById("sliderB");
let sliderC = document.getElementById("sliderC");
let sliderD = document.getElementById("sliderD");

function preload() {
  img = loadImage("photo.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  buffer = createGraphics(TILES_X, TILES_Y);
  buffer.pixelDensity(1);

  // Start camera immediately (no default image)
  cam = createCapture({
    video: { facingMode: { ideal: "environment" } },
    audio: false
  });

  // iOS/Safari: force inline playback + autoplay attempt
  const v = cam.elt;
  v.setAttribute("playsinline", "");
  v.setAttribute("webkit-playsinline", "");
  v.setAttribute("autoplay", "");
  v.muted = true;

  const p = v.play();
  if (p && p.catch) p.catch(() => { });

  cam.hide();

  // Save button
  saveBtn = createButton("Save frame");
  saveBtn.id("saveFrame");
  saveBtn.mousePressed(() => {
    saveCanvas("frame", "png");
  });
  saveBtn.id("saveButton");
}

function draw() {
  // Camera readiness check
  const camReady =
    cam &&
    cam.elt &&
    (cam.elt.readyState >= 2) &&
    ((cam.elt.videoWidth > 0 && cam.elt.videoHeight > 0) || (cam.width > 0 && cam.height > 0));

  // Camera unavailable alert
  if (!camReady) {
    background(40);
    return;
  }


  background(230);

  TILES_X = sliderE.value;
  TILES_Y = round(TILES_X * height / width);

  let tileW = windowWidth / TILES_X;
  let tileH = windowHeight / TILES_Y;

  // downbuffer room into tiny 2D buffer
  buffer.resizeCanvas(TILES_X, TILES_Y);
  buffer.image(cam, 0, 0, TILES_X, TILES_Y);
  buffer.loadPixels();

  // --- HUE posterize controls ---
const HUE_BINS  = sliderA.value;   // 3..24  (nižšie = viac zjednotené farby, "auto celé modré")
const V_BINS    = sliderB.value;   // 1..6   (1 = flat farby, 2-4 = ponechá tiene v rámci farby)
const GRAY_BINS = sliderC.value;   // 2..10  (koľko odtieňov pre šedé/čierne/biele)
const SAT_CUTOFF = sliderD.value; // 0..1 (nižšie = viac pixelov pôjde do farieb, vyššie = viac do šedej)

const COLOR_BINS = HUE_BINS * V_BINS;
const TOTAL_BINS = COLOR_BINS + GRAY_BINS;

const sumR = new Array(TOTAL_BINS).fill(0);
const sumG = new Array(TOTAL_BINS).fill(0);
const sumB = new Array(TOTAL_BINS).fill(0);
const cnt  = new Array(TOTAL_BINS).fill(0);

// 1) pass: priraď pixel do binu (HUE/V alebo GRAY) a akumuluj RGB
for (let i = 0; i < buffer.pixels.length; i += 4) {
  const r8 = buffer.pixels[i];
  const g8 = buffer.pixels[i + 1];
  const b8 = buffer.pixels[i + 2];

  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;

  const maxc = Math.max(r, g, b);
  const minc = Math.min(r, g, b);
  const d = maxc - minc;

  // HSV-ish
  const v = maxc;                            // 0..1
  const s = maxc === 0 ? 0 : d / maxc;       // 0..1

  let idx;

  if (s < SAT_CUTOFF || d === 0) {
    // Gray bin by VALUE
    const gb = Math.min(GRAY_BINS - 1, (v * GRAY_BINS) | 0);
    idx = COLOR_BINS + gb;
  } else {
    // Hue 0..1
    let h;
    if (maxc === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (maxc === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;

    const hb = Math.min(HUE_BINS - 1, (h * HUE_BINS) | 0);
    const vb = Math.min(V_BINS - 1, (v * V_BINS) | 0);

    idx = vb * HUE_BINS + hb;
  }

  sumR[idx] += r8;
  sumG[idx] += g8;
  sumB[idx] += b8;
  cnt[idx]  += 1;
}

// 2) sprav paletu = priemer RGB v každom bine
const palR = new Array(TOTAL_BINS).fill(0);
const palG = new Array(TOTAL_BINS).fill(0);
const palB = new Array(TOTAL_BINS).fill(0);

for (let k = 0; k < TOTAL_BINS; k++) {
  if (cnt[k] > 0) {
    palR[k] = sumR[k] / cnt[k];
    palG[k] = sumG[k] / cnt[k];
    palB[k] = sumB[k] / cnt[k];
  } else {
    // fallback: neutrálna sivá podľa pozície binu
    const t = k < COLOR_BINS ? 128 : ((k - COLOR_BINS) + 0.5) * (255 / GRAY_BINS);
    palR[k] = palG[k] = palB[k] = t;
  }
}

// 3) pass: prepíš pixely na farbu svojho binu
for (let i = 0; i < buffer.pixels.length; i += 4) {
  const r8 = buffer.pixels[i];
  const g8 = buffer.pixels[i + 1];
  const b8 = buffer.pixels[i + 2];

  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;

  const maxc = Math.max(r, g, b);
  const minc = Math.min(r, g, b);
  const d = maxc - minc;

  const v = maxc;
  const s = maxc === 0 ? 0 : d / maxc;

  let idx;

  if (s < SAT_CUTOFF || d === 0) {
    const gb = Math.min(GRAY_BINS - 1, (v * GRAY_BINS) | 0);
    idx = COLOR_BINS + gb;
  } else {
    let h;
    if (maxc === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (maxc === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;

    const hb = Math.min(HUE_BINS - 1, (h * HUE_BINS) | 0);
    const vb = Math.min(V_BINS - 1, (v * V_BINS) | 0);

    idx = vb * HUE_BINS + hb;
  }

  buffer.pixels[i]     = palR[idx];
  buffer.pixels[i + 1] = palG[idx];
  buffer.pixels[i + 2] = palB[idx];
}

buffer.updatePixels();

  push();
  noStroke();
  rectMode(CORNER);
  for (let y = 0; y < TILES_Y; y++) {
    for (let x = 0; x < TILES_X; x++) {

      const i = 4 * (x + y * TILES_X);

      const r = buffer.pixels[i];
      const g = buffer.pixels[i + 1];
      const b = buffer.pixels[i + 2];

      fill(r, g, b);

      rect(
        x * tileW,
        y * tileH,
        tileW * 1.1,
        tileH * 1.1
      );
    }
  }
  pop();
}
