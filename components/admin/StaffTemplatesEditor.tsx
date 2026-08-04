"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import type { GameConfig, StaffTemplateConfig } from "@/lib/game/economy";
import { mergeGameConfig } from "@/lib/game/economy";
import { MANAGER_AVATARS } from "@/lib/onboarding/avatars";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

type StaffTemplatesEditorProps = {
  draft: GameConfig;
  setDraft: React.Dispatch<React.SetStateAction<GameConfig>>;
};

function patchTemplates(
  prev: GameConfig,
  templates: StaffTemplateConfig[],
): GameConfig {
  return mergeGameConfig({
    ...prev,
    businessEconomy: {
      ...prev.businessEconomy,
      staff: {
        ...prev.businessEconomy.staff,
        templates,
      },
    },
  });
}

function newTemplateKey(existing: StaffTemplateConfig[]): string {
  let i = 1;
  const keys = new Set(existing.map((t) => t.key));
  while (keys.has(`staff_${i}`)) i += 1;
  return `staff_${i}`;
}

/**
 * Compact admin catalog — row summary + expand to edit.
 */
export function StaffTemplatesEditor({
  draft,
  setDraft,
}: StaffTemplatesEditorProps) {
  const templates = draft.businessEconomy.staff.templates;
  const [openKey, setOpenKey] = useState<string | null>(templates[0]?.key ?? null);

  function updateAt(index: number, patch: Partial<StaffTemplateConfig>) {
    setDraft((prev) => {
      const next = prev.businessEconomy.staff.templates.map((t, i) =>
        i === index ? { ...t, ...patch } : t,
      );
      return patchTemplates(prev, next);
    });
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= templates.length) return;
    setDraft((prev) => {
      const next = [...prev.businessEconomy.staff.templates];
      const tmp = next[index]!;
      next[index] = next[j]!;
      next[j] = tmp;
      return patchTemplates(prev, next);
    });
  }

  function remove(index: number) {
    if (templates.length <= 1) return;
    const removed = templates[index]!;
    setDraft((prev) => {
      const next = prev.businessEconomy.staff.templates.filter(
        (_, i) => i !== index,
      );
      return patchTemplates(prev, next);
    });
    if (openKey === removed.key) setOpenKey(null);
  }

  function add() {
    setDraft((prev) => {
      const list = prev.businessEconomy.staff.templates;
      const key = newTemplateKey(list);
      const row: StaffTemplateConfig = {
        key,
        role: "MANAGER",
        rateBonusPercent: 10,
        avatarKey: "TACTICAL_COACH",
        nameEn: "New Manager",
        nameFa: "مدیر جدید",
        hireCost: 250,
      };
      setOpenKey(key);
      return patchTemplates(prev, [...list, row]);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-xs font-bold text-slate-700">
          Catalog · {templates.length}
          <AdminHelpTip text="Tap a row to edit. ↑↓ reorder = hire list order. Save Game Config to publish." />
        </p>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 bg-indigo-600 text-xs hover:bg-indigo-700"
          onClick={add}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-indigo-200 bg-white">
        {templates.map((row, index) => {
          const av = MANAGER_AVATARS.find((a) => a.key === row.avatarKey);
          const expanded = openKey === row.key;
          return (
            <div
              key={`${row.key}-${index}`}
              className={[
                "border-b border-slate-100 last:border-b-0",
                expanded ? "bg-indigo-50/40" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 px-2.5 py-2">
                <button
                  type="button"
                  onClick={() =>
                    setOpenKey(expanded ? null : row.key)
                  }
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-start"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={av?.image ?? "/avatars/tactical-coach.png"}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-slate-900">
                        {row.nameFa}
                      </span>
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        {row.role === "TREASURER" ? "Treasurer" : "Manager"}
                      </span>
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {row.nameEn} · +{row.rateBonusPercent}% ·{" "}
                      {row.hireCost} Funds
                    </span>
                  </span>
                  <ChevronDown
                    className={[
                      "h-4 w-4 shrink-0 text-slate-400 transition",
                      expanded ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>
                <div className="flex shrink-0 items-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={index >= templates.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-rose-600"
                    disabled={templates.length <= 1}
                    onClick={() => remove(index)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {expanded && (
                <div className="grid gap-2 border-t border-indigo-100 px-3 pb-3 pt-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-0.5 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Name FA
                    </span>
                    <Input
                      value={row.nameFa}
                      onChange={(e) =>
                        updateAt(index, { nameFa: e.target.value })
                      }
                      className="h-8 text-sm"
                      dir="rtl"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Name EN
                    </span>
                    <Input
                      value={row.nameEn}
                      onChange={(e) =>
                        updateAt(index, { nameEn: e.target.value })
                      }
                      className="h-8 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Role
                    </span>
                    <select
                      value={row.role}
                      onChange={(e) =>
                        updateAt(index, {
                          role:
                            e.target.value === "TREASURER"
                              ? "TREASURER"
                              : "MANAGER",
                        })
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="MANAGER">Manager</option>
                      <option value="TREASURER">Treasurer</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Avatar
                    </span>
                    <select
                      value={row.avatarKey}
                      onChange={(e) =>
                        updateAt(index, { avatarKey: e.target.value })
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {MANAGER_AVATARS.map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.faName} / {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Rate %
                    </span>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={row.rateBonusPercent}
                      onChange={(e) =>
                        updateAt(index, {
                          rateBonusPercent: Number(e.target.value) || 0,
                        })
                      }
                      className="h-8 font-mono text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Hire cost
                    </span>
                    <Input
                      type="number"
                      min={1}
                      value={row.hireCost}
                      onChange={(e) =>
                        updateAt(index, {
                          hireCost: Number(e.target.value) || 1,
                        })
                      }
                      className="h-8 font-mono text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Key
                    </span>
                    <Input
                      value={row.key}
                      onChange={(e) =>
                        updateAt(index, {
                          key: e.target.value
                            .trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, "_")
                            .slice(0, 40),
                        })
                      }
                      className="h-8 font-mono text-xs"
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
