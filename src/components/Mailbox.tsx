import { useState } from "react";
import {
  ArrowLeft,
  Archive,
  Download,
  Inbox,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Undo2,
} from "lucide-react";
import { exportJSON, report, useGame } from "../store/game";
import { metrics, type Email } from "../email/engine";
const tabs = [
  "Inbox",
  "Starred",
  "Important",
  "Faculty",
  "Internships",
  "Hackathons",
  "Events",
  "Review",
  "Archived",
  "Trash",
  "Deleted",
  "Activity Log",
  "Boss Report",
  "Zombie Report",
];
export function Mailbox({ close }: { close: () => void }) {
  const { mail, undo } = useGame();
  const [tab, setTab] = useState("Inbox");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Email | null>(null);
  const m = metrics(mail);
  const matches = (e: Email) =>
    tab === "Starred"
      ? e.starred
      : tab === "Important"
        ? e.important
        : ["Faculty", "Internships", "Hackathons", "Events", "Review"].includes(
              tab,
            )
          ? e.labels.includes(tab) ||
            (tab === "Review" && e.category === "Review")
          : e.folder === tab;
  const filtered = mail.emails.filter(
    (e) =>
      matches(e) &&
      `${e.subject} ${e.sender} ${e.labels.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const logs = mail.operations.filter((o) =>
    tab === "Boss Report"
      ? o.objectId.startsWith("boss-")
      : tab === "Zombie Report"
        ? o.objectId.startsWith("zombie-")
        : true,
  );
  return (
    <div className="mailbox fullscreen">
      <header className="mail-header">
        <button className="icon-button" onClick={close} aria-label="Back">
          <ArrowLeft size={19} />
        </button>
        <div className="brand-small">
          INBOX <span>EVIL</span>
          <small>VIRTUAL MAILBOX</small>
        </div>
        <span className="safety">
          <ShieldCheck size={14} /> LOCAL SIMULATION · NO ACCOUNT CONNECTED
        </span>
        <button className="secondary" onClick={() => exportJSON(report())}>
          <Download size={15} /> Export report
        </button>
      </header>
      <div className="mail-stats">
        {[
          ["Initial inbox", m.initial],
          ["Current inbox", m.inbox],
          ["Processed", m.processed],
          ["Trashed", m.trashed],
          ["Archived", m.archived],
          ["Starred", m.starred],
          ["Important", m.important],
          ["Labeled", m.labeled],
          ["Sim. deleted", m.deleted],
        ].map(([label, n]) => (
          <div key={label}>
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="mail-layout">
        <aside>
          <p className="eyebrow">WORKING COPY / 220 MESSAGES</p>
          {tabs.map((t) => (
            <button
              key={t}
              className={tab === t ? "selected" : ""}
              onClick={() => {
                setTab(t);
                setSelected(null);
              }}
            >
              {t === "Inbox" ? (
                <Inbox size={15} />
              ) : t === "Starred" ? (
                <Star size={15} />
              ) : t === "Trash" || t === "Deleted" ? (
                <Trash2 size={15} />
              ) : (
                <Archive size={15} />
              )}{" "}
              {t === "Deleted" ? "Sim. permanently deleted" : t}
            </button>
          ))}
        </aside>
        <section className="mail-main">
          <div className="mail-toolbar">
            <h2>{tab}</h2>
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Search emails"
                placeholder="Search virtual messages…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              className="secondary"
              onClick={undo}
              disabled={
                !mail.operations.some((o) => !o.undone && o.action !== "UNDO")
              }
            >
              <Undo2 size={14} /> Undo latest
            </button>
          </div>
          {["Activity Log", "Boss Report", "Zombie Report"].includes(tab) ? (
            <div className="logs">
              {logs.length ? (
                logs
                  .slice()
                  .reverse()
                  .map((o) => (
                    <article className="log-card" key={o.id}>
                      <div>
                        <span className="tag">{o.action}</span>{" "}
                        <strong>{o.event}</strong>{" "}
                        {o.undone ? (
                          <span className="muted"> · undone</span>
                        ) : null}
                        <small>
                          {new Date(o.timestamp).toLocaleString()} ·{" "}
                          {o.objectId} · {o.success ? "Success" : "Failed"}
                        </small>
                      </div>
                      <p>
                        {o.emailIds.length} simulated messages · 0 real messages
                        modified
                      </p>
                      <details>
                        <summary>
                          Inspect affected subjects and before / after states
                        </summary>
                        {o.previous.map((e, i) => (
                          <div className="audit" key={e.id}>
                            <strong>
                              {e.id} · {e.subject}
                            </strong>
                            <pre>
                              {JSON.stringify(
                                { previous: e, next: o.next[i] },
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                        ))}
                      </details>
                    </article>
                  ))
              ) : (
                <p className="empty">
                  No operations yet. Actions in the house appear here.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sender / subject</th>
                      <th>Date</th>
                      <th>Folder / labels</th>
                      <th>Game event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                      <tr
                        key={e.id}
                        onClick={() => setSelected(e)}
                        tabIndex={0}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") setSelected(e);
                        }}
                      >
                        <td>
                          <span className="sender">
                            {e.starred ? "★ " : ""}
                            {e.important ? "◆ " : ""}
                            {e.sender}
                          </span>
                          <strong>{e.subject}</strong>
                        </td>
                        <td>{e.date.slice(0, 10)}</td>
                        <td>
                          <span className="tag">{e.folder}</span>
                          <small>{e.labels.join(", ") || "Unlabeled"}</small>
                        </td>
                        <td>
                          {[...mail.operations]
                            .reverse()
                            .find(
                              (o) =>
                                !o.undone &&
                                o.action !== "UNDO" &&
                                o.emailIds.includes(e.id),
                            )?.event ?? "Unprocessed"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length ? (
                  <p className="empty">No matching messages.</p>
                ) : null}
              </div>
              {selected ? (
                <article className="email-detail">
                  <button
                    className="text-button"
                    onClick={() => setSelected(null)}
                  >
                    Close message ×
                  </button>
                  <h3>{selected.subject}</h3>
                  <p>{selected.preview}</p>
                  <small>
                    Known category: {selected.category} · Rule confidence:{" "}
                    {Math.round(selected.confidence * 100)}% ·{" "}
                    {selected.read ? "Read" : "Unread"}
                  </small>
                </article>
              ) : null}
            </>
          )}
        </section>
      </div>
      <footer className="mail-footer">
        All changes apply to generated mock messages on this device. Undo
        restores the latest complete batch; it does not reset enemies or
        rewards.
      </footer>
    </div>
  );
}
