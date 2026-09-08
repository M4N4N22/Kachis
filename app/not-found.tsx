import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-ink">
      <p className="text-[11px] font-semibold text-brand">Unavailable</p>
      <h1 className="mt-3 text-3xl font-light tracking-tight">
        This workspace could not be found.
      </h1>
      <Link href="/workspace" className="mt-6">
        <Button>Return to workspace</Button>
      </Link>
    </div>
  );
}
