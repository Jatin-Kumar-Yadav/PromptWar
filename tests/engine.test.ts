import test from "node:test";
import assert from "node:assert/strict";
import {
  applyAction,
  classify,
  generateEmails,
  metrics,
  undoLast,
  type MailState,
} from "../src/email/engine";
const fresh = (): MailState => ({ emails: generateEmails(), operations: [] });
const act = (
  s: MailState,
  id: string,
  action: Parameters<typeof applyAction>[1]["action"],
  emailIds: string[],
  label?: string,
) =>
  applyAction(s, { id, action, emailIds, label, event: "test", objectId: id });
test("220 deterministic mock messages preserve original metadata and unique IDs", () => {
  const emails = generateEmails();
  assert.equal(emails.length, 220);
  assert.equal(new Set(emails.map((e) => e.id)).size, 220);
  assert.deepEqual(emails, generateEmails());
  assert.equal(emails.filter((e) => e.folder === "Trash").length, 20);
  assert.equal(metrics(fresh()).initial, 200);
});
test("classification combines sender and keywords; ambiguous offer is kept for review", () => {
  assert.equal(
    classify("faculty@campus.example", "Assignment timetable").category,
    "Faculty",
  );
  assert.equal(
    classify("sale@offers.example", "Limited offer: claim reward").category,
    "Spam",
  );
  assert.equal(
    classify("friend@letters.example", "An offer to help with your application")
      .category,
    "Review",
  );
  assert.equal(
    classify("team@build.example", "Robothon 2026").category,
    "Hackathons",
  );
});
test("action engine actually changes a whole batch, records snapshots and is idempotent", () => {
  const before = fresh();
  const after = act(before, "kill-1", "MOVE_TO_TRASH", ["mail-20", "mail-21"]);
  assert.equal(after.emails[20].folder, "Trash");
  assert.equal(before.emails[20].folder, "Inbox");
  assert.equal(after.operations[0].previous[0].folder, "Inbox");
  assert.equal(after.operations[0].next[0].folder, "Trash");
  assert.equal(after.operations[0].success, true);
  assert.equal(
    act(after, "kill-1", "MOVE_TO_TRASH", ["mail-20", "mail-21"]),
    after,
  );
  assert.equal(metrics(after).processed, 2);
});
test("ambiguous, important, canonical and nonexistent messages cannot enter destructive batches", () => {
  for (const ids of [
    ["mail-160"],
    ["mail-60"],
    ["mail-180"],
    ["mail-20", "missing"],
  ]) {
    const before = fresh();
    assert.equal(act(before, "bad", "MOVE_TO_TRASH", ids), before);
  }
});
test("virtual permanent deletion only accepts Trash and undo restores full batch", () => {
  const before = fresh();
  assert.equal(
    act(before, "bad", "SIMULATE_PERMANENT_DELETE", ["mail-20"]),
    before,
  );
  const after = act(before, "tyrant", "SIMULATE_PERMANENT_DELETE", [
    "mail-200",
    "mail-201",
  ]);
  assert.equal(after.emails[200].deleted, true);
  assert.equal(after.emails[200].folder, "Deleted");
  const undone = undoLast(after);
  assert.equal(undone.emails[200].folder, "Trash");
  assert.equal(undone.emails[201].deleted, false);
  assert.equal(undone.operations[0].undone, true);
  assert.equal(undone.operations[1].action, "UNDO");
  assert.equal(metrics(undone).processed, 0);
});
test("overlapping operations undo in reverse order without erasing preserved stars", () => {
  let s = act(fresh(), "star", "STAR", ["mail-80"]);
  s = act(s, "label", "ADD_LABEL", ["mail-80"], "Internships");
  s = undoLast(s);
  assert.equal(s.emails[80].starred, true);
  assert.deepEqual(s.emails[80].labels, []);
  s = undoLast(s);
  assert.equal(s.emails[80].starred, false);
  assert.equal(undoLast(s), s);
});
test("archive, mark important, restore, and label are all audited", () => {
  let s = act(fresh(), "archive", "ARCHIVE", ["mail-40"]);
  s = act(s, "important", "MARK_IMPORTANT", ["mail-60"]);
  s = act(s, "label", "ADD_LABEL", ["mail-60"], "Faculty");
  s = act(s, "restore", "RESTORE", ["mail-40"]);
  assert.equal(s.emails[40].folder, "Inbox");
  assert.equal(s.emails[60].important, true);
  assert.equal(s.emails[60].starred, false);
  assert.deepEqual(s.emails[60].labels, ["Faculty"]);
  assert.equal(s.operations.length, 4);
});
