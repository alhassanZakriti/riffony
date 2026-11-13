import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <article className="prose-invert mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-[32px] font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-muted">
        RIFFLEX currently runs as a local-first web application. Training progress, settings, and daily puzzle
        results are stored in your browser’s local storage on this device. We do not operate a cloud account database in
        this build.
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">
        Microphone and MIDI access are requested only when you open modules that need them, and audio processing happens
        in your browser. Clearing site data removes your local progress.
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">
        This policy will be updated when cloud authentication or paid subscriptions are introduced.
      </p>
    </article>
  );
}
