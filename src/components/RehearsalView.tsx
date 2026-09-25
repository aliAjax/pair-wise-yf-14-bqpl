import { useMemo, useState } from "react";
import { formatChannels, versionSummary } from "../logic";
import type { TheaterStore } from "../useTheater";
import type { FixtureCategory } from "../types";
import { CATEGORIES } from "../types";
import StageMap from "./StageMap";
import CueCard from "./CueCard";

export default function RehearsalView({ store }: { store: TheaterStore }) {
  const { cueViews, fixtureViews, current } = store;
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(CATEGORIES),
  );
  const [selectedFixture, setSelectedFixture] = useState<string | null>(null);

  const summary = useMemo(() => versionSummary(cueViews), [cueViews]);
  const activeCues = cueViews.filter((v) => v.state === "triggered");

  const toggleCategory = (cat: FixtureCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="rehearsal">
      <section className="panel scene-panel">
        <div className="heading">
          <div>
            <p>当前场景预览</p>
            <h2>舞台平面灯位图 · {current.name}</h2>
          </div>
          <div className="scene-stats">
            <span>已完成 {summary.done}/{summary.total}</span>
            <span className="live-dot" /> 点亮中 {activeCues.length}
          </div>
        </div>

        <div className="active-strip">
          {activeCues.length === 0 ? (
            <span className="muted">当前没有已触发未完成的 Cue，舞台处于暗场/等待状态。</span>
          ) : (
            activeCues.map((v) => (
              <span key={v.cue.id} className="active-chip">
                <b>{v.cue.id}</b> {v.cue.name}
                <i>{formatChannels(v.channels)} · {v.cue.preset}%</i>
              </span>
            ))
          )}
        </div>

        <StageMap
          fixtureViews={fixtureViews}
          cueViews={cueViews}
          activeCategories={activeCategories}
          selectedId={selectedFixture}
          onSelect={(id) => setSelectedFixture(id || null)}
          onToggleFocus={store.toggleFocus}
        />

        <div className="chips filter-chips">
          <span className="filter-label">灯具筛选：</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={activeCategories.has(cat) ? "chip-on" : ""}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="panel cue-list-panel">
        <div className="heading">
          <div>
            <p>排练进程 · {current.name}</p>
            <h2>Cue 列表</h2>
          </div>
          <button className="ghost" onClick={store.resetVersionProgress}>
            复位本版进度
          </button>
        </div>

        <div className="progress-track">
          {cueViews.map((v) => (
            <span
              key={v.cue.id}
              className={`track-dot track-${v.state}`}
              title={`${v.cue.id}：${v.state}`}
            />
          ))}
          <small>
            {summary.done} 完成 · {summary.triggered} 触发中 · {summary.armed} 待触发 ·{" "}
            {summary.blocked} 不可触发
          </small>
        </div>

        <div className="cue-cards">
          {cueViews.map((view) => (
            <CueCard
              key={view.cue.id}
              view={view}
              onTrigger={store.triggerCue}
              onComplete={store.completeCue}
              onReset={store.resetCue}
              onNoteChange={(id, note) => store.patchProgress(id, { note })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
