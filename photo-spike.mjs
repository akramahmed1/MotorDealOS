import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import sharp from 'sharp';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const feed = JSON.parse(fs.readFileSync(new URL('./feed-parsed.json', import.meta.url), 'utf8'));
const feedByVin = new Map(feed.map(f => [f.vin, f]));

const SPIKE_VINS = [
  'JTJHT00W764019528', // 2006 Lexus LX 470
  'JTHCK262472014802', // 2007 Lexus IS 250
  '2FMGK5BC8BBD10648', // 2011 Ford Flex
  '1C4RJFCT2DC604148', // 2013 Jeep Grand Cherokee
  'WP1AD2A22DLA75452', // 2013 Porsche Cayenne GTS
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

const report = [];

for (const vin of SPIKE_VINS) {
  const f = feedByVin.get(vin);
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
  const ok = r.uploaded >= Math.ceil(r.found * 0.8); // per-car own threshold not required, just report
  console.log(`${r.vin}: found=${r.found} downloaded=${r.downloaded} uploaded=${r.uploaded} failed=${r.failed.length}`);
  if (r.failed.length) r.failed.forEach(f => console.log(`   - #${f.i}: ${f.reason}`));
  if (r.uploaded > 0) successCount++;
}
const cleanSuccesses = report.filter(r => r.uploaded === r.found).length;
console.log(`\nCars with 100% clean success: ${cleanSuccesses}/${report.length} = ${(cleanSuccesses / report.length * 100).toFixed(0)}%`);
console.log(`Cars with at least some photos: ${successCount}/${report.length}`);

fs.writeFileSync('./photo-spike-report.json', JSON.stringify(report, null, 2));
