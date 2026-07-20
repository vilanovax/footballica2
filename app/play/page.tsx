import Link from "next/link";

export default function PlayPage() {
  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="pt-2">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-secondary">
          Match Day
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
          Choose a Mode
        </h1>
      </header>

      <div className="flex flex-col gap-4">
        <Link
          href="/play/penalty"
          className="btn-fantasy btn-fantasy-secondary w-full text-left"
        >
          <span className="flex w-full flex-col items-start gap-1">
            <span className="text-lg">Penalty Mode</span>
            <span className="text-sm font-semibold opacity-80">
              5 kicks · Correct = Goal
            </span>
          </span>
        </Link>

        <button
          type="button"
          disabled
          className="btn-fantasy btn-fantasy-primary w-full text-left opacity-50"
        >
          <span className="flex w-full flex-col items-start gap-1">
            <span className="text-lg">Quick Match</span>
            <span className="text-sm font-semibold opacity-80">
              5–10 rapid-fire questions · soon
            </span>
          </span>
        </button>
      </div>
    </section>
  );
}
