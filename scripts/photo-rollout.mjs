// One-time rollout of the Strategy A photo migration (see photo-spike.mjs,
// which proved this end-to-end on 5 VINs) to every vehicle in feed-parsed.json.
// Skips any VIN that already has photos in `vehicles.photos`, so it's safe to
// re-run (won't re-process the 5 the spike already did, or any partial run).
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import sharp from 'sharp';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const feed = JSON.parse(fs.readFileSync(new URL('../feed-parsed.json', import.meta.url), 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));

const { data: existing, error: fetchErr } = await supabase
  .from('vehicles')
  .select('vin, photos')
  .is('deleted_at', null);

if (fetchErr) {
  console.error('Failed to fetch existing vehicles:', fetchErr.message);
  process.exit(1);
}

const existingByVin = new Map(existing.map(v => [v.vin, v]));
const toProcess = feed.filter(f => {
  const v = existingByVin.get(f.vin);
  if (!v) return false; // not in our vehicles table (not currently live/imported) — skip
  const hasPhotos = Array.isArray(v.photos) && v.photos.length > 0;
  return !hasPhotos;
});

console.log(`${feed.length} VINs in feed, ${existing.length} vehicles in DB, ${toProcess.length} need photos.`);

const report = [];

for (const f of toProcess) {
  const vin = f.vin;
  console.log(`\n=== ${vin} (${f.images.length} images in feed) ===`);
  const result = { vin, found: f.images.length, downloaded: 0, uploaded: 0, failed: [], sizes: [] };

  const uploadedUrls = [];

  for (let i = 0; i < f.images.length; i++) {
    const imgUrl = f.images[i];
    try {
      const res = await fetch(imgUrl);
      if (!res.ok) {
        result.failed.push({ i, imgUrl, reason: `HTTP ${res.status}` });
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      result.downloaded++;
      result.sizes.push(buf.length);

      if (buf.length < 20 * 1024) {
        result.failed.push({ i, imgUrl, reason: `too small (${buf.length} bytes, likely placeholder)` });
        continue;
      }

      const resized = await sharp(buf)
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();

      let finalBuf = resized;
      if (finalBuf.length > 400 * 1024) {
        finalBuf = await sharp(buf)
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 65 })
          .toBuffer();
      }
      result.compressedSize = (result.compressedSize || []).concat(finalBuf.length);

      const storagePath = `${vin}/${i + 1}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('vehicles')
        .upload(storagePath, finalBuf, { contentType: 'image/jpeg', upsert: true });

      if (upErr) {
        result.failed.push({ i, imgUrl, reason: `upload error: ${upErr.message}` });
        continue;
      }

      const { data: pub } = supabase.storage.from('vehicles').getPublicUrl(storagePath);
      uploadedUrls.push(pub.publicUrl);
      result.uploaded++;
      console.log(`  [${i + 1}/${f.images.length}] OK ${(buf.length / 1024).toFixed(0)}KB -> ${storagePath}`);
    } catch (e) {
      result.failed.push({ i, imgUrl, reason: e.message });
    }
    await sleep(300);
  }

  if (uploadedUrls.length > 0) {
    const { error: updErr } = await supabase
      .from('vehicles')
      .update({ photos: uploadedUrls })
      .eq('vin', vin);
    if (updErr) console.log(`  DB update FAILED: ${updErr.message}`);
    else console.log(`  DB updated: vehicles.photos set to ${uploadedUrls.length} URLs`);
  }

  report.push(result);
  await sleep(500);
}

console.log('\n\n=== FINAL REPORT ===');
let successCount = 0;
for (const r of report) {
  console.log(`${r.vin}: found=${r.found} downloaded=${r.downloaded} uploaded=${r.uploaded} failed=${r.failed.length}`);
  if (r.failed.length) r.failed.forEach(f => console.log(`   - #${f.i}: ${f.reason}`));
  if (r.uploaded > 0) successCount++;
}
const cleanSuccesses = report.filter(r => r.uploaded === r.found).length;
console.log(`\nCars with 100% clean success: ${cleanSuccesses}/${report.length}`);
console.log(`Cars with at least some photos: ${successCount}/${report.length}`);
console.log(`Skipped (already had photos or not in DB): ${feed.length - toProcess.length}`);

fs.writeFileSync('./photo-rollout-report.json', JSON.stringify(report, null, 2));
