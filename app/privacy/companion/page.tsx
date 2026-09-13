import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.companionPrivacy.title,
  description: copy.companionPrivacy.meta,
};

export default function CompanionPrivacyPage() {
  const sections = copy.companionPrivacy.sections;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <p className="text-[12px] text-muted-fg">
        <Link href="/" className="hover:text-ink">
          Kachis
        </Link>
        {" · "}
        <Link href="/integrations" className="hover:text-ink">
          {copy.integrations.title}
        </Link>
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">
        {copy.companionPrivacy.title}
      </h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-fg">
        {copy.companionPrivacy.intro}
      </p>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              {section.title}
            </h2>
            <p className="mt-2 text-[14px] leading-7 text-muted-fg">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-12 text-[12px] text-muted-fg">
        {copy.companionPrivacy.updated}
      </p>
    </main>
  );
}
