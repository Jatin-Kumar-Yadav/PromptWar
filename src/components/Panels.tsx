import { useState } from "react";
import { presentation } from "../game/Art";
import { Download, ShieldCheck } from "lucide-react";
import { exportJSON, objective, report, useGame } from "../store/game";
import { metrics } from "../email/engine";
import { doors, rooms } from "../game/world";
import { sound } from "../utils/audio";
export function Help() {
  return (
    <>
      <p>
        Explore an infected house as a fictional email-cleaning agent. Every
        encounter changes a local mock mailbox. No login, network email
        requests, or real messages.
      </p>
      <div className="controls">
        {[
          ["W A S D", "Move"],
          ["Mouse", "Look / aim"],
          ["Right click", "Hold to aim"],
          ["Q", "Switch shoulder"],
          ["Left click", "Fire"],
          ["R", "Reload"],
          ["E", "Interact / collect"],
          ["F", "Use herb"],
          ["Shift", "Sprint"],
          ["Tab", "Inventory"],
          ["M", "Map"],
          ["Esc", "Pause"],
        ].map(([key, value]) => (
          <div key={key}>
            <kbd>{key}</kbd>
            <span>{value}</span>
          </div>
        ))}
      </div>
      <p className="hint">
        Aim at the head for a one-shot normal kill. Body shots deal 1 damage.
        Boss headshots deal 3. Raised arms warn of an incoming attack: step back before
        they strike. Three hits down you; health regenerates every 8 undamaged
        seconds.
      </p>
      <p className="hint">
        Follow the objective. Living Room → Study → return through the Hall →
        Bedroom → Storage → final chamber. E collects glowing caches. The hall
        terminal replenishes emergency ammo when your total is below 36.
      </p>
    </>
  );
}
export function Map() {
  const r = useGame((s) => s.run);
  return (
    <>
      <div className="map-grid">
        {rooms.map((room, i) => (
          <div
            key={room.name}
            className={
              Math.floor(r.position[0] / 8) === i % 3 &&
              Number(r.position[1] >= 9) === Math.floor(i / 3)
                ? "current"
                : ""
            }
          >
            <span>0{i + 1}</span>
            <strong>{room.name}</strong>
            {Math.floor(r.position[0] / 8) === i % 3 &&
            Number(r.position[1] >= 9) === Math.floor(i / 3) ? (
              <small>● YOU ARE HERE</small>
            ) : null}
          </div>
        ))}
      </div>
      <p>
        Passages: Hall ↔ Living ↔ Study; Hall ↔ Bedroom ↔ Storage ↔ Final.
      </p>
      <ul className="door-list">
        {doors.map((d) => (
          <li key={d.id}>
            {!d.requires || r.keys.includes(d.requires) ? "◇ Open" : "▣ Locked"}{" "}
            · {d.label}
          </li>
        ))}
      </ul>
      <p className="hint">{objective(r)}</p>
    </>
  );
}
export function Progress() {
  const { mail, run: r } = useGame();
  const m = metrics(mail);
  return (
    <>
      <div className="report-grid">
        {[
          ["Emails processed", m.processed],
          ["Enemies defeated", r.kills],
          ["Bosses defeated", `${r.bosses.length} / 4`],
          ["Puzzles solved", `${r.puzzles.length} / 3`],
          ["Agent level", 1 + Math.floor(r.xp / 150)],
          [
            "Playtime",
            `${Math.floor(r.time / 60)}m ${Math.floor(r.time % 60)}s`,
          ],
          [
            "Classification accuracy",
            r.attempts
              ? `${Math.round((r.correct / r.attempts) * 100)}% (${r.correct}/${r.attempts})`
              : "Not attempted",
          ],
          ["Real messages modified", 0],
        ].map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="hint">
        Accuracy measures your classification-board submissions against known
        mock categories, including retries. Agent XP is a game score; no
        machine-learning model is trained.
      </p>
      <button className="primary" onClick={() => exportJSON(report())}>
        <Download size={16} /> Download cleanup report
      </button>
    </>
  );
}
export function Inventory() {
  const r = useGame((s) => s.run);
  return (
    <>
      <div className="report-grid">
        {[
          ["Handgun", `${r.mag} / 12`],
          ["Reserve rounds", r.reserve],
          ["Green herbs", r.herbs],
          ["Area keys", r.keys.length],
        ].map(([a, b]) => (
          <div key={a}>
            <strong>{b}</strong>
            <span>{a}</span>
          </div>
        ))}
      </div>
      <p>Keys: {r.keys.join(", ") || "None yet"}</p>
      <p className="hint">
        F consumes a herb and restores 1 health. Its associated email stays
        starred. Reload speed and walking speed improve modestly with Agent
        Level.
      </p>
    </>
  );
}
export function Settings() {
  const [quality, setQuality] = useState(presentation.quality);
  const { volume, setVolume } = useGame();
  return (
    <>
      <label className="setting">
        Graphics preset{" "}
        <select
          aria-label="Graphics preset"
          value={quality}
          onChange={(e) => {
            setQuality(e.target.value);
            presentation.quality = e.target.value;
            try {
              localStorage.setItem("dead-inbox-quality", e.target.value);
            } catch {}
            window.dispatchEvent(new Event("graphics-quality"));
          }}
        >
          {["low", "medium", "high"].map((q) => (
            <option key={q} value={q}>
              {q.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="setting">
        Sound volume <strong>{Math.round(volume * 100)}%</strong>
        <input
          aria-label="Sound volume"
          type="range"
          min="0"
          max="1"
          step=".05"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </label>
      <button
        className="secondary"
        onClick={() => setVolume(volume ? 0 : 0.35)}
      >
        {volume ? "Mute audio" : "Enable audio"}
      </button>
      <p className="hint">
        Procedural Web Audio effects only. No external assets. Graphics use
        capped pixel density and lightweight geometry. Desktop keyboard and
        mouse with WebGL are required.
      </p>
    </>
  );
}
export function Puzzle({ id, close }: { id: string; close: () => void }) {
  const s = useGame();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState("");
  const solved = s.run.puzzles.includes(id);
  const cards = [
    "mail-86",
    "mail-100",
    "mail-101",
    "mail-120",
    "mail-87",
    "mail-121",
  ];
  if(id==='note'||id==='digits')return <><p className="eyebrow">RECOVERED DOCUMENT</p><h2>{id==='note'?'Drawer access note':'Indexed safe digits'}</h2><p>{id==='note'?'The drawer combination is 314.':'First digit: 7 · Second digit: 2 · Third digit: 6'}</p><button className="primary" onClick={close}>Put document away</button></>;
  if (id === "exit")
    return (
      <>
        <h2>Restoration terminal</h2>
        <p>
          {s.run.bosses.length === 4
            ? "Inbox restored. Your simulated cleanup report is ready."
            : "The infection persists. Defeat all four bosses to restore the inbox."}
        </p>
        <Progress />
      </>
    );
  if (!["drawer", "safe", "board"].includes(id))
    return <p>This terminal is offline.</p>;
  return (
    <>
      <p className="eyebrow">
        {id === "board"
          ? "STUDY / ORGANIZATION PROTOCOL"
          : id === "safe"
            ? "BEDROOM / SECURITY PROTOCOL"
            : "LIVING ROOM / SECURITY PROTOCOL"}
      </p>
      <h2>
        {id === "board"
          ? "Put every message in its place"
          : id === "safe"
            ? "Bedroom safe"
            : "The locked drawer"}
      </h2>
      {solved ? (
        <>
          <p className="success">
            Protocol completed. The area key is secured.
          </p>
          <button className="primary" onClick={close}>
            Back to house
          </button>
        </>
      ) : id === "board" ? (
        <>
          <p>
            Drag a card onto a category, or select a card and click its
            category. All six must match before the door unlocks.
          </p>
          <div className="classification-cards">
            {cards.map((id) => {
              const e = s.mail.emails.find((e) => e.id === id)!;
              return (
                <button
                  draggable
                  onDragStart={(ev) =>
                    ev.dataTransfer.setData("text/plain", id)
                  }
                  onClick={() => setSelected(id)}
                  key={id}
                  className={selected === id ? "chosen" : ""}
                >
                  <small>{e.sender}</small>
                  <strong>{e.subject}</strong>
                  <span>
                    {answers[id] ?? "Select a category"}{" "}
                    {selected === id ? " · selected" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="categories">
            {["Internships", "Hackathons", "Events"].map((cat) => (
              <button
                key={cat}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (cards.includes(id)) setAnswers({ ...answers, [id]: cat });
                }}
                onClick={() => {
                  if (selected) {
                    setAnswers({ ...answers, [selected]: cat });
                    setSelected("");
                  }
                }}
              >
                <strong>{cat}</strong>
                <small>
                  {cards.filter((id) => answers[id] === cat).length} assigned
                </small>
              </button>
            ))}
          </div>
          <button
            className="primary"
            onClick={() => {
              if (s.group(answers)) {
                sound("pickup", s.volume);
                close();
              } else
                setError(
                  "Some messages are misplaced. Use subject keywords and try again.",
                );
            }}
          >
            Verify classification
          </button>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p>
            {id === "safe"
              ? "The three bedroom drawer slips list each digit by its position."
              : "A note on the nearby sofa contains the combination. Open the drawer and defeat the Spam Brute to unlock the Study."}
          </p>
          <p className="hint">
            {id === "safe"
              ? s.run.digits
                ? "Found slips: first = 7 · second = 2 · third = 6"
                : "Hint: inspect the drawers in the southeast corner of this room."
              : s.run.note
                ? "Found note: “The drawer combination is 314.”"
                : "Hint: press E beside the sofa note."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code === (id === "safe" ? "726" : "314")) {
                s.solve(id);
                sound("pickup", s.volume);
                close();
              } else
                setError("The lock does not turn. Recheck the nearby note.");
            }}
          >
            <label className="code-label">
              Three-digit combination
              <input
                aria-label="Three-digit combination"
                autoFocus
                inputMode="numeric"
                pattern="[0-9]{3}"
                maxLength={3}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="— — —"
              />
            </label>
            {error ? (
              <p role="alert" className="error">
                {error}
              </p>
            ) : null}
            <button className="primary" type="submit">
              Unlock {id === "safe" ? "safe" : "drawer"}
            </button>
          </form>
        </>
      )}
    </>
  );
}
export function Briefing() {
  return (
    <>
      <div className="briefing-icon">
        <ShieldCheck size={38} />
      </div>
      <p className="eyebrow">MOCK EMAIL MODE / MISSION 001</p>
      <h2>The house is your inbox.</h2>
      <p>
        220 fictional messages. One infection. You are the agent sent to restore
        order.
      </p>
      <div className="briefing-list">
        <p>
          <strong>Eliminate</strong> infected promotions to move them to virtual
          Trash.
        </p>
        <p>
          <strong>Recover</strong> faculty caches and herbs to preserve
          important messages.
        </p>
        <p>
          <strong>Organize</strong> email clues, unlock rooms, and defeat four
          batch-processing bosses.
        </p>
      </div>
      <p className="hint">
        Your progress saves locally. No account connection. No real email
        changes. Click Enter House to capture your mouse; Esc pauses and
        releases it.
      </p>
    </>
  );
}
