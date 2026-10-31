import { create } from "zustand";
import {
  applyAction,
  generateEmails,
  metrics,
  undoLast,
  type MailState,
  type Action,
  type Email,
} from "../email/engine";
import { bossConfigs, pickupDefs, type Vec2 } from "../game/world";
export type Mode = "menu" | "playing" | "paused" | "dead" | "victory";
export interface Enemy {
  diedAt?: number;
  id: string;
  x: number;
  z: number;
  home: Vec2;
  hp: number;
  maxHp: number;
  boss: number;
  emails: string[];
  cooldown: number;
  stun: number;
  windup: number;
  state: "idle" | "patrol" | "chase" | "attack" | "stunned" | "dead";
}
export interface Run {
  position: Vec2;
  yaw: number;
  health: number;
  mag: number;
  reserve: number;
  herbs: number;
  reload: number;
  immune: number;
  regen: number;
  time: number;
  kills: number;
  bosses: number[];
  puzzles: string[];
  collected: string[];
  keys: string[];
  enemies: Enemy[];
  checkpoint: Vec2;
  xp: number;
  correct: number;
  attempts: number;
  started: boolean;
  shotAt: number;
  hitAt: number;
  note: boolean;
  digits: boolean;
}
interface Saved {
  version: 1;
  mail: MailState;
  run: Run;
  volume: number;
}
export const SAVE_KEY = "inbox-evil-v1";
function initialRun(): Run {
  const emails = generateEmails();
  return {
    position: [4, 5],
    yaw: Math.PI,
    health: 3,
    mag: 12,
    reserve: 12,
    herbs: 0,
    reload: 0,
    immune: 0,
    regen: 0,
    time: 0,
    kills: 0,
    bosses: [],
    puzzles: [],
    collected: [],
    keys: [],
    checkpoint: [4, 5],
    xp: 0,
    correct: 0,
    attempts: 0,
    started: false,
    shotAt: -10,
    hitAt: -10,
    note: false,
    digits: false,
    enemies: Array.from({ length: 12 }, (_, i): Enemy => {
      const room = Math.floor(i / 2);
      const x = (room % 3) * 8 + 3 + (i % 2) * 2;
      const z = (room < 3 ? 0 : 9) + 6.8;
      return {
        id: `zombie-${i}`,
        x,
        z,
        home: [x, z],
        hp: 3,
        maxHp: 3,
        boss: -1,
        emails: [
          emails[i < 10 ? i * 2 + 20 : (i - 10) * 2].id,
          emails[i < 10 ? i * 2 + 21 : (i - 10) * 2 + 1].id,
        ],
        cooldown: 2,
        stun: 0,
        windup: 0,
        state: "idle",
      };
    }).concat(
      bossConfigs.map((b, i) => ({
        id: `boss-${i}`,
        x: b.x,
        z: b.z,
        home: [b.x, b.z] as Vec2,
        hp: b.hp,
        maxHp: b.hp,
        boss: i,
        emails: emails
          .filter(
            (e) =>
              e.category === b.category &&
              !e.canonical &&
              (b.category !== "Spam" || Number(e.id.split("-")[1]) >= 4),
          )
          .map((e) => e.id),
        cooldown: 3,
        stun: 0,
        windup: 0,
        state: "idle" as const,
      })),
    ),
  };
}
export function validateSave(value: unknown): value is Saved {
  if (!value || typeof value !== "object") return false;
  const v = value as Saved;
  const isVec = (p: unknown) =>
    Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
  const strings = (a: unknown) =>
    Array.isArray(a) && a.every((x) => typeof x === "string");
  if (
    v.version !== 1 ||
    !v.mail ||
    !v.run ||
    !Number.isFinite(v.volume) ||
    v.volume < 0 ||
    v.volume > 1
  )
    return false;
  const r = v.run;
  if (
    !Array.isArray(v.mail.emails) ||
    v.mail.emails.length !== 220 ||
    new Set(v.mail.emails.map((e) => e?.id)).size !== 220
  )
    return false;
  if (
    !v.mail.emails.every(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.sender === "string" &&
        typeof e.subject === "string" &&
        typeof e.preview === "string" &&
        typeof e.date === "string" &&
        typeof e.category === "string" &&
        strings(e.labels) &&
        typeof e.starred === "boolean" &&
        typeof e.important === "boolean" &&
        typeof e.deleted === "boolean" &&
        ["Inbox", "Trash", "Archived", "Deleted"].includes(e.folder) &&
        ["Inbox", "Trash", "Archived", "Deleted"].includes(e.originalFolder),
    )
  )
    return false;
  if (
    !Array.isArray(v.mail.operations) ||
    !v.mail.operations.every(
      (o) =>
        o &&
        typeof o.id === "string" &&
        strings(o.emailIds) &&
        Array.isArray(o.previous) &&
        Array.isArray(o.next) &&
        o.previous.length === o.emailIds.length &&
        o.next.length === o.emailIds.length &&
        o.previous.every((e) => e && strings(e.labels)) &&
        o.next.every((e) => e && strings(e.labels)) &&
        typeof o.event === "string" &&
        typeof o.objectId === "string" &&
        typeof o.timestamp === "string",
    )
  )
    return false;
  if (
    !isVec(r.position) ||
    !isVec(r.checkpoint) ||
    r.position[0] < 0.3 ||
    r.position[0] > 23.7 ||
    r.position[1] < 0.3 ||
    r.position[1] > 17.7
  )
    return false;
  const numeric = [
    "yaw",
    "health",
    "mag",
    "reserve",
    "herbs",
    "reload",
    "immune",
    "regen",
    "time",
    "kills",
    "xp",
    "correct",
    "attempts",
    "shotAt",
    "hitAt",
  ] as const;
  if (numeric.some((k) => !Number.isFinite(r[k]))) return false;
  if (
    r.health < 0 ||
    r.health > 3 ||
    r.mag < 0 ||
    r.mag > 12 ||
    r.reserve < 0 ||
    r.herbs < 0 ||
    r.time < 0 ||
    r.reload < 0 ||
    r.xp < 0
  )
    return false;
  if (
    !strings(r.keys) ||
    !strings(r.puzzles) ||
    !strings(r.collected) ||
    !Array.isArray(r.bosses) ||
    r.bosses.some((i) => !Number.isInteger(i) || i < 0 || i > 3)
  )
    return false;
  if (
    !Array.isArray(r.enemies) ||
    r.enemies.length !== 16 ||
    new Set(r.enemies.map((e) => e?.id)).size !== 16 ||
    !r.enemies.every(
      (e) =>
        e &&
        typeof e.id === "string" &&
        Number.isFinite(e.hp) &&
        e.hp >= 0 &&
        Number.isFinite(e.maxHp) &&
        Number.isFinite(e.x) &&
        Number.isFinite(e.z) &&
        isVec(e.home) &&
        strings(e.emails) &&
        Number.isFinite(e.boss) &&
        Number.isFinite(e.cooldown) &&
        Number.isFinite(e.stun) &&
        Number.isFinite(e.windup),
    )
  )
    return false;
  return (
    typeof r.started === "boolean" &&
    typeof r.note === "boolean" &&
    typeof r.digits === "boolean"
  );
}

