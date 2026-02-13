import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-muted mb-6">This page could not be found.</p>
      <Link href="/">
        <Button>Back to home</Button>
      </Link>
    </main>
  );
}
