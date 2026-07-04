import { AuthGuard } from "@/components/auth/auth-guard";
import { DeckDetailClient } from "./_components/deck-detail-client";

export default async function DeckDetailPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return (
    <AuthGuard>
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-6 py-6">
        <DeckDetailClient deckId={deckId} />
      </div>
    </AuthGuard>
  );
}
