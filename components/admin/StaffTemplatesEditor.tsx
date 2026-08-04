"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
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
 * Admin CRUD + reorder for Club Staff catalog (GameConfig).
 */
export function StaffTemplatesEditor({
  draft,
  setDraft,
}: StaffTemplatesEditorProps) {
  const templates = draft.businessEconomy.staff.templates;

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
    setDraft((prev) => {
      const next = prev.businessEconomy.staff.templates.filter(
        (_, i) => i !== index,
      );
      return patchTemplates(prev, next);
    });
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
      return patchTemplates(prev, [...list, row]);
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/40 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-800">
          Staff catalog
          <AdminHelpTip text="Order = hire sheet order. Each row: names, avatar, role, rate %, Funds cost. Save Config to persist." />
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          onClick={add}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {templates.map((row, index) => {
          const av = MANAGER_AVATARS.find((a) => a.key === row.avatarKey);
          return (
            <div
              key={`${row.key}-${index}`}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={av?.image ?? "/avatars/tactical-coach.png"}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <span className="font-mono text-[11px] text-slate-500">
                    #{index + 1} · {row.key}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={index >= templates.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-rose-600"
                    disabled={templates.length <= 1}
                    onClick={() => remove(index)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
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
                    className="h-9 font-mono text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
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
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="TREASURER">Treasurer</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Name EN
                  </span>
                  <Input
                    value={row.nameEn}
                    onChange={(e) =>
                      updateAt(index, { nameEn: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Name FA
                  </span>
                  <Input
                    value={row.nameFa}
                    onChange={(e) =>
                      updateAt(index, { nameFa: e.target.value })
                    }
                    className="h-9 text-sm"
                    dir="rtl"
                  />
                </label>
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Avatar
                  </span>
                  <select
                    value={row.avatarKey}
                    onChange={(e) =>
                      updateAt(index, { avatarKey: e.target.value })
                    }
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {MANAGER_AVATARS.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.name} / {a.faName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Rate bonus %
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
                    className="h-9 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Hire cost (Funds)
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
                    className="h-9 text-sm"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
