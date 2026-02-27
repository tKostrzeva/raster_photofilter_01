let cam;
let saveBtn;
let img;
let buffer;

let TILES_X, TILES_Y;

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

  TILES_X = 64;
  TILES_Y = round(TILES_X * height / width);
  
  let tileW = windowWidth / TILES_X;
  let tileH = windowHeight / TILES_Y;

  // downbuffer room into tiny 2D buffer
  buffer.resizeCanvas(TILES_X, TILES_Y);
  buffer.image(cam, 0, 0, TILES_X, TILES_Y);
  buffer.loadPixels();

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
