"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import {
  deleteAdminRecordChallenge,
  toggleAdminRecordChallengeActive,
  upsertAdminRecordChallenge,
  type AdminCategoryOption,
  type AdminRecordChallenge,
} from "@/actions/admin/challenges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminHelpTip, FieldLabel } from "@/components/admin/AdminHelpTip";

type ChallengesPanelProps = {
  initialChallenges: AdminRecordChallenge[];
  categories: AdminCategoryOption[];
};

type FormState = {
  id?: string;
  slug: string;
  titleEn: string;
  titleFa: string;
  descriptionEn: string;
  descriptionFa: string;
  unlockCostCoins: string;
  targetScore: string;
  rewardBadgeSlug: string;
  rewardBadgeEmoji: string;
  themeKey: string;
  preferredTypes: string[];
  formatBiasEveryN: string;
  categoryIds: string[];
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
};

const FORMAT_TYPES = [
  "IMAGE",
  "CAREER_PATH",
  "HIGHER_LOWER",
  "REVEAL_IMAGE",
] as const;

const THEME_OPTIONS = [
  { value: "", label: "NONE (plain challenge)" },
  { value: "logo", label: "LOGO_WEEK" },
  { value: "stadium", label: "STADIUM_WEEK" },
  { value: "career", label: "CAREER_WEEK" },
  { value: "formats", label: "FORMATS_WEEK" },
] as const;

const EMPTY: FormState = {
  slug: "",
  titleEn: "",
  titleFa: "",
  descriptionEn: "",
  descriptionFa: "",
  unlockCostCoins: "500",
  targetScore: "20",
  rewardBadgeSlug: "",
  rewardBadgeEmoji: "🏆",
  themeKey: "",
  preferredTypes: [],
  formatBiasEveryN: "",
  categoryIds: [],
  isActive: true,
  startsAt: "",
  expiresAt: "",
};

const EMOJI_PRESETS = ["🏆", "👑", "💎", "⭐", "🔥", "⚽", "🏅", "💙", "🎯", "🛡️"];

const DRAFT_KEY = "__draft__";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function challengeToForm(c: AdminRecordChallenge): FormState {
  return {
    id: c.id,
    slug: c.slug,
    titleEn: c.titleEn,
    titleFa: c.titleFa,
    descriptionEn: c.descriptionEn,
    descriptionFa: c.descriptionFa,
    unlockCostCoins: String(c.unlockCostCoins),
    targetScore: String(c.targetScore),
    rewardBadgeSlug: c.rewardBadgeSlug ?? "",
    rewardBadgeEmoji: c.rewardBadgeEmoji ?? "🏆",
    themeKey: c.themeKey ?? "",
    preferredTypes: [...c.preferredTypes],
    formatBiasEveryN:
      c.formatBiasEveryN != null ? String(c.formatBiasEveryN) : "",
    categoryIds: [...c.categoryIds],
    isActive: c.isActive,
    startsAt: toDatetimeLocal(c.startsAt),
    expiresAt: toDatetimeLocal(c.expiresAt),
  };
}

function slugToBadgeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

function scheduleLabel(c: AdminRecordChallenge): string {
  const now = Date.now();
  const start = new Date(c.startsAt).getTime();
  const end = c.expiresAt ? new Date(c.expiresAt).getTime() : null;
  if (!c.isActive) return "Off";
  if (Number.isFinite(start) && start > now) return "Scheduled";
  if (end != null && end < now) return "Expired";
  return "Live";
}

function scheduleTone(
  label: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (label === "Live") return "default";
  if (label === "Expired") return "destructive";
  if (label === "Scheduled") return "outline";
  return "secondary";
}

