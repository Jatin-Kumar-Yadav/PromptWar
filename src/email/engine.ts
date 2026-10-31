export type Category =
  | "Spam"
  | "Promotions"
  | "Newsletters"
  | "Faculty"
  | "Internships"
  | "Hackathons"
  | "Events"
  | "Personal"
  | "Review"
  | "Duplicates"
  | "Trash";
export type Folder = "Inbox" | "Archived" | "Trash" | "Deleted";
export interface Email {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  date: string;
  category: Category;
  confidence: number;
  labels: string[];
  starred: boolean;
  important: boolean;
  read: boolean;
  folder: Folder;
  originalFolder: Folder;
  deleted: boolean;
  canonical?: boolean;
}
export type Action =
  | "MOVE_TO_TRASH"
  | "ARCHIVE"
  | "STAR"
  | "MARK_IMPORTANT"
  | "ADD_LABEL"
  | "SIMULATE_PERMANENT_DELETE"
  | "RESTORE";
export interface Operation {
  id: string;
  timestamp: string;
  event: string;
  objectId: string;
  action: Action | "UNDO";
  emailIds: string[];
  previous: Email[];
  next: Email[];
  success: boolean;
  undone?: boolean;
  targetId?: string;
}
export interface MailState {
  emails: Email[];
  operations: Operation[];
}
export function classify(
  sender: string,
  subject: string,
  preview = "",
): { category: Category; confidence: number } {
  const text = `${subject} ${preview}`.toLowerCase();
  if (
    /faculty\.|classroom\.|@campus\.example/.test(sender) &&
    /assignment|lecture|examination|timetable|assessment/.test(text)
  )
    return { category: "Faculty", confidence: 0.99 };
  if (/hackathon|robothon|coding competition|innovation challenge/.test(text))
    return { category: "Hackathons", confidence: 0.97 };
  if (/internship|summer program/.test(text))
    return { category: "Internships", confidence: 0.96 };
  if (
    /event registration|workshop|seminar|conference|webinar|entry pass/.test(
      text,
    )
  )
    return { category: "Events", confidence: 0.95 };
  if (/newsletter|weekly digest/.test(text))
    return { category: "Newsletters", confidence: 0.96 };
  if (
    /offers\.|rewards\./.test(sender) &&
    /claim reward|limited offer|exclusive deal|discount/.test(text)
  )
    return { category: "Spam", confidence: 0.98 };
  return { category: "Review", confidence: 0.4 };
}
const templates: [Category, string, string][] = [
  ["Spam", "rewards@rewards.example", "Claim reward — limited offer"],
  ["Promotions", "sale@offers.example", "Exclusive deal: 80% discount"],
  ["Newsletters", "digest@journal.example", "Weekly digest: digital dispatch"],
  [
    "Faculty",
    "faculty@campus.example",
    "Examination timetable and assignment update",
  ],
  [
    "Internships",
    "careers@research.example",
    "Summer internship application open",
  ],
  [
    "Hackathons",
    "teams@build.example",
    "National hackathon / robothon confirmation",
  ],
  [
    "Events",
    "tickets@events.example",
    "Workshop event registration successful",
  ],
  [
    "Personal",
    "friend@letters.example",
    "Your scholarship and placement notes",
  ],
  ["Review", "notice@community.example", "Application update — please review"],
  ["Duplicates", "sale@offers.example", "Repeated promotional notification"],
  ["Trash", "old@offers.example", "Expired promotional message"],
];
export function generateEmails(): Email[] {
  return Array.from({ length: 220 }, (_, i) => {
    const [category, sender, title] = templates[Math.floor(i / 20)];
    const originalFolder: Folder = category === "Trash" ? "Trash" : "Inbox";
    return {
      id: `mail-${i}`,
      sender,
      subject: `${title} · ${(i % 20) + 1}`,
      preview: `A fictional message for the Inbox Evil simulation. ${title}. No account is connected.`,
      date: new Date(Date.UTC(2026, 8, 1 + (i % 28))).toISOString(),
      category,
      confidence:
        category === "Review"
          ? 0.4
          : category === "Personal"
            ? 0.92
            : category === "Duplicates"
              ? 0.98
              : classify(sender, title).confidence,
      labels: [],
      starred: false,
      important: false,
      read: false,
      folder: originalFolder,
      originalFolder,
      deleted: false,
      ...(category === "Duplicates" ? { canonical: i === 180 } : {}),
    };
  });
}
export function applyAction(
  state: MailState,
  input: {
    id: string;
    event: string;
    objectId: string;
    action: Action;
    emailIds: string[];
    label?: string;
  },
): MailState {
  if (state.operations.some((o) => o.id === input.id)) return state;
  const ids = new Set(input.emailIds);
  const previous = state.emails.filter((e) => ids.has(e.id));
  if (previous.length !== ids.size || !previous.length) return state;
  // Destructive events only accept high-confidence unwanted mail; canonical and ambiguous messages are protected.
  if (
    input.action === "MOVE_TO_TRASH" &&
    previous.some(
      (e) =>
        e.canonical ||
        !["Spam", "Promotions", "Duplicates"].includes(e.category) ||
        e.confidence < 0.8,
    )
  )
    return state;
  if (
    input.action === "SIMULATE_PERMANENT_DELETE" &&
    previous.some((e) => e.folder !== "Trash")
  )
    return state;
  const next = previous.map((e) => {
    const n = { ...e, labels: [...e.labels] };
    switch (input.action) {
      case "MOVE_TO_TRASH":
        n.folder = "Trash";
        break;
      case "ARCHIVE":
        n.folder = "Archived";
        break;
      case "STAR":
        n.starred = true;
        break;
      case "MARK_IMPORTANT":
        n.important = true;
        break;
      case "ADD_LABEL":
        if (input.label && !n.labels.includes(input.label))
          n.labels.push(input.label);
        break;
      case "SIMULATE_PERMANENT_DELETE":
        n.folder = "Deleted";
        n.deleted = true;
        break;
      case "RESTORE":
        n.folder = e.originalFolder;
        n.deleted = false;
        break;
    }
    return n;
  });
  const replacements = new Map(next.map((e) => [e.id, e]));
  return {
    emails: state.emails.map((e) => replacements.get(e.id) ?? e),
    operations: [
      ...state.operations,
      {
        id: input.id,
        timestamp: new Date().toISOString(),
        event: input.event,
        objectId: input.objectId,
        action: input.action,
        emailIds: [...ids],
        previous,
        next,
        success: true,
      },
    ],
  };
}
// Undo the most recent operation only, so overlapping batches cannot erase later changes.
export function undoLast(state: MailState): MailState {
  const op = [...state.operations]
    .reverse()
    .find((o) => o.action !== "UNDO" && !o.undone);
  if (!op) return state;
  const old = new Map(op.previous.map((e) => [e.id, e]));
  return {
    emails: state.emails.map((e) => old.get(e.id) ?? e),
    operations: [
      ...state.operations.map((o) =>
        o.id === op.id ? { ...o, undone: true } : o,
      ),
      {
        id: `undo-${op.id}`,
        timestamp: new Date().toISOString(),
        event: `Undo ${op.event}`,
        objectId: op.objectId,
        action: "UNDO",
        emailIds: op.emailIds,
        previous: op.next,
        next: op.previous,
        success: true,
        targetId: op.id,
      },
    ],
  };
}
export function metrics(state: MailState) {
  const active = state.operations.filter(
    (o) => !o.undone && o.action !== "UNDO",
  );
  return {
    initial: state.emails.filter((e) => e.originalFolder === "Inbox").length,
    inbox: state.emails.filter((e) => e.folder === "Inbox").length,
    processed: new Set(active.flatMap((o) => o.emailIds)).size,
    trashed: state.emails.filter(
      (e) => e.folder === "Trash" && e.originalFolder !== "Trash",
    ).length,
    archived: state.emails.filter((e) => e.folder === "Archived").length,
    starred: state.emails.filter((e) => e.starred).length,
    important: state.emails.filter((e) => e.important).length,
    labeled: state.emails.filter((e) => e.labels.length).length,
    deleted: state.emails.filter((e) => e.deleted).length,
  };
}
