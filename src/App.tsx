import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import {
  ArrowRight,
  ChevronRight,
  Crosshair,
  Heart,
  Leaf,
  Mail,
  Pause,
  ShieldCheck,
  Skull,
  Volume2,
  X,
} from "lucide-react";
import { GameScene, resume } from "./game/GameScene";
import { useShallow } from "zustand/react/shallow";
import { exportJSON, objective, report, useGame } from "./store/game";
import { metrics } from "./email/engine";
import {
  bossConfigs,
  clearLine,
  interactions,
  obstacles,
  pickupDefs,
  roomAt,
} from "./game/world";
import { Mailbox } from "./components/Mailbox";
import {
  Briefing,
  Help,
  Inventory,
  Map,
  Progress,
  Puzzle,
  Settings,
} from "./components/Panels";
import { sound } from "./utils/audio";
class GraphicsBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Graphics error", error, info.componentStack);
  }
  render() {
    return this.state.failed ? (
      <div className="graphics-fallback">
        <h2>Graphics unavailable</h2>
        <p>
          A WebGL-capable desktop browser is needed for the 3D house. Your
          mailbox can still be reviewed and exported.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
function HUD() {
  const { run: r, setMode } = useGame();
  const m = metrics(useGame((s) => s.mail));
  const p = pickupDefs.find(
    (p) =>
      !r.collected.includes(p.id) &&
      Math.hypot(p.x - r.position[0], p.z - r.position[1]) < 1.7 &&
      clearLine(r.position, [p.x, p.z], obstacles(r.keys)),
  );
  const o = interactions.find(
    (o) => Math.hypot(o.x - r.position[0], o.z - r.position[1]) < 2,
  );
  const boss = r.enemies.find(
    (e) =>
      e.boss >= 0 &&
      e.hp > 0 &&
      e.boss === [0, 1, 2, 3].find((i) => !r.bosses.includes(i)) &&
      Math.hypot(e.x - r.position[0], e.z - r.position[1]) < 7 &&
      clearLine(r.position, [e.x, e.z], obstacles(r.keys)),
  );
  return (
    <div className={`hud ${r.immune > 1.15 ? "damage-flash" : ""}`}>
      <div className="hud-top">
        <div className="vitals">
          <span className="eyebrow">AGENT VITALS</span>
          <div className="hearts">
            {[1, 2, 3].map((i) => (
              <Heart
                key={i}
                size={23}
                fill={r.health >= i ? "#bccb9d" : "transparent"}
                color={r.health >= i ? "#bccb9d" : "#646c62"}
              />
            ))}
          </div>
          <small>
            LV {1 + Math.floor(r.xp / 150)} <span>·</span> {r.xp} XP
          </small>
          <div className="xp-track">
            <i style={{ width: `${(r.xp % 150) / 1.5}%` }} />
          </div>
        </div>
        <div className="objective">
          <span className="eyebrow">{roomAt(r.position).toUpperCase()}</span>
          <p>{objective(r)}</p>
          <small>
            <Mail size={13} /> {m.processed} messages processed <span>·</span>{" "}
            {r.bosses.length}/4 bosses
          </small>
        </div>
        <button
          className="icon-button hud-pause"
          onClick={() => setMode("paused")}
          aria-label="Pause"
        >
          <Pause size={19} />
        </button>
      </div>
      {boss ? (
        <div className="boss-bar">
          <div>
            <Skull size={16} />
            <span>{bossConfigs[boss.boss].name}</span>
            <small>
              {boss.windup > 0
                ? "ATTACK INCOMING — MOVE BACK"
                : `${boss.hp} / ${boss.maxHp}`}
            </small>
          </div>
          <div className="boss-track">
            <i style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }} />
          </div>
        </div>
      ) : null}
      <div className={`crosshair ${r.time - r.hitAt < 0.15 ? "hit" : ""}`}>
        <span />
        <i />
      </div>
      {p || o ? (
        <div className="interact">
          <kbd>E</kbd>{" "}
          {p
            ? `Collect ${p.kind === "ammo" ? "faculty ammunition" : "green herb"}`
            : o?.label}
        </div>
      ) : null}
      <div className="hud-bottom">
        <div className="supplies">
          <p>
            <Leaf size={19} /> {r.herbs}{" "}
            <small>
              HERBS <kbd>F</kbd>
            </small>
          </p>
          <small>
            {r.keys.length} AREA KEYS <span>·</span> <kbd>Tab</kbd> Inventory{" "}
            <kbd>M</kbd> Map
          </small>
        </div>
        <div className="ammo">
          <span className="eyebrow">AGENT HANDGUN</span>
          <div>
            <strong>{String(r.mag).padStart(2, "0")}</strong>
            <span>/ {String(r.reserve).padStart(2, "0")}</span>
          </div>
          <small>
            {r.reload > 0
              ? `RELOADING ${r.reload.toFixed(1)}s`
              : r.mag === 0
                ? r.reserve > 0
                  ? "EMPTY · PRESS R TO RELOAD"
                  : "NO AMMO"
                : "12 ROUND MAGAZINE · R RELOAD"}
          </small>
        </div>
      </div>
    </div>
  );
}
export default function App() {
  const s = useGame(
    useShallow((s) => ({
      mode: s.mode,
      panel: s.panel,
      message: s.message,
      messageUntil: s.messageUntil,
      storageError: s.storageError,
      volume: s.volume,
      started: s.run.started,
      setMode: s.setMode,
      setPanel: s.setPanel,
      newGame: s.newGame,
      respawn: s.respawn,
      mail: s.mail,
    })),
  );
  const [confirmNew, setConfirmNew] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    const save = () => useGame.getState().save();
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(t);
      window.removeEventListener("pagehide", save);
    };
  }, []);
  useEffect(() => {
    if (s.mode === "victory") sound("win", s.volume);
  }, [s.mode]);
  const close = () => s.setPanel("");
  const newGame = () => {
    if (s.started || s.storageError) setConfirmNew(true);
    else s.newGame();
  };
  const menu = s.mode === "menu";
  const panel = s.panel;
  const paused = s.mode === "paused";
  return (
    <main>
      <div className={`scene ${menu ? "menu-scene" : ""}`}>
        <GraphicsBoundary>
          <GameScene />
        </GraphicsBoundary>
      </div>
      {menu && !panel ? (
        <>
          <div className="menu-shade" />
          <header className="menu-top">
            <div className="studio">
              <Crosshair size={18} /> DEAD LETTER PROTOCOL
            </div>
            <span className="build-tag">
              OFFLINE SIMULATION <i />
            </span>
          </header>
          <section className="main-menu">
            <p className="eyebrow">
              <span className="tiny-line" /> THE INFECTED INBOX
            </p>
            <h1>
              INBOX
              <br />
              <span>EVIL</span>
              <i>01</i>
            </h1>
            <p className="tagline">
              SURVIVE THE INBOX.
              <br />
              CLEAN THE CHAOS.
            </p>
            <p className="menu-description">
              An abandoned house. A corrupted inbox.
              <br />
              Every message has something to hide.
            </p>
            <nav className="menu-actions">
              <button className="start-button" onClick={newGame}>
                <span>
                  New game <small>ENTER THE INFECTION</small>
                </span>
                <ArrowRight size={22} />
              </button>
              <button disabled={!s.started} onClick={() => s.setMode("paused")}>
                <span>Continue</span>
                <ChevronRight size={17} />
              </button>
              <button onClick={() => s.setPanel("mailbox")}>
                <span>Virtual mailbox</span>
                <Mail size={16} />
              </button>
              <div className="menu-links">
                <button onClick={() => s.setPanel("help")}>How to play</button>
                <button onClick={() => s.setPanel("settings")}>
                  <Volume2 size={14} /> Settings
                </button>
              </div>
            </nav>
          </section>
          <div className="menu-world-caption">
            <span className="eyebrow">LOCATION 01 / ENTRANCE HALL</span>
            <p>
              Something is waiting
              <br />
              in your unread messages.
            </p>
            <span className="coordinates">
              24 × 18 · SIX ROOMS · FOUR MUTATIONS
            </span>
          </div>
          <footer className="menu-footer">
            <span>
              <ShieldCheck size={14} /> MOCK EMAILS ONLY. YOUR REAL INBOX IS
              SAFE.
            </span>
            <span>
              WEBGL / DESKTOP EXPERIENCE <span className="version">V 1.0</span>
            </span>
          </footer>
        </>
      ) : null}
      {s.mode === "playing" ? <HUD /> : null}
      {panel === "mailbox" ? <Mailbox close={close} /> : null}
      {(paused || panel) && panel !== "mailbox" ? (
        <div className="overlay">
          <section className={`modal ${panel === "board" ? "wide" : ""}`}>
            <div className="modal-top">
              <span className="eyebrow">INBOX EVIL / {panel || "PAUSED"}</span>
              {panel && panel !== "briefing" ? (
                <button
                  className="icon-button"
                  onClick={close}
                  aria-label="Close panel"
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>
            {panel === "briefing" ? (
              <>
                <Briefing />
                <button className="primary full" onClick={resume}>
                  Enter house <ArrowRight size={17} />
                </button>
              </>
            ) : panel === "help" ? (
              <>
                <h2>Survival field guide</h2>
                <Help />
              </>
            ) : panel === "settings" ? (
              <>
                <h2>Audio & display</h2>
                <Settings />
              </>
            ) : panel === "map" ? (
              <>
                <h2>The infected house</h2>
                <Map />
              </>
            ) : panel === "inventory" ? (
              <>
                <h2>Field inventory</h2>
                <Inventory />
              </>
            ) : panel === "progress" ? (
              <>
                <h2>Agent progress report</h2>
                <Progress />
              </>
            ) : panel ? (
              <Puzzle key={panel} id={panel} close={close} />
            ) : (
              <>
                <p className="eyebrow">CONNECTION SUSPENDED</p>
                <h2>Catch your breath.</h2>
                <p className="muted">
                  Your virtual mailbox is saved. The infection can wait.
                </p>
                <div className="pause-actions">
                  <button className="primary" onClick={resume}>
                    Resume mission <ArrowRight size={17} />
                  </button>
                  <button
                    className="secondary"
                    onClick={() => s.setPanel("inventory")}
                  >
                    Inventory
                  </button>
                  <button
                    className="secondary"
                    onClick={() => s.setPanel("map")}
                  >
                    House map
                  </button>
                  <button
                    className="secondary"
                    onClick={() => s.setPanel("mailbox")}
                  >
                    Virtual mailbox
                  </button>
                  <button
                    className="secondary"
                    onClick={() => s.setPanel("progress")}
                  >
                    Progress report
                  </button>
                  <button
                    className="secondary"
                    onClick={() => s.setPanel("help")}
                  >
                    Controls
                  </button>
                  <button
                    className="secondary"
                    onClick={() => s.setPanel("settings")}
                  >
                    Settings
                  </button>
                  <button className="secondary" onClick={s.respawn}>
                    Restart checkpoint
                  </button>
                  <button
                    className="text-button"
                    onClick={() => s.setMode("menu")}
                  >
                    Return to main menu
                  </button>
                </div>
              </>
            )}
            {paused && panel && panel !== "briefing" ? (
              <button className="text-button panel-back" onClick={close}>
                ← Back to pause menu
              </button>
            ) : null}
          </section>
        </div>
      ) : null}
      {s.mode === "dead" && !panel ? (
        <div className="overlay">
          <section className="modal">
            <Skull size={38} className="death-icon" />
            <p className="eyebrow">AGENT CONNECTION LOST</p>
            <h2>The inbox claimed you.</h2>
            <p>
              {metrics(s.mail).processed} messages processed. All confirmed
              operations are preserved. Resume at your last boss or puzzle
              checkpoint with replenished ammunition.
            </p>
            <button className="primary full" onClick={s.respawn}>
              Restart from checkpoint
            </button>
            <button
              className="secondary full"
              onClick={() => s.setMode("menu")}
            >
              Main menu
            </button>
          </section>
        </div>
      ) : null}
      {s.mode === "victory" && !panel ? (
        <div className="overlay">
          <section className="modal wide">
            <ShieldCheck size={40} className="victory-icon" />
            <p className="eyebrow">ALL FOUR MUTATIONS NEUTRALIZED</p>
            <h2>INBOX RESTORED.</h2>
            <p>
              The house is quiet. Your simulated messages are accounted for.
            </p>
            <Progress />
            <div className="button-row">
              <button
                className="secondary"
                onClick={() => s.setPanel("mailbox")}
              >
                View virtual mailbox
              </button>
              <button className="secondary" onClick={newGame}>
                Play again
              </button>
              <button className="text-button" onClick={() => s.setMode("menu")}>
                Main menu
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {confirmNew ? (
        <div className="overlay confirm">
          <section className="modal">
            <h2>Start a fresh simulation?</h2>
            <p>
              This replaces the save on this browser. Export your current report
              first if you want to keep it.
            </p>
            <div className="button-row">
              <button
                className="secondary"
                onClick={() => {
                  if (s.storageError)
                    exportJSON(
                      localStorage.getItem("inbox-evil-v1"),
                      "inbox-evil-save-backup.json",
                    );
                  else exportJSON(report());
                }}
              >
                Export existing data
              </button>
              <button
                className="primary"
                onClick={() => {
                  setConfirmNew(false);
                  s.newGame();
                }}
              >
                Start new game
              </button>
              <button
                className="text-button"
                onClick={() => setConfirmNew(false)}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {s.message && Date.now() < s.messageUntil ? (
        <div className="notification" role="status">
          <ShieldCheck size={20} />
          <div>
            <small>LOCAL SIMULATION</small>
            <p>{s.message}</p>
          </div>
        </div>
      ) : null}
      {s.storageError ? (
        <div className="storage-warning" role="alert">
          {s.storageError}
        </div>
      ) : null}
    </main>
  );
}
