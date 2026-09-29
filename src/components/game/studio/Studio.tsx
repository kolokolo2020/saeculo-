"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloseGlyph, PlayGlyph, StopGlyph } from "@/components/site/Icons";
import Browser from "./Browser";
import { render, type Engine } from "./engine";
import Mixer from "./Mixer";
import PianoRoll from "./PianoRoll";
import { PRESETS } from "./presets";
import { clone, emptyPattern, emptyProject, isMelodic, loadStore, makeChannel, MAX_CHANNELS, PATTERN_NAMES, PROJECT_SLOTS, saveStore, stepsOf, type Channel, type Master, type Note, type Project, type Store } from "./project";
import Rack from "./Rack";
import { KEY_NAMES, SCALES } from "./scales";
import Song from "./Song";
import { chip } from "./ui";
import type { Voice } from "./voices";
import { encodeWav } from "./wav";

// The studio: a transport across the top, the sound browser on the left,
// the channel rack, and a bottom panel with the piano roll, the mixer and
// the song. Everything edits one project, which autosaves in the browser.

type Tab = "roll" | "mixer" | "song";

export default function Studio({ engine, found, fresh, onSeen, onClose }: { engine: Engine; found: string[]; fresh: string[]; onSeen: () => void; onClose: () => void }) {
  const [project, setProject] = useState<Project>(engine.project);
  const [pattern, setPatternState] = useState(engine.pattern);
  const [playing, setPlaying] = useState(engine.playing);
  const [loading, setLoading] = useState(engine.loading);
  const [pos, setPos] = useState({ step: -1, pattern: 0, slot: -1 });
  const [level, setLevel] = useState(0);
  const [selected, setSelected] = useState<string | null>(engine.project.channels[0]?.id ?? null);
  const [rollCh, setRollCh] = useState<string | null>(engine.project.channels.find(isMelodic)?.id ?? null);
  const [tab, setTab] = useState<Tab>("roll");
  const [sounds, setSounds] = useState(false);
  const [store, setStore] = useState<Store>(loadStore);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [freshOnOpen] = useState(fresh);
  const root = useRef<HTMLDivElement>(null);
  const history = useRef<Project[]>([]);
  const lastEdit = useRef({ key: "", at: 0 });
  const saveTimer = useRef(0);

  useEffect(() => engine.listen(() => {
    setPlaying(engine.playing);
    setLoading(engine.loading);
  }), [engine]);

  useEffect(() => {
    root.current?.focus();
    if (fresh.length) onSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // playheads and the meter
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let lastStep = -2;
    let frame = 0;
    const loop = () => {
      const p = engine.position();
      if (p.step !== lastStep) {
        lastStep = p.step;
        setPos(p);
      }
      if (++frame % 3 === 0) setLevel(engine.level());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, engine]);

  const persist = useCallback((p: Project, slots?: (Project | null)[]) => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      setStore((s) => {
        const next = { current: p, slots: slots ?? s.slots };
        saveStore(next);
        return next;
      });
    }, 300);
  }, []);

  /** Every edit goes through here: undo history, the engine, autosave. */
  const commit = useCallback(
    (next: Project, coalesce = "") => {
      const now = performance.now();
      const merge = coalesce && lastEdit.current.key === coalesce && now - lastEdit.current.at < 900;
      if (!merge) {
        history.current.push(project);
        if (history.current.length > 80) history.current.shift();
        setCanUndo(true);
      }
      lastEdit.current = { key: coalesce, at: now };
      setProject(next);
      engine.setProject(next);
      persist(next);
    },
    [project, engine, persist],
  );

  const edit = (fn: (p: Project) => void, coalesce = "") => {
    const next = clone(project);
    fn(next);
    commit(next, coalesce);
  };

  const undo = () => {
    const prev = history.current.pop();
    setCanUndo(history.current.length > 0);
    if (!prev) return;
    setProject(prev);
    engine.setProject(prev);
    persist(prev);
    flash("Undone.");
  };

  const flash = (msg: string) => {
    setNote(msg);
    window.setTimeout(() => setNote((n) => (n === msg ? "" : n)), 2400);
  };

  const setPattern = (i: number) => {
    setPatternState(i);
    engine.selectPattern(i);
  };

  const loadProject = (p: Project, msg: string) => {
    history.current.push(project);
    setCanUndo(true);
    const next = clone(p);
    setProject(next);
    engine.setProject(next);
    persist(next);
    setSelected(next.channels[0]?.id ?? null);
    setRollCh(next.channels.find(isMelodic)?.id ?? null);
    setPattern(0);
    flash(msg);
  };

  // ------------------------------------------------------------ channel edits

  const onChannel = (id: string, partial: Partial<Channel>) =>
    edit((p) => {
      const c = p.channels.find((x) => x.id === id);
      if (c) Object.assign(c, partial);
    }, `ch-${id}-${Object.keys(partial).join()}`);

  const onStep = (id: string, step: number, soft: boolean) =>
    edit((p) => {
      const pat = p.patterns[pattern];
      const s = stepsOf(pat, id, p.length);
      s[step] = soft ? (s[step] === 0 ? 0.6 : s[step] < 1 ? 1 : 0.6) : s[step] > 0 ? 0 : 1;
      pat.steps[id] = s;
      const c = p.channels.find((x) => x.id === id);
      if (c && s[step] > 0 && !engine.playing) void engine.preview(c.voice, { midi: 60 + c.pitch, channel: id });
    });

  const addChannel = (v: Voice) => {
    if (project.channels.length >= MAX_CHANNELS) return flash(`The rack holds ${MAX_CHANNELS} channels.`);
    const c = makeChannel(v.id, v.kind === "melodic" ? { rev: 0.25 } : {});
    edit((p) => {
      p.channels.push(c);
    });
    setSelected(c.id);
    if (v.kind === "melodic") {
      setRollCh(c.id);
      setTab("roll");
    }
    flash(`Added ${v.name}.`);
  };

  const swapVoice = (v: Voice) => {
    if (!selected) return;
    const old = project.channels.find((c) => c.id === selected);
    if (!old) return;
    const wasMelodic = isMelodic(old);
    edit((p) => {
      const c = p.channels.find((x) => x.id === selected)!;
      c.voice = v.id;
      // a drum row can't keep notes, a melodic row can't keep steps
      if (wasMelodic !== (v.kind === "melodic")) p.patterns.forEach((pat) => {
        delete pat.notes[c.id];
        delete pat.steps[c.id];
      });
    });
    if (v.kind === "melodic") setRollCh(selected);
    flash(`Now ${v.name}.`);
  };

  const removeChannel = (id: string) => {
    edit((p) => {
      p.channels = p.channels.filter((c) => c.id !== id);
      p.patterns.forEach((pat) => {
        delete pat.steps[id];
        delete pat.notes[id];
      });
    });
    if (selected === id) setSelected(null);
    if (rollCh === id) setRollCh(null);
  };

  const moveChannel = (id: string, dir: -1 | 1) =>
    edit((p) => {
      const i = p.channels.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.channels.length) return;
      [p.channels[i], p.channels[j]] = [p.channels[j], p.channels[i]];
    });

  const onNotes = (id: string, notes: Note[], coalesce?: string) =>
    edit((p) => {
      p.patterns[pattern].notes[id] = notes;
    }, coalesce ? `${coalesce}-${id}` : "");

  const onMaster = (partial: Partial<Master>) =>
    edit((p) => {
      Object.assign(p.master, partial);
    }, `master-${Object.keys(partial).join()}`);

  // ------------------------------------------------------------ files

  const exportWav = async (what: "pattern" | "song") => {
    setBusy(true);
    flash("Bouncing…");
    try {
      const buf = await render(project, what, pattern);
      const url = URL.createObjectURL(encodeWav(buf));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/[^\w\- ]+/g, "").trim() || "beat"}${what === "pattern" ? ` ${PATTERN_NAMES[pattern]}` : ""}.wav`;
      a.dataset.testid = "studio-download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      flash(`Saved ${a.download} (${Math.round(buf.duration)} s).`);
    } catch {
      flash("Couldn't bounce that one.");
    } finally {
      setBusy(false);
    }
  };

  const saveSlot = (i: number) => {
    const slots = [...store.slots];
    slots[i] = clone(project);
    const next = { current: project, slots };
    setStore(next);
    saveStore(next);
    flash(`Saved to slot ${i + 1}. It's on your shelf at home.`);
  };

  // ------------------------------------------------------------ keys

  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement;
    const typing = !!el.closest("input, select, textarea");
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
      e.preventDefault();
      undo();
    } else if (e.key === " " && !typing && !el.closest("button, [role=application]")) {
      e.preventDefault();
      if (engine.playing) engine.stop();
      else void engine.start();
    }
  };

  const now = playing && (project.mode === "song" ? pos.pattern === pattern : true) ? pos.step : -1;
  const shownPattern = pattern;

  return (
    <div ref={root} tabIndex={-1} role="dialog" aria-label="Studio" onKeyDown={onKeyDown} className="deck game-fade absolute inset-0 z-30 flex flex-col overflow-hidden outline-none" data-testid="studio">
      {/* transport */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#2a2724] px-3 py-2">
        <h2 className="font-lcd text-[26px] leading-none text-[#e8e0cf]">studio</h2>
        <button
          className="deck-btn deck-btn-main w-[86px]"
          onClick={() => (engine.playing ? engine.stop() : void engine.start())}
          data-testid="studio-play"
          aria-label={playing ? "Stop" : "Play"}
        >
          <span className="flex items-center gap-2 font-lcd text-[19px]">
            {playing ? <StopGlyph size={13} /> : <PlayGlyph size={13} />}
            {loading ? "…" : playing ? "stop" : "play"}
          </span>
        </button>
        <div className="flex items-center gap-1" role="group" aria-label="Pattern">
          {PATTERN_NAMES.map((n, i) => (
            <button
              key={n}
              className={`h-8 w-8 rounded-[3px] border font-lcd text-[19px] ${pattern === i ? "border-amber bg-[#2d2618] text-amber" : "border-[#3a3733] text-[#cfc6b3]"} ${playing && pos.pattern === i ? "shadow-[inset_0_-3px_0_#f2b45a]" : ""}`}
              onClick={() => setPattern(i)}
              aria-pressed={pattern === i}
              aria-label={`Edit pattern ${n}`}
            >
              {n}
            </button>
          ))}
          <select
            className="ml-1 rounded-[3px] border border-[#3a3733] bg-[#1d1b19] px-1 py-1 text-[12px] text-[#e8e0cf]"
            value=""
            aria-label="Copy or clear this pattern"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "clear") edit((p) => void (p.patterns[pattern] = emptyPattern()));
              else if (v) edit((p) => void (p.patterns[Number(v)] = clone(p.patterns[pattern])));
              flash(v === "clear" ? `Cleared ${PATTERN_NAMES[pattern]}.` : `Copied ${PATTERN_NAMES[pattern]} to ${PATTERN_NAMES[Number(v)]}.`);
            }}
          >
            <option value="">{PATTERN_NAMES[pattern]}…</option>
            {PATTERN_NAMES.map((n, i) => (i === pattern ? null : <option key={n} value={i}>copy to {n}</option>))}
            <option value="clear">clear {PATTERN_NAMES[pattern]}</option>
          </select>
        </div>
        <button className={chip} aria-pressed={project.mode === "song"} onClick={() => edit((p) => void (p.mode = p.mode === "song" ? "pattern" : "song"))} data-testid="studio-mode">
          {project.mode === "song" ? "song" : "loop pattern"}
        </button>
        <div className="flex items-center gap-1 text-[12px] text-[#b9b09e]">
          <button className={chip} onClick={() => edit((p) => void (p.tempo = Math.max(60, p.tempo - 1)), "tempo")} aria-label="Slower">
            −
          </button>
          <label className="flex items-center gap-1">
            <input
              type="number"
              min={60}
              max={180}
              value={project.tempo}
              onChange={(e) => {
                const v = Math.round(Number(e.target.value));
                if (v >= 60 && v <= 180) edit((p) => void (p.tempo = v), "tempo");
              }}
              className="w-14 rounded-[3px] border border-[#3a3733] bg-[#11100f] px-1 py-1 text-center font-lcd text-[18px] text-amber"
              aria-label="Tempo"
            />
            bpm
          </label>
          <button className={chip} onClick={() => edit((p) => void (p.tempo = Math.min(180, p.tempo + 1)), "tempo")} aria-label="Faster">
            +
          </button>
        </div>
        <label className="flex items-center gap-1 text-[12px] text-[#b9b09e]">
          swing
          <input
            type="range"
            className="deck-range w-16"
            min={0}
            max={0.45}
            step={0.05}
            value={project.swing}
            onChange={(e) => edit((p) => void (p.swing = Number(e.target.value)), "swing")}
            style={{ ["--fill" as string]: `${(project.swing / 0.45) * 100}%` }}
          />
        </label>
        <select className="rounded-[3px] border border-[#3a3733] bg-[#1d1b19] px-1 py-1 text-[12.5px] text-[#e8e0cf]" value={project.key} onChange={(e) => edit((p) => void (p.key = Number(e.target.value)))} aria-label="Key">
          {KEY_NAMES.map((k, i) => (
            <option key={k} value={i}>
              {k}
            </option>
          ))}
        </select>
        <select className="rounded-[3px] border border-[#3a3733] bg-[#1d1b19] px-1 py-1 text-[12.5px] text-[#e8e0cf]" value={project.scale} onChange={(e) => edit((p) => void (p.scale = e.target.value))} aria-label="Scale">
          {Object.entries(SCALES).map(([id, s]) => (
            <option key={id} value={id}>
              {s.name}
            </option>
          ))}
        </select>
        <button className={chip} onClick={() => edit((p) => void (p.length = p.length === 16 ? 32 : 16))} aria-label={`Pattern length: ${project.length} steps`}>
          {project.length / 16} bar{project.length === 32 ? "s" : ""}
        </button>
        <div className="h-2 w-16 overflow-hidden rounded-full bg-[#2a2724]" role="meter" aria-label="Output level" aria-valuemin={0} aria-valuemax={1} aria-valuenow={Math.round(level * 100) / 100}>
          <div className="h-full bg-gradient-to-r from-[#8fb37a] via-amber to-[#d0694f]" style={{ width: `${Math.round(level * 100)}%` }} />
        </div>
        <button className={chip} onClick={undo} disabled={!canUndo} aria-label="Undo">
          undo
        </button>
        <details className="relative">
          <summary className={`${chip} cursor-default list-none`}>project ▾</summary>
          <div className="absolute right-0 z-40 mt-1 flex w-72 flex-col gap-2 rounded-[3px] border border-[#3a3733] bg-[#171615] p-2.5 shadow-xl sm:left-0 sm:right-auto">
            <label className="flex flex-col gap-1 text-[12px] text-[#b9b09e]">
              name
              <input className="rounded-[3px] border border-[#3a3733] bg-[#11100f] px-2 py-1 text-[13px] text-[#e8e0cf]" value={project.name} maxLength={40} onChange={(e) => edit((p) => void (p.name = e.target.value), "name")} />
            </label>
            <p className="text-[12px] text-[#b9b09e]">start from</p>
            <div className="flex flex-col gap-1">
              {PRESETS.map((pr) => (
                <button key={pr.id} className={`${chip} text-left`} onClick={() => loadProject(pr.make(), `Loaded ${pr.name}.`)}>
                  {pr.name}
                </button>
              ))}
              <button className={`${chip} text-left`} onClick={() => loadProject(emptyProject(), "New project.")}>
                empty project
              </button>
            </div>
            <p className="text-[12px] text-[#b9b09e]">saved in this browser</p>
            <ul className="flex flex-col gap-1">
              {Array.from({ length: PROJECT_SLOTS }, (_, i) => {
                const s = store.slots[i];
                return (
                  <li key={i} className="flex items-center gap-1 text-[12px]">
                    <span className="min-w-0 flex-1 truncate text-[#cfc6b3]">
                      {i + 1}. {s ? `${s.name} · ${s.tempo}` : <span className="text-[#948b7a]">empty</span>}
                    </span>
                    <button className={chip} onClick={() => saveSlot(i)}>
                      save
                    </button>
                    <button className={chip} disabled={!s} onClick={() => s && loadProject(s, `Loaded ${s.name}.`)}>
                      load
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-[12px] text-[#b9b09e]">bounce to WAV</p>
            <div className="flex gap-1">
              <button className={chip} disabled={busy} onClick={() => exportWav("pattern")}>
                pattern {PATTERN_NAMES[pattern]}
              </button>
              <button className={chip} disabled={busy} onClick={() => exportWav("song")} data-testid="studio-export">
                whole song
              </button>
            </div>
          </div>
        </details>
        <button className="ml-auto flex items-center gap-1.5 rounded-[3px] border border-[#3a3733] px-2.5 py-1.5 text-[13px] text-[#cfc6b3] hover:text-white" onClick={onClose} aria-label="Back to the room" title="Back to the room (Esc)">
          <CloseGlyph size={11} /> room <span className="text-[#948b7a]">Esc</span>
        </button>
      </div>

      <p className="min-h-[1.4em] shrink-0 px-3 pt-1 text-[12.5px] text-amber" role="status">
        {note}
      </p>

      {/* body */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3 lg:flex-row lg:overflow-hidden">
        <button className={`${chip} self-start lg:hidden`} aria-expanded={sounds} onClick={() => setSounds(!sounds)}>
          {sounds ? "hide sounds" : "sounds ▾"}
        </button>
        <aside className={`${sounds ? "flex" : "hidden"} max-h-[50vh] min-h-0 flex-col lg:flex lg:max-h-none lg:w-[250px] lg:shrink-0`}>
          <Browser
            found={found}
            fresh={freshOnOpen}
            canAdd={project.channels.length < MAX_CHANNELS}
            canSwap={!!selected}
            onPreview={(v) => void engine.preview(v.id, { midi: v.kind === "melodic" ? (v.cat === "808 & bass" ? 36 : 60) : 60, dur: 0.6 })}
            onAdd={addChannel}
            onSwap={swapVoice}
          />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <section className="shrink-0 lg:max-h-[46%] lg:overflow-y-auto" aria-label={`Pattern ${PATTERN_NAMES[shownPattern]}`}>
            <Rack
              project={project}
              pattern={shownPattern}
              selected={selected}
              now={now}
              onSelect={setSelected}
              onStep={onStep}
              onChannel={onChannel}
              onRemove={removeChannel}
              onMove={moveChannel}
              onOpenRoll={(id) => {
                setSelected(id);
                setRollCh(id);
                setTab("roll");
              }}
            />
          </section>
          <section className="flex min-h-[260px] flex-1 flex-col gap-2 lg:min-h-0">
            <div className="flex gap-1" role="tablist" aria-label="Editor">
              {(
                [
                  ["roll", "piano roll"],
                  ["mixer", "mixer"],
                  ["song", "song"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  className="rounded-t-[3px] border border-b-0 border-transparent px-3 py-1 font-lcd text-[19px] leading-none text-[#948b7a] aria-selected:border-[#3a3733] aria-selected:bg-[#1f1d1b] aria-selected:text-[#e8e0cf]"
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-[3px] border border-[#3a3733] bg-[#1a1917] p-2.5" role="tabpanel">
              {tab === "roll" && (
                <PianoRoll
                  project={project}
                  pattern={shownPattern}
                  channelId={rollCh}
                  now={now}
                  onPick={(id) => {
                    setRollCh(id);
                    setSelected(id);
                  }}
                  onNotes={onNotes}
                  onAudition={(midi, dur) => {
                    const c = project.channels.find((x) => x.id === rollCh);
                    if (c && !engine.playing) void engine.preview(c.voice, { midi: midi + c.pitch, dur, channel: c.id });
                  }}
                />
              )}
              {tab === "mixer" && <Mixer project={project} onChannel={onChannel} onMaster={onMaster} />}
              {tab === "song" && <Song project={project} slot={playing && project.mode === "song" ? pos.slot : -1} onSong={(song) => edit((p) => void (p.song = song))} onMode={(mode) => edit((p) => void (p.mode = mode))} />}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

