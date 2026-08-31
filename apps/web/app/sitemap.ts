import type { MetadataRoute } from 'next';

// See app/layout.tsx for the SITE_URL placeholder note.
const SITE_URL = 'https://REPLACE-WITH-YOUR-DOMAIN.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
