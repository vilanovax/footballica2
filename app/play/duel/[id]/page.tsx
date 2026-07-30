import { redirect, notFound } from "next/navigation";
import { getClubSnapshot, getCurrentUser, hasClub } from "@/lib/player/current";
import { getDuel } from "@/actions/duel/getDuel";
import { DuelArena } from "@/components/duel/DuelArena";

export const dynamic = "force-dynamic";

type DuelDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DuelDetailPage({ params }: DuelDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await hasClub())) redirect("/onboarding");

  const { id } = await params;
  const [res, club] = await Promise.all([getDuel(id), getClubSnapshot()]);
  if (!res.ok) {
    if (res.error === "not_found" || res.error === "forbidden") notFound();
    redirect("/login");
  }

  return (
    <DuelArena
      duelId={res.duel.id}
      initialDuel={res.duel}
      initialQuestions={res.questions}
      initialMemoryBoard={res.memoryBoard ?? null}
      initialMemoryEndsAt={res.memoryEndsAt ?? null}
      initialMemoryRevealMs={res.memoryRevealMs ?? null}
      yourAvatar={club?.avatar}
      yourName={club?.name}
    />
  );
}
