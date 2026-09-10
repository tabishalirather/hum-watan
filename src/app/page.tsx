import { MapView } from "@/features/map/components/map-view";
import { db } from "@/db/client";
import { siteSettings } from "@/db/schema/site-settings";
import { eq } from "drizzle-orm";
import { getSiteContent } from "@/features/site-content/lib/site-content";

export default async function Home() {
  const [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
  const content = getSiteContent(settings);
  return <MapView contactRequestMessageEnabled={settings?.contactRequestMessageEnabled ?? false} content={content} />;
}
