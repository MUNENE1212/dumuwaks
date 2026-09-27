import { MetadataRoute } from 'next';
import { SITE_URL, SERVICES } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ];

  // Service category pages
  const servicePages = SERVICES.map((service) => ({
    url: `${SITE_URL}/services/${service.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Fetch technician IDs for dynamic pages
  let technicianPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(
      `${process.env.API_URL || 'https://dumuwaks.co.ke'}/api/public/technicians?limit=100`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      technicianPages = (data?.data || []).map((tech: { _id: string }) => ({
        url: `${SITE_URL}/technicians/${tech._id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch {
    // Continue without technician pages
  }

  return [...staticPages, ...servicePages, ...technicianPages];
}
