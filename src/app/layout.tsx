import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SITE_URL, DEALERSHIP_NAME, DEALERSHIP_LOCALITY, SITE_DESCRIPTION } from "@/lib/site-config";
import ConditionalChatWidget from "@/components/chat/ConditionalChatWidget";
import { Analytics } from "@vercel/analytics/next";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${DEALERSHIP_NAME} — Used Cars in ${DEALERSHIP_LOCALITY}`,
    template: `%s | ${DEALERSHIP_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    siteName: DEALERSHIP_NAME,
    type: 'website',
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const autoDealerJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: DEALERSHIP_NAME,
    url: SITE_URL,
    // TODO(owner): confirm exact street address, hours, and phone before launch.
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Glenview',
      addressRegion: 'IL',
      addressCountry: 'US',
    },
  };

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(autoDealerJsonLd) }}
        />
        {children}
        <ConditionalChatWidget />
        <Analytics />
      </body>
    </html>
  );
}
