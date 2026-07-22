"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bot,
  Users,
  Trash2,
  Wand2,
  Replace,
  Check,
  Pencil,
  X,
} from "lucide-react";
import {
  generateBots,
  bulkRenameBots,
  deleteBot,
  renameBot,
  setBotEnabled,
  type AdminBotRow,
  type AdminUserRow,
} from "@/actions/admin/bots";
import { BOT_DIFFICULTIES, type BotDifficulty } from "@/lib/bots/difficulty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UsersBotsPanelProps = {
  bots: AdminBotRow[];
  users: AdminUserRow[];
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function UsersBotsPanel({ bots, users }: UsersBotsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Tabs defaultValue="bots" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList className="bg-slate-200">
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Real Users
            <span className="rounded-full bg-slate-300 px-1.5 text-[10px] font-semibold text-slate-700">
              {users.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="bots" className="gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            Bots
            <span className="rounded-full bg-slate-300 px-1.5 text-[10px] font-semibold text-slate-700">
              {bots.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap gap-2">
          <GenerateBotsDialog
            pending={pending}
            onDone={() => {
              startTransition(() => router.refresh());
            }}
          />
          <BulkRenameDialog
            pending={pending}
            onDone={() => {
              startTransition(() => router.refresh());
            }}
          />
        </div>
      </div>

      <TabsContent value="users" className="space-y-3">
        <p className="text-sm text-slate-500">
          Phone-authenticated managers (OTP). Bots are excluded. Answers =
          correct / total questions (matches + duels).
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Club</TableHead>
                <TableHead className="text-right">Answers</TableHead>
                <TableHead className="text-right">Matches</TableHead>
                <TableHead className="text-right">Weekly XP</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-slate-400">
                    No real users yet.
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.phone ?? "—"}</TableCell>
                  <TableCell className="font-medium">{u.clubName ?? "—"}</TableCell>
                  <TableCell className="text-end">
                    <AnswersCell label={u.answersLabel} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.matchesPlayed}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.weeklyXp}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(u.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="bots" className="space-y-3">
        <p className="text-sm text-slate-500">
          Cold-start PvP pool. Disabled bots stay listed but are skipped by
          matchmaking. Click a name to rename.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-right">Answers</TableHead>
                <TableHead className="text-right">Duels</TableHead>
                <TableHead className="text-center">Enabled</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bots.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-slate-400">
                    No bots yet. Generate a batch to fill the queue.
                  </TableCell>
                </TableRow>
              )}
              {bots.map((b) => (
                <TableRow
                  key={b.id}
                  className={b.enabled ? undefined : "bg-slate-50 opacity-70"}
                >
                  <TableCell className="font-medium">
                    <InlineBotName
                      botId={b.id}
                      initialName={b.clubName}
                      disabled={pending}
                    />
                  </TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={b.difficulty} />
                  </TableCell>
                  <TableCell className="text-end">
                    <AnswersCell label={b.answersLabel} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {b.duelsPlayed}
                  </TableCell>
                  <TableCell className="text-center">
                    <BotEnabledToggle
                      botId={b.id}
                      enabled={b.enabled}
                      disabled={pending}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                      disabled={pending}
                      aria-label={`Delete ${b.clubName}`}
                      onClick={() => {
                        startTransition(async () => {
                          const res = await deleteBot(b.id);
                          if (!res.ok) {
                            toast.error(
                              res.error === "in_use"
                                ? "Bot is in an active duel."
                                : "Could not delete bot.",
                            );
                            return;
                          }
                          toast.success("Bot deleted");
                          router.refresh();
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function AnswersCell({ label }: { label: string }) {
  return (
    <span
      className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-slate-800"
      title="Correct / questions answered"
    >
      {label}
    </span>
  );
}

function BotEnabledToggle({
  botId,
  enabled,
  disabled,
}: {
  botId: string;
  enabled: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    setOn(enabled);
  }, [enabled]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled || busy}
      onClick={() => {
        const next = !on;
        setOn(next);
        startTransition(async () => {
          const res = await setBotEnabled(botId, next);
          if (!res.ok) {
            setOn(!next);
            toast.error("Could not update bot.");
            return;
          }
          toast.success(next ? "Bot enabled" : "Bot disabled");
          router.refresh();
        });
      }}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50",
        on ? "bg-emerald-500" : "bg-slate-300",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

function InlineBotName({
  botId,
  initialName,
  disabled,
}: {
  botId: string;
  initialName: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [name, setName] = useState(initialName);
  const [busy, startTransition] = useTransition();

  function startEdit() {
    if (disabled || busy) return;
    setValue(name);
    setEditing(true);
  }

  function cancel() {
    setValue(name);
    setEditing(false);
  }

  function save() {
    const next = value.trim().replace(/\s+/g, " ");
    if (!next || next === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    startTransition(async () => {
      const res = await renameBot(botId, next);
      if (!res.ok) {
        toast.error(res.message ?? "Could not rename bot.");
        return;
      }
      setName(res.name);
      setValue(res.name);
      setEditing(false);
      toast.success("Name updated");
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        disabled={disabled || busy}
        className="group inline-flex max-w-[14rem] items-center gap-1.5 rounded-md px-1.5 py-1 text-start font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-50"
        title="Click to edit"
      >
        <span className="truncate">{name}</span>
        <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex max-w-[16rem] items-center gap-1">
      <Input
        autoFocus
        value={value}
        maxLength={32}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        onBlur={() => {
          // Delay so check/cancel clicks register first.
          window.setTimeout(() => {
            if (document.activeElement?.closest("[data-inline-name-actions]")) {
              return;
            }
            save();
          }, 120);
        }}
        className="h-8 text-sm"
      />
      <div data-inline-name-actions className="flex shrink-0 gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
          disabled={busy}
          aria-label="Save name"
          onMouseDown={(e) => e.preventDefault()}
          onClick={save}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:bg-slate-100"
          disabled={busy}
          aria-label="Cancel"
          onMouseDown={(e) => e.preventDefault()}
          onClick={cancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: BotDifficulty | null }) {
  const d = difficulty ?? "MEDIUM";
  const tone =
    d === "EASY"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : d === "HARD"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : "bg-amber-50 text-amber-800 ring-amber-200";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tone}`}
    >
      {d}
    </span>
  );
}

function GenerateBotsDialog({
  pending,
  onDone,
}: {
  pending: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("20");
  const [difficulty, setDifficulty] = useState<BotDifficulty>("MEDIUM");
  const [prefix, setPrefix] = useState("Guest_");
  const [busy, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateBots(Number(quantity), difficulty, prefix);
      if (!res.ok) {
        toast.error(res.message ?? "Generate failed");
        return;
      }
      toast.success(`Created ${res.created} bots`);
      setOpen(false);
      onDone();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="gap-1.5" disabled={pending}>
          <Wand2 className="h-4 w-4" />
          Generate Bots
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate bots</DialogTitle>
          <DialogDescription>
            Creates bot managers with clubs for the Draft Duel cold-start pool.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="bot-qty">Quantity</Label>
            <Input
              id="bot-qty"
              type="number"
              min={1}
              max={200}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Difficulty</Label>
            <Select
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as BotDifficulty)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOT_DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bot-prefix">Name prefix</Label>
            <Input
              id="bot-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Guest_"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={handleGenerate}>
            {busy ? "Creating…" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkRenameDialog({
  pending,
  onDone,
}: {
  pending: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [oldPrefix, setOldPrefix] = useState("Guest_");
  const [newPrefix, setNewPrefix] = useState("Rival_");
  const [busy, startTransition] = useTransition();

  function handleRename() {
    startTransition(async () => {
      const res = await bulkRenameBots(oldPrefix, newPrefix);
      if (!res.ok) {
        toast.error(res.message ?? "Rename failed");
        return;
      }
      toast.success(`Renamed ${res.updated} bots`);
      setOpen(false);
      onDone();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-1.5" disabled={pending}>
          <Replace className="h-4 w-4" />
          Bulk Rename
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk rename bots</DialogTitle>
          <DialogDescription>
            Finds bot club names starting with the search string and replaces that
            prefix globally.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="old-prefix">Search prefix</Label>
            <Input
              id="old-prefix"
              value={oldPrefix}
              onChange={(e) => setOldPrefix(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-prefix">Replace with</Label>
            <Input
              id="new-prefix"
              value={newPrefix}
              onChange={(e) => setNewPrefix(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={handleRename}>
            {busy ? "Renaming…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
