import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/directory"],
      disallow: [
        "/admin",
        "/admin/*",
        "/booking",
        "/booking/*",
        "/checkout",
        "/checkout/*",
        "/session",
        "/session/*",
        "/counsellor",
        "/counsellor/*",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
