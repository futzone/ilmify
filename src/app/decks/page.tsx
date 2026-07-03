import { ThemeToggle } from "@/components/theme-toggle";
import { DecksClient } from "./_components/decks-client";

export default function DecksPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-6 py-6">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <DecksClient />
    </div>
  );
}
