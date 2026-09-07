import type { MetadataRoute } from 'next';

// See app/layout.tsx for the SITE_URL note.
const SITE_URL = 'https://reveala.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
