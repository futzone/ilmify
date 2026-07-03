import { AuthGuard } from "@/components/auth/auth-guard";
import { DecksHeader } from "./_components/decks-header";
import { DecksClient } from "./_components/decks-client";

export default function DecksPage() {
  return (
    <AuthGuard>
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-6 py-6">
        <DecksHeader />
        <DecksClient />
      </div>
    </AuthGuard>
  );
}