let loaded: Saved | undefined;
let storageError = "";
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const v: unknown = JSON.parse(raw);
    if (validateSave(v)) loaded = v;
    else
      storageError =
        "Saved data could not be validated. It has been kept untouched. Download it before starting a new game.";
  }
} catch {
  storageError =
    "Local save is unavailable or damaged. Existing data has not been reset. Export your report regularly.";
}
let preserveCorrupt = !!storageError;
interface Store {
  mail: MailState;
  run: Run;
  mode: Mode;
  panel: string;
  message: string;
  messageUntil: number;
  volume: number;
  storageError: string;
  newGame: () => void;
  setMode: (mode: Mode) => void;
  setPanel: (panel: string) => void;
  update: (patch: Partial<Run>) => void;
  save: () => void;
  notify: (message: string) => void;
  action: (
    id: string,
    event: string,
    objectId: string,
    action: Action,
    ids: string[],
    label?: string,
  ) => void;
  hit: (id: string, head: boolean) => void;
  collect: (id: string) => void;
  solve: (id: string) => void;
  group: (answers: Record<string, string>) => boolean;
  undo: () => void;
  respawn: () => void;
  setVolume: (n: number) => void;
}
export const useGame = create<Store>((set, get) => ({
  mail: loaded?.mail ?? { emails: generateEmails(), operations: [] },
  run: loaded?.run ?? initialRun(),
  mode: "menu",
  panel: "",
  message: "",
  messageUntil: 0,
  volume: loaded?.volume ?? 0.35,
  storageError,
  newGame: () => {
    preserveCorrupt = false;
    set({
      mail: { emails: generateEmails(), operations: [] },
      run: { ...initialRun(), started: true },
      mode: "paused",
      panel: "briefing",
      storageError: "",
    });
    get().save();
  },
  setMode: (mode) => {
    if (mode === "paused" && get().run.started) {
      if (get().run.health <= 0) mode = "dead";
      else if (get().run.bosses.includes(3)) mode = "victory";
    }
    set({ mode, panel: "" });
    if (mode !== "playing") get().save();
  },
  setPanel: (panel) => {
    set({ panel, mode: get().mode === "playing" ? "paused" : get().mode });
    get().save();
  },
  update: (patch) => set((s) => ({ run: { ...s.run, ...patch } })),
  notify: (message) => set({ message, messageUntil: Date.now() + 4500 }),
  save: () => {
    if (preserveCorrupt) return;
    try {
      const s = get();
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: 1,
          mail: s.mail,
          run: s.run,
          volume: s.volume,
        }),
      );
    } catch {
      set({
        storageError:
          "Browser storage is full or unavailable. Use Download Report to preserve email operations.",
      });
    }
  },
  action: (id, event, objectId, action, ids, label) => {
    const s = get();
    const mail = applyAction(s.mail, {
      id,
      event,
      objectId,
      action,
      emailIds: ids,
      label,
    });
    if (mail !== s.mail) {
      set({ mail, run: { ...s.run, xp: s.run.xp + ids.length * 5 } });
      get().save();
    }
  },
  hit: (id, head) => {
    const s = get();
    const enemy = s.run.enemies.find((e) => e.id === id);
    if (!enemy || enemy.hp <= 0) return;
    const hp = Math.max(0, enemy.hp - (head ? 3 : 1));
    const enemies = s.run.enemies.map((e) =>
      e.id === id
        ? {
            ...e,
            hp,
            diedAt: hp===0 ? s.run.time : undefined,
            stun: enemy.boss >= 0 ? (hp % 6 === 0 ? 0.55 : 0.02) : 0.3,
            state: hp === 0 ? ("dead" as const) : ("stunned" as const),
          }
        : e,
    );
    set({ run: { ...s.run, enemies, hitAt: s.run.time } });
    if (hp === 0) {
      if (enemy.boss < 0) {
        get().action(
          id,
          "Zombie eliminated",
          id,
          "MOVE_TO_TRASH",
          enemy.emails,
        );
        get().notify(
          "Infected eliminated · 2 promotional emails moved to virtual Trash",
        );
      } else {
        const b = bossConfigs[enemy.boss];
        get().action(id, b.name, id, b.action, enemy.emails);
        get().notify(
          `${b.name} defeated · ${enemy.emails.length} messages processed`,
        );
      }
      const r = get().run;
      const bosses = enemy.boss >= 0 ? [...r.bosses, enemy.boss] : r.bosses;
      const keys = [...r.keys];
      if (
        bosses.includes(0) &&
        r.puzzles.includes("drawer") &&
        !keys.includes("study")
      )
        keys.push("study");
      if ([0, 1, 2].every((i) => bosses.includes(i)) && !keys.includes("final"))
        keys.push("final");
      set({
        run: {
          ...r,
          kills: r.kills + 1,
          bosses,
          keys,
          checkpoint: enemy.boss >= 0 ? [...r.position] : r.checkpoint,
          reserve: r.reserve + (enemy.boss >= 0 ? 24 : 0),
        },
        ...(enemy.boss === 3 ? { mode: "victory" as const } : {}),
      });
      get().save();
    }
  },
  collect: (id) => {
    const s = get();
    if (s.run.collected.includes(id)) return;
    const p = pickupDefs.find((p) => p.id === id);
    if (!p) return;
    get().action(
      id,
      p.kind === "ammo"
        ? "Faculty cache secured"
        : "Important message preserved",
      id,
      p.kind === "ammo" ? "MARK_IMPORTANT" : "STAR",
      [p.emailId],
    );
    if (p.kind === "ammo")
      get().action(
        `${id}-label`,
        "Faculty label",
        id,
        "ADD_LABEL",
        [p.emailId],
        "Faculty",
      );
    const r = get().run;
    set({
      run: {
        ...r,
        collected: [...r.collected, id],
        reserve: r.reserve + (p.kind === "ammo" ? 24 : 0),
        herbs: r.herbs + (p.kind === "herb" ? 1 : 0),
      },
    });
    get().notify(
      p.kind === "ammo"
        ? "Ammo +24 · Faculty email marked important"
        : "Herb +1 · Internship email starred",
    );
    get().save();
  },
  solve: (id) => {
    const s = get();
    if (s.run.puzzles.includes(id)) return;
    const keys = [...s.run.keys];
    if (id === "drawer" && s.run.bosses.includes(0)) keys.push("study");
    if (id === "board") keys.push("bedroom");
    if (id === "safe") keys.push("storage");
    if (id === "safe")
      get().action("safe-herb", "Safe: scholarship preserved", "safe", "STAR", [
        "mail-99",
      ]);
    if (id === "safe")
      get().action(
        "safe-review",
        "Safe: important messages for review",
        "safe",
        "ADD_LABEL",
        ["mail-160", "mail-161", "mail-162"],
        "Review",
      );
    const r = get().run;
    set({
      run: {
        ...r,
        puzzles: [...r.puzzles, id],
        keys,
        reserve: r.reserve + (id === "drawer" ? 24 : 0),
        herbs: r.herbs + (id === "safe" ? 1 : 0),
        xp: r.xp + 50,
        checkpoint: [...r.position],
      },
    });
    get().notify("Puzzle solved · checkpoint saved");
    get().save();
  },
  group: (answers) => {
    const ids = [
      "mail-86",
      "mail-100",
      "mail-101",
      "mail-120",
      "mail-87",
      "mail-121",
    ];
    const s = get();
    let correct = 0;
    for (const id of ids) {
      const e = s.mail.emails.find((e) => e.id === id)!;
      if (answers[id] === e.category) correct++;
    }
    set({
      run: {
        ...s.run,
        correct: s.run.correct + correct,
        attempts: s.run.attempts + ids.length,
      },
    });
    if (correct !== ids.length) {
      get().notify(
        `${correct}/6 correct · Check internship, hackathon and event clues, then retry.`,
      );
      get().save();
      return false;
    }
    for (const id of ids)
      get().action(
        `group-${id}`,
        "Classification board",
        "board",
        "ADD_LABEL",
        [id],
        answers[id],
      );
    get().solve("board");
    return true;
  },
  undo: () => {
    set((s) => ({ mail: undoLast(s.mail) }));
    get().notify(
      "Latest email operation undone. Combat progress is retained; this encounter will not process the batch again.",
    );
    get().save();
  },
  respawn: () => {
    const r = get().run;
    set({
      run: {
        ...r,
        health: 3,
        position: [...r.checkpoint],
        mag: 12,
        reserve: Math.max(36, r.reserve),
        reload: 0,
        immune: 3,
        regen: 0,
        enemies: r.enemies.map((e) => ({
          ...e,
          x: e.home[0],
          z: e.home[1],
          windup: 0,
          cooldown: 3,
        })),
      },
      mode: "paused",
      panel: "",
    });
    get().save();
  },
  setVolume: (volume) => {
    set({ volume });
    get().save();
  },
}));
export function report() {
  const { mail, run } = useGame.getState();
  return {
    title: "INBOX EVIL — simulated cleanup report",
    simulationOnly: true,
    realMessagesModified: 0,
    createdAt: new Date().toISOString(),
    metrics: metrics(mail),
    enemiesDefeated: run.kills,
    bossesDefeated: run.bosses.length,
    puzzlesSolved: run.puzzles.length,
    agentLevel: 1 + Math.floor(run.xp / 150),
    xp: run.xp,
    classificationAccuracy: run.attempts ? run.correct / run.attempts : null,
    playtimeSeconds: Math.floor(run.time),
    operations: mail.operations,
    emails: mail.emails,
  };
}
export function exportJSON(value: unknown, name = "inbox-evil-report.json") {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function enemyActive(e: Enemy, r: Run) {
  return (
    e.hp > 0 &&
    (e.boss < 0 || e.boss === [0, 1, 2, 3].find((i) => !r.bosses.includes(i)))
  );
}
export function objective(r: Run) {
  if (!r.bosses.includes(0)) return "Living Room · eliminate the Spam Brute";
  if (!r.puzzles.includes("drawer"))
    return "Read the sofa note and unlock the living-room drawer";
  if (!r.puzzles.includes("board"))
    return "Study · sort six messages on the classification board";
  if (!r.bosses.includes(1)) return "Study · defeat the Newsletter Hoarder";
  if (!r.puzzles.includes("safe"))
    return "Bedroom · inspect drawers and unlock the safe";
  if (!r.bosses.includes(2)) return "Storage · defeat the Duplicate Collector";
  return "Final chamber · defeat the Trash Tyrant";
}
