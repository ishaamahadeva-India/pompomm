import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return { title: "Campaign" };
    const campaign = await res.json();
    const title = campaign.title || "Campaign";
    const description = campaign.description || "";
    const url = `${APP_URL}/campaign/${id}`;
    const ogImage = campaign.banner_image_url || undefined;
    return {
      title,
      description: description || undefined,
      openGraph: {
        title,
        description: description || title,
        url,
        siteName: "Pom Pomm",
        type: "website",
        ...(ogImage && { images: [{ url: ogImage }] }),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: description || title,
        ...(ogImage && { images: [ogImage] }),
      },
    };
  } catch {
    return { title: "Campaign" };
  }
}

export default function CampaignLayout({ children }: Props) {
  return <>{children}</>;
}
