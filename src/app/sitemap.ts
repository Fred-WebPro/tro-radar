import type { MetadataRoute } from "next";
import { topPlaintiffs } from "@/lib/repo";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const brands = await topPlaintiffs(200);
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/recent`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/plaintiffs`, changeFrequency: "daily", priority: 0.8 },
    ...brands.map((b) => ({
      url: `${SITE_URL}/check?q=${encodeURIComponent(b.brand)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
