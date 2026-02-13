import type { Metadata } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE}/distribution/campaigns/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return { title: "Distribution campaign" };
    const campaign = await res.json();
    const title = campaign.title || "Distribution campaign";
    const description = campaign.description || "Check this campaign";
    const url = `${APP_URL}/distribution/${id}`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: "Pom Pomm",
        type: "website",
        ...(campaign.banner && { images: [{ url: campaign.banner }] }),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(campaign.banner && { images: [campaign.banner] }),
      },
    };
  } catch {
    return { title: "Distribution campaign" };
  }
}

export default function DistributionCampaignLayout({ children }: Props) {
  return <>{children}</>;
}
