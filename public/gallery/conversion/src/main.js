/**
 * CONVERSION — "The Gap". The 4th dimension is CALENDAR DAYS.
 *
 * One dollar's journey across a working-capital cycle, laid on a 120-day clock.
 * Corn is bought on day 0 and held 74 days; the supplier is paid on day 44; the
 * bag ships on day 74 and the customer pays 38 days later, on day 112. The stretch
 * between paying out and being paid back — 68 days — is the gap, and the gap is
 * what a revolver is actually funding.
 *
 * Scrolling walks the dollar along the clock. The funded region fills in behind it
 * as the marker crosses it, so the number in the readout is the span you have
 * literally just watched open up.
 */
import * as THREE from "../../_vendor/three.module.js";
import { createStage, clamp01 } from "./stage.js";
import { createLabels } from "./_labels.js";

const DAYS = 120, DIO = 74, DSO = 38, DPO = 44;
const PAY = DPO, SELL = DIO, COLLECT = DIO + DSO;   // 44, 74, 112
const GAP = COLLECT - PAY;                          // 68
const W = 5.0, ROW = 0.5;

const STATIC = [
  "CASH CONVERSION CYCLE  ·  ONE DOLLAR",
  "buy", "pay supplier", "ship", "collect",
  "inventory  74d", "receivable  38d", "payable  44d",
  "FUNDED GAP", "days", "day 0", "day 60", "day 120",
];
const L = Object.fromEntries(STATIC.map((s, i) => [s, i]));
const READOUT = 10;
const TICKS = [["day 0", 0], ["day 60", 60], ["day 120", 120]];

createStage({
  stillAt: 0.84,
  fitWidth: 5.6,   // content width incl. labels — see stage.js
  fov: 42,
  cameraFor: (narrow) => ({ pos: [0, 0, narrow ? 8.4 : 6.6], look: [0, 0, 0] }),
  framing: (p, narrow, w) => (narrow ? { x: 0, y: 0.2 } : { x: Math.min(1.2, w / 1150) - clamp01((p - 0.8) / 0.18) * 2.6, y: 0.05 }),
  build({ rig, camera }) {
    const inner = new THREE.Group();
    rig.add(inner);
    const xOf = (d) => -W / 2 + (d / DAYS) * W;

    /* ---------- the three spans, as stacked bars ---------- */
    const span = (from, to, y, colour) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 0.2),
        new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0 }),
      );
      m.userData = { from, to };
      m.position.y = y;
      inner.add(m);
      return m;
    };
    const bars = [
      span(0, DIO, ROW, 0x1f6fe0),        // inventory held
      span(SELL, COLLECT, 0, 0x0c86a6),   // receivable outstanding
      span(0, PAY, -ROW, 0x7a5230),       // payable outstanding (free financing)
    ];

    // The funded gap: from paying the supplier to collecting from the customer.
    const gapBar = new THREE.Mesh(
      new THREE.PlaneGeometry(1, ROW * 2.5),
      new THREE.MeshBasicMaterial({ color: 0xc8324a, transparent: true, opacity: 0 }),
    );
    gapBar.position.z = -0.03;
    inner.add(gapBar);

    const axis = new THREE.Mesh(new THREE.BoxGeometry(W, 0.008, 0.008),
      new THREE.MeshBasicMaterial({ color: 0x53637e, transparent: true, opacity: 0.4 }));
    axis.position.y = -ROW * 1.9;
    inner.add(axis);

    /* ---------- the dollar itself ---------- */
    const coin = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 20),
      new THREE.MeshBasicMaterial({ color: 0x1f6fe0 }),
    );
    coin.position.y = ROW * 1.5;
    inner.add(coin);
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x1f6fe0, transparent: true, opacity: 0.4 }));
    trail.position.y = ROW * 1.5;
    inner.add(trail);

    const labels = createLabels(STATIC, { withGlyphs: true, color: "#111c30", count: STATIC.length + READOUT });
    inner.add(labels.mesh);

    return { inner, bars, gapBar, coin, trail, labels, camera, xOf };
  },

  pose(w, { p, t }) {
    const { inner, bars, gapBar, coin, trail, labels, camera, xOf } = w;
    const day = p * DAYS;
    inner.rotation.y = Math.sin(t * 0.05) * 0.012;   // before update(): the billboard reads it

    // Each span draws itself only as far as the dollar has actually travelled.
    for (const b of bars) {
      const { from, to } = b.userData;
      const end = Math.min(to, Math.max(from, day));
      const len = Math.max(0.0001, ((end - from) / DAYS) * W);
      b.scale.x = len;
      b.position.x = xOf(from) + len / 2;
      b.material.opacity = day > from ? 0.75 : 0;
    }

    // The gap only exists once the supplier has been paid.
    const gapEnd = Math.min(COLLECT, Math.max(PAY, day));
    const gLen = Math.max(0.0001, ((gapEnd - PAY) / DAYS) * W);
    gapBar.scale.x = gLen;
    gapBar.position.x = xOf(PAY) + gLen / 2;
    gapBar.material.opacity = day > PAY ? 0.14 : 0;

    coin.position.x = xOf(Math.min(day, DAYS));
    const tLen = Math.max(0.0001, (Math.min(day, DAYS) / DAYS) * W);
    trail.scale.x = tLen;
    trail.position.x = -W / 2 + tLen / 2;

    let i = 0;
    const put = (key, x, y, h, a = 1) => labels.set(i++, L[key], x, y, 0.05, h, a);

    put("CASH CONVERSION CYCLE  ·  ONE DOLLAR", 0, ROW * 2.5 + 0.2, 0.145);

    // Milestones light as the dollar reaches them.
    put("buy", xOf(0) + 0.16, ROW * 1.9, 0.095, day >= 0 ? 0.9 : 0.35);
    put("pay supplier", xOf(PAY), ROW * 1.9, 0.095, day >= PAY ? 0.9 : 0.35);
    put("ship", xOf(SELL) + 0.06, ROW * 1.9, 0.095, day >= SELL ? 0.9 : 0.35);
    put("collect", xOf(COLLECT) - 0.1, ROW * 1.9, 0.095, day >= COLLECT ? 0.9 : 0.35);

    put("inventory  74d", xOf(DIO / 2), ROW, 0.09, day > 6 ? 0.85 : 0.2);
    put("receivable  38d", xOf((SELL + COLLECT) / 2), 0, 0.09, day > SELL + 4 ? 0.85 : 0.2);
    put("payable  44d", xOf(PAY / 2), -ROW, 0.09, day > 6 ? 0.85 : 0.2);

    for (let k = 0; k < TICKS.length; k++) {
      put(TICKS[k][0], xOf(TICKS[k][1]), -ROW * 2.2, 0.09, 0.6);
    }

    // The running gap — the figure the whole page is about.
    const openGap = Math.max(0, Math.min(day, COLLECT) - PAY);
    const gA = day > PAY ? 1 : 0.25;
    put("FUNDED GAP", xOf((PAY + COLLECT) / 2), -ROW * 1.35, 0.1, gA * 0.8);
    i = labels.write(i, `${Math.round(openGap)}`, xOf((PAY + COLLECT) / 2) - 0.3, -ROW * 1.62, 0.05, 0.2, gA);
    put("days", xOf((PAY + COLLECT) / 2) + 0.28, -ROW * 1.63, 0.11, gA * 0.8);

    while (i < labels.count) labels.hide(i++);
    labels.update(camera);
  },
});
