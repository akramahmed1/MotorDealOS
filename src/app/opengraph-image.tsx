import { ImageResponse } from 'next/og';
import { DEALERSHIP_NAME, DEALERSHIP_LOCALITY } from '@/lib/site-config';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Placeholder OG image (text-on-solid-background) — replace with a real photo once available.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -1 }}>{DEALERSHIP_NAME}</div>
        <div style={{ display: 'flex', fontSize: 32, marginTop: 20, color: '#94a3b8' }}>
          Quality Used Vehicles &bull; {DEALERSHIP_LOCALITY}
        </div>
      </div>
    ),
    { ...size }
  );
}
