let cam;
let saveBtn;
let img;
let buffer;
let TILES_X, TILES_Y;

let sliderA = document.getElementById("sliderA");
let sliderB = document.getElementById("sliderB");
let sliderC = document.getElementById("sliderC");

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
  saveBtn = createButton("Capture");
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

  TILES_X = sliderC.value;
  TILES_Y = round(TILES_X * height / width);

  let tileW = windowWidth / TILES_X;
  let tileH = windowHeight / TILES_Y;

  // downbuffer room into tiny 2D buffer
  buffer.resizeCanvas(TILES_X, TILES_Y);
  buffer.image(cam, 0, 0, TILES_X, TILES_Y);
  buffer.loadPixels();

  let SAT = sliderB.value;     // 1.0 = nič, 1.5–2.5 = saturované
  let BITS = sliderA.value;
  let NOISE = 0;  // 0=nič, 0.05–0.2 = jemný dither

  const LEVELS = 1 << BITS;           // 2^BITS
  const step = 255 / (LEVELS - 1);    // quantization step

  for (let i = 0; i < buffer.pixels.length; i += 4) {
    let r = buffer.pixels[i];
    let g = buffer.pixels[i + 1];
    let b = buffer.pixels[i + 2];

    // 1) Saturation (push away from gray)
    const gray = (r + g + b) / 3;
    r = gray + (r - gray) * SAT;
    g = gray + (g - gray) * SAT;
    b = gray + (b - gray) * SAT;

    // 2) Noise / dither (pre-quantize), symmetric around 0
    if (NOISE > 0) {
      const n = (Math.random() * 2 - 1) * (step * NOISE);
      r += n; g += n; b += n;
    }

    // 3) Bit depth quantization (per channel)
    r = Math.round(r / step) * step;
    g = Math.round(g / step) * step;
    b = Math.round(b / step) * step;

    buffer.pixels[i] = constrain(r, 0, 255);
    buffer.pixels[i + 1] = constrain(g, 0, 255);
    buffer.pixels[i + 2] = constrain(b, 0, 255);
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
