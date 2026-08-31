import { MetadataRoute } from "next";

type Counsellor = {
  id: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Static routes
  const routes = [
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${siteUrl}/directory`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
  ];

  // Dynamic routes (counsellor profiles)
  try {
    const res = await fetch(`${apiBase}/api/counsellors`, {
      cache: "no-store",
    });
    if (res.ok) {
      const counsellors = (await res.json()) as Counsellor[];
      if (Array.isArray(counsellors)) {
        counsellors.forEach((c) => {
          routes.push({
            url: `${siteUrl}/directory/${c.id}`,
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.6,
          });
        });
      }
    }
  } catch (e) {
    console.error("Failed to fetch counsellors for sitemap:", e);
  }

  return routes;
}
