import { AuthGuard } from "@/components/auth/auth-guard";
import { StudyClient } from "./_components/study-client";

export default async function StudyPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  return (
    <AuthGuard>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 py-6">
        <StudyClient deckId={deckId} />
      </div>
    </AuthGuard>
  );
}
