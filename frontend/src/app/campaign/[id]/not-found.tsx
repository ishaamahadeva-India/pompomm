import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function CampaignNotFound() {
  return (
    <main className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl font-bold mb-2">Campaign not found</h1>
      <p className="text-muted mb-6">This campaign may have been removed or the link is incorrect.</p>
      <Link href="/">
        <Button>Back to campaigns</Button>
      </Link>
    </main>
  );
}
