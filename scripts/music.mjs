// Music: renders songs offline in Chromium and reports levels (peak, loudness per stretch,
// each instrument alone), and writes a WAV of each to /tmp.
//   node scripts/music.mjs [song ...]   (default: varek1, then varek1 switching into varek2)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const code = readFileSync(new URL('../src/music.js', import.meta.url), 'utf8').replace(/^export /gm, '');
const b = await chromium.launch({ executablePath: '/home/h-e-r-b-i-e/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome' });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await p.setContent('<html><body></body></html>');
await p.addScriptTag({ content: code + '\nwindow.Music = Music;' });

// plan: [[time, song], ...]; solo: instrument names or null
const render = (plan, dur, solo = null) => p.evaluate(async ({ plan, dur, solo }) => {
  const sr = 44100, ctx = new OfflineAudioContext(2, sr * dur, sr);
  const m = new Music(ctx, ctx.destination); m.offline = true;
  if (solo) m.solo = new Set(solo);
  for (const [t, song] of plan) { m.tick(t); if (!m.cur) { m.play(song, 0.01); } else m.play(song); }
  m.tick(dur);
  const buf = await ctx.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let peak = 0;
  const win = sr * 2, rms = [];
  for (let w = 0; w < L.length; w += win) {
    let s = 0, n = 0;
    for (let i = w; i < Math.min(w + win, L.length); i++) { const x = (L[i] + R[i]) / 2; s += x * x; n++; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
    rms.push(+(20 * Math.log10(Math.sqrt(s / n) + 1e-9)).toFixed(1));
  }
  let pcm = null; // interleaved 16-bit, base64
  if (!solo) {
    const a = new Int16Array(L.length * 2);
    for (let i = 0; i < L.length; i++) { a[2 * i] = Math.max(-1, Math.min(1, L[i])) * 32767; a[2 * i + 1] = Math.max(-1, Math.min(1, R[i])) * 32767; }
    const u = new Uint8Array(a.buffer); let bin = '';
    for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000));
    pcm = btoa(bin);
  }
  return { peak: +(20 * Math.log10(peak)).toFixed(1), rms, pcm };
}, { plan, dur, solo });

const wav = (file, b64) => {
  const pcm = Buffer.from(b64, 'base64'), sr = 44100, n = pcm.length / 2, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  pcm.copy(buf, 44);
  writeFileSync(file, buf);
};

const runs = {
  varek1: { plan: [[0, 'varek1']], dur: 60 },
  'varek1-2': { plan: [[0, 'varek1'], [20, 'varek2']], dur: 70 },
};
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(runs)) {
  const r = runs[name];
  const full = await render(r.plan, r.dur);
  console.log(`${name}: peak ${full.peak} dB, loudness per 2 s:`, full.rms.join(' '));
  wav(`/tmp/${name}.wav`, full.pcm);
  for (const inst of ['lead', 'harm', 'arp', 'bass', 'strings', 'choir', 'brass', 'bell', 'timp', 'kick', 'snare', 'hat', 'crash']) {
    const s = await render(r.plan, r.dur, [inst]);
    const loud = s.rms.filter((x) => x > -80);
    if (loud.length) console.log('  ' + inst.padEnd(8), 'peak', String(s.peak).padStart(6), ' avg', (loud.reduce((a, x) => a + x, 0) / loud.length).toFixed(1));
  }
}
await b.close();