export function ChallengesPanel({
  initialChallenges,
  categories,
}: ChallengesPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(initialChallenges);
  const [openId, setOpenId] = useState<string | null>(
    () => initialChallenges[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<FormState | null>(null);

  useEffect(() => {
    setRows(initialChallenges);
  }, [initialChallenges]);

  const liveCount = useMemo(
    () => rows.filter((c) => scheduleLabel(c) === "Live").length,
    [rows],
  );

  function refresh() {
    router.refresh();
  }

  function startCreate() {
    setDraft({ ...EMPTY });
    setOpenId(DRAFT_KEY);
  }

  function cancelDraft() {
    setDraft(null);
    setOpenId(rows[0]?.id ?? null);
  }

  function handleSave(form: FormState, onDone?: () => void) {
    startTransition(async () => {
      const slug = form.slug.trim().toLowerCase();
      const biasRaw = form.formatBiasEveryN.trim();
      const biasN = biasRaw ? Number(biasRaw) : null;
      const res = await upsertAdminRecordChallenge({
        id: form.id,
        slug,
        titleEn: form.titleEn.trim(),
        titleFa: form.titleFa.trim(),
        descriptionEn: form.descriptionEn.trim(),
        descriptionFa: form.descriptionFa.trim(),
        unlockCostCoins: Number(form.unlockCostCoins) || 0,
        targetScore: Number(form.targetScore) || 1,
        rewardBadgeSlug:
          form.rewardBadgeSlug.trim() || slugToBadgeSlug(slug) || null,
        rewardBadgeEmoji: form.rewardBadgeEmoji.trim() || "🏆",
        themeKey: (form.themeKey || null) as
          | "logo"
          | "stadium"
          | "career"
          | "formats"
          | null,
        preferredTypes: form.preferredTypes.filter((t) =>
          (FORMAT_TYPES as readonly string[]).includes(t),
        ) as Array<
          "IMAGE" | "CAREER_PATH" | "HIGHER_LOWER" | "REVEAL_IMAGE"
        >,
        formatBiasEveryN:
          biasN != null && Number.isFinite(biasN) ? Math.round(biasN) : null,
        categoryIds: form.categoryIds,
        isActive: form.isActive,
        startsAt: fromDatetimeLocal(form.startsAt),
        expiresAt: fromDatetimeLocal(form.expiresAt),
      });
      if (!res.ok) {
        toast.error(`Save failed: ${res.error}`);
        return;
      }
      toast.success(form.id ? "Challenge updated" : "Challenge created");
      onDone?.();
      refresh();
    });
  }

  function handleToggle(c: AdminRecordChallenge) {
    startTransition(async () => {
      const res = await toggleAdminRecordChallengeActive(c.id, !c.isActive);
      if (!res.ok) {
        toast.error("Could not toggle");
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === c.id ? { ...row, isActive: !row.isActive } : row,
        ),
      );
      toast.success(c.isActive ? "Deactivated" : "Activated");
    });
  }

  function handleDelete(c: AdminRecordChallenge) {
    if (!window.confirm(`Delete “${c.titleEn}”? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteAdminRecordChallenge(c.id);
      if (!res.ok) {
        toast.error("Delete failed");
        return;
      }
      toast.success("Deleted");
      if (openId === c.id) setOpenId(null);
      refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Player-facing explainer */}
      <Card className="overflow-hidden border-amber-200 bg-linear-to-br from-amber-50 via-white to-orange-50/60">
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl shadow-sm ring-1 ring-amber-200/80">
            👑
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              What players see
              <AdminHelpTip text="On Play, each live challenge shows unlock cost → Survival run (1 stamina) → badge when they hit the target score." />
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              Unlock once with coins · run with stamina · conquer for a badge.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge className="bg-amber-600 hover:bg-amber-600">
              {liveCount} live
            </Badge>
            <Badge variant="outline">{rows.length} total</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Campaigns</h2>
          <p className="text-xs text-slate-500">
            Collapse to scan · expand to edit economy & schedule.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pending || draft != null}
          onClick={startCreate}
          className="shrink-0 gap-1"
        >
          <Plus className="h-4 w-4" />
          New challenge
        </Button>
      </div>

      {rows.length === 0 && draft == null && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-4xl" aria-hidden>
              🏆
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                No premium challenges yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Create “تاج آبی” or “Road to Euro” — players unlock them on Play.
              </p>
            </div>
            <Button type="button" size="sm" className="gap-1" onClick={startCreate}>
              <Plus className="h-4 w-4" />
              Create first challenge
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {draft != null && (
          <ChallengeEditorCard
            mode="create"
            open={openId === DRAFT_KEY}
            pending={pending}
            categories={categories}
            form={draft}
            onToggleOpen={() =>
              setOpenId((id) => (id === DRAFT_KEY ? null : DRAFT_KEY))
            }
            onChange={setDraft}
            onSave={() =>
              handleSave(draft, () => {
                setDraft(null);
                setOpenId(null);
              })
            }
            onCancel={cancelDraft}
          />
        )}

        {rows.map((c) => {
          const open = openId === c.id;
          return (
            <ChallengeRow
              key={c.id}
              challenge={c}
              open={open}
              pending={pending}
              categories={categories}
              onToggleOpen={() =>
                setOpenId((id) => (id === c.id ? null : c.id))
              }
              onToggleActive={() => handleToggle(c)}
              onDelete={() => handleDelete(c)}
              onSave={(form) => handleSave(form)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChallengeRow({
  challenge,
  open,
  pending,
  categories,
  onToggleOpen,
  onToggleActive,
  onDelete,
  onSave,
}: {
  challenge: AdminRecordChallenge;
  open: boolean;
  pending: boolean;
  categories: AdminCategoryOption[];
  onToggleOpen: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onSave: (form: FormState) => void;
}) {
  const [form, setForm] = useState(() => challengeToForm(challenge));
  const status = scheduleLabel(challenge);

  useEffect(() => {
    if (open) setForm(challengeToForm(challenge));
  }, [open, challenge]);

  return (
    <ChallengeEditorCard
      mode="edit"
      open={open}
      pending={pending}
      categories={categories}
      form={form}
      challenge={challenge}
      status={status}
      onToggleOpen={onToggleOpen}
      onChange={setForm}
      onSave={() => onSave(form)}
      onCancel={onToggleOpen}
      onToggleActive={onToggleActive}
      onDelete={onDelete}
    />
  );
}

function ChallengeEditorCard({
  mode,
  open,
  pending,
  categories,
  form,
  challenge,
  status,
  onToggleOpen,
  onChange,
  onSave,
  onCancel,
  onToggleActive,
  onDelete,
}: {
  mode: "create" | "edit";
  open: boolean;
  pending: boolean;
  categories: AdminCategoryOption[];
  form: FormState;
  challenge?: AdminRecordChallenge;
  status?: string;
  onToggleOpen: () => void;
  onChange: (form: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
}) {
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value });
  }

  function handleSlugChange(value: string) {
    const next = { ...form, slug: value };
    if (
      mode === "create" &&
      (!form.rewardBadgeSlug ||
        form.rewardBadgeSlug === slugToBadgeSlug(form.slug))
    ) {
      next.rewardBadgeSlug = slugToBadgeSlug(value);
    }
    onChange(next);
  }

  const emoji = form.rewardBadgeEmoji || challenge?.rewardBadgeEmoji || "🏆";
  const titleEn = form.titleEn || challenge?.titleEn || "New challenge";
  const titleFa = form.titleFa || challenge?.titleFa || "";

  return (
    <Card
      className={[
        "overflow-hidden transition-shadow",
        mode === "create" ? "border-amber-300 ring-1 ring-amber-200/80" : "",
        open ? "shadow-md" : "hover:shadow-sm",
        status === "Off" || status === "Expired" ? "opacity-80" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-start"
      >
        <span
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm ring-1",
            mode === "create"
              ? "bg-amber-100 ring-amber-200"
              : "bg-slate-100 ring-slate-200",
          ].join(" ")}
          aria-hidden
        >
          {emoji}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">
              {mode === "create" ? "New premium challenge" : titleEn}
            </p>
            {mode === "edit" && status && (
              <Badge variant={scheduleTone(status)} className="text-[10px]">
                {status}
              </Badge>
            )}
            {mode === "create" && (
              <Badge variant="outline" className="text-[10px]">
                Draft
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {mode === "create" ? (
              "Fill identity → economy → badge → save"
            ) : (
              <>
                <span dir="rtl">{titleFa}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-mono">{challenge?.slug}</span>
              </>
            )}
          </p>
        </div>

        {mode === "edit" && challenge && (
          <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
            <div className="flex flex-wrap justify-end gap-1">
              <StatPill>💰 {challenge.unlockCostCoins}</StatPill>
              <StatPill>🎯 {challenge.targetScore}</StatPill>
              <StatPill>
                {challenge.categoryIds.length === 0
                  ? "Any bank"
                  : challenge.categoryIds.length === 1
                    ? challenge.categoryLabels[0] ?? "1 bank"
                    : `${challenge.categoryIds.length} banks`}
              </StatPill>
            </div>
            <p className="text-[11px] tabular-nums text-slate-500">
              {challenge.unlockCount} unlocked · {challenge.conquerCount}{" "}
              conquered
            </p>
          </div>
        )}

        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {open && (
        <CardContent className="space-y-5 border-t bg-slate-50/50 px-4 py-4">
          {/* Identity */}
          <Section title="Identity" tip="Slug is the stable key in URLs and Live-Ops. Titles show on Play.">
            <Field tip="kebab-case, e.g. blue-crown">
              <FieldLabel tip="Cannot easily change later — used in analytics & links.">
                Slug
              </FieldLabel>
              <Input
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="blue-crown"
                className="font-mono text-sm"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>Title EN</FieldLabel>
                <Input
                  value={form.titleEn}
                  onChange={(e) => setField("titleEn", e.target.value)}
                  placeholder="Blue Crown"
                />
              </Field>
              <Field>
                <FieldLabel>Title FA</FieldLabel>
                <Input
                  value={form.titleFa}
                  onChange={(e) => setField("titleFa", e.target.value)}
                  placeholder="تاج آبی"
                  dir="rtl"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel tip="One short line under the title on Play.">
                  Pitch EN
                </FieldLabel>
                <Input
                  value={form.descriptionEn}
                  onChange={(e) => setField("descriptionEn", e.target.value)}
                  placeholder="Hit 20 in Survival to claim the crown."
                />
              </Field>
              <Field>
                <FieldLabel>Pitch FA</FieldLabel>
                <Input
                  value={form.descriptionFa}
                  onChange={(e) => setField("descriptionFa", e.target.value)}
                  placeholder="با امتیاز ۲۰ تاج را بگیر."
                  dir="rtl"
                />
              </Field>
            </div>
          </Section>

          {/* Economy */}
          <Section
            title="Economy"
            tip="Hybrid loop: pay coins once to unlock, then each Survival attempt costs 1 stamina."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel tip="One-time coin price to unlock this challenge.">
                  Unlock cost
                </FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2 text-sm">
                    💰
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={form.unlockCostCoins}
                    onChange={(e) =>
                      setField("unlockCostCoins", e.target.value)
                    }
                    className="ps-9"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel tip="Survival score needed to conquer and earn the badge.">
                  Target score
                </FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2 text-sm">
                    🎯
                  </span>
                  <Input
                    type="number"
                    min={1}
                    value={form.targetScore}
                    onChange={(e) => setField("targetScore", e.target.value)}
                    className="ps-9"
                  />
                </div>
              </Field>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600">
              Preview: unlock{" "}
              <strong>💰 {form.unlockCostCoins || 0}</strong> → survive to{" "}
              <strong>🎯 {form.targetScore || 1}</strong> → badge{" "}
              <strong>
                {form.rewardBadgeEmoji || "🏆"}{" "}
                {form.rewardBadgeSlug || slugToBadgeSlug(form.slug) || "…"}
              </strong>
            </div>
          </Section>

          {/* Trophy */}
          <Section title="Trophy badge" tip="Granted once when the player first hits the target score.">
            <Field>
              <FieldLabel>Emoji</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.map((e) => {
                  const selected = form.rewardBadgeEmoji === e;
                  return (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setField("rewardBadgeEmoji", e)}
                      className={[
                        "flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all",
                        selected
                          ? "bg-amber-100 ring-2 ring-amber-400 scale-105"
                          : "bg-white ring-1 ring-slate-200 hover:bg-slate-50",
                      ].join(" ")}
                      aria-label={`Badge ${e}`}
                      aria-pressed={selected}
                    >
                      {e}
                    </button>
                  );
                })}
                <Input
                  value={form.rewardBadgeEmoji}
                  onChange={(e) => setField("rewardBadgeEmoji", e.target.value)}
                  className="h-10 w-16 text-center text-lg"
                  aria-label="Custom emoji"
                />
              </div>
            </Field>
            <Field>
              <FieldLabel tip="Stable id stored on ClubBadge. Auto-fills from slug.">
                Badge slug
              </FieldLabel>
              <Input
                value={form.rewardBadgeSlug}
                onChange={(e) => setField("rewardBadgeSlug", e.target.value)}
                placeholder="blue_crown"
                className="font-mono text-sm"
              />
            </Field>
          </Section>

          {/* Theme week (Phase C) */}
          <Section
            title="Theme week"
            tip="Biases Survival draws inside this challenge toward visual formats. Empty preferred types → use the theme preset."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel tip="Preset sets default preferred types + denser bias (~1/2).">
                  Theme
                </FieldLabel>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={form.themeKey}
                  onChange={(e) => setField("themeKey", e.target.value)}
                >
                  {THEME_OPTIONS.map((o) => (
                    <option key={o.value || "none"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel tip="Leave blank for theme default (usually 2). Global default is 5.">
                  Format bias every N
                </FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  placeholder="auto"
                  value={form.formatBiasEveryN}
                  onChange={(e) => setField("formatBiasEveryN", e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel tip="Override which formats get priority. Leave empty to use the theme preset.">
                Preferred formats
              </FieldLabel>
              <div className="flex flex-wrap gap-2 pt-1">
                {FORMAT_TYPES.map((t) => {
                  const on = form.preferredTypes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setField(
                          "preferredTypes",
                          on
                            ? form.preferredTypes.filter((x) => x !== t)
                            : [...form.preferredTypes, t],
                        )
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        on
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>

          {/* Scope + schedule */}
          <Section title="Scope & schedule">
            <Field>
              <FieldLabel tip="None selected = any public Survival bank. One bank = skip picker. Two+ = scoped picker.">
                Categories
              </FieldLabel>
              <CategoryMultiSelect
                categories={categories}
                selected={form.categoryIds}
                onChange={(ids) => setField("categoryIds", ids)}
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                {form.categoryIds.length === 0
                  ? "Players pick any public category."
                  : form.categoryIds.length === 1
                    ? "1 bank → player skips the picker and starts immediately."
                    : `${form.categoryIds.length} banks → player picks among these only.`}
              </p>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel tip="Leave empty to go live immediately when Active.">
                  Starts
                </FieldLabel>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setField("startsAt", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel tip="Optional end. Empty = no expiry.">
                  Expires
                </FieldLabel>
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setField("expiresAt", e.target.value)}
                />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
                className="size-4 rounded border-slate-300"
              />
              <span className="font-medium">Active</span>
              <span className="text-xs text-slate-500">
                — visible on Play when inside the schedule window
              </span>
            </label>
          </Section>

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <Button type="button" disabled={pending} onClick={onSave}>
              {mode === "create" ? "Create challenge" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onCancel}
            >
              {mode === "create" ? "Discard" : "Close"}
            </Button>
            {mode === "edit" && onToggleActive && (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={onToggleActive}
                className="ms-auto"
              >
                {form.isActive ? "Deactivate" : "Activate"}
              </Button>
            )}
            {mode === "edit" && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                disabled={pending}
                onClick={onDelete}
                aria-label="Delete challenge"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function Section({
  title,
  tip,
  children,
}: {
  title: string;
  tip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
        {tip ? <AdminHelpTip text={tip} /> : null}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  children,
  tip,
}: {
  children: React.ReactNode;
  tip?: string;
}) {
  return (
    <div className="space-y-1" title={tip}>
      {children}
    </div>
  );
}

function CategoryMultiSelect({
  categories,
  selected,
  onChange,
}: {
  categories: AdminCategoryOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  if (categories.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
        No active categories. Create one under Categories first.
      </p>
    );
  }

  return (
    <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
      {categories.map((cat) => {
        const on = selected.includes(cat.id);
        return (
          <label
            key={cat.id}
            className={[
              "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
              on ? "bg-amber-50" : "hover:bg-slate-50",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggle(cat.id)}
              className="size-4 rounded border-slate-300"
            />
            <span className="min-w-0 flex-1">
              <span className="font-medium text-slate-800">{cat.nameEn}</span>
              <span className="ms-1.5 text-xs text-slate-500" dir="rtl">
                {cat.nameFa}
              </span>
            </span>
            <span className="flex shrink-0 flex-wrap justify-end gap-1">
              {cat.locales.includes("en") ? (
                <Badge variant="outline" className="text-[10px]">
                  EN
                </Badge>
              ) : null}
              {cat.locales.includes("fa") ? (
                <Badge variant="outline" className="text-[10px]">
                  FA
                </Badge>
              ) : null}
              {cat.challengeOnly ? (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-[10px] text-amber-800"
                >
                  Challenge
                </Badge>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-700">
      {children}
    </span>
  );
}
