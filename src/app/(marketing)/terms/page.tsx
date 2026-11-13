import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-[32px] font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-muted">
        RIFFONY is provided as early-access software for personal musical practice. Features may change. Progress
        stored locally can be lost if you clear browser data or switch devices.
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">
        Daily puzzles are shared challenges scored for learning and engagement. Do not attempt to manipulate scoring
        systems for unfair advantage in any future competitive features.
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">
        These terms will expand when paid plans and cloud services launch.
      </p>
    </article>
  );
}
