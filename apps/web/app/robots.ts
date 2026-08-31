import type { MetadataRoute } from 'next';

// See app/layout.tsx for the SITE_URL placeholder note.
const SITE_URL = 'https://REPLACE-WITH-YOUR-DOMAIN.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
