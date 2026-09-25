import { useMemo, useState } from "react";
import "./styles.css";
import RehearsalView from "./components/RehearsalView";
import FixturesView from "./components/FixturesView";
import CuesView from "./components/CuesView";
import VersionsView from "./components/VersionsView";
import { useTheater } from "./useTheater";
import { versionSummary } from "./logic";

type Tab = "rehearsal" | "fixtures" | "cues" | "versions";

const TABS: { id: Tab; label: string }[] = [
  { id: "rehearsal", label: "排练台" },
  { id: "fixtures", label: "灯具焦点" },
  { id: "cues", label: "Cue 依赖" },
  { id: "versions", label: "版本进度" },
];

export default function App() {
  const store = useTheater();
  const [tab, setTab] = useState<Tab>("rehearsal");
  const { data, current, cueViews, fixtureViews } = store;

  const summary = useMemo(() => versionSummary(cueViews), [cueViews]);
  const unconfirmed = fixtureViews.filter((v) => !v.fixture.focusConfirmed).length;
  const channelDupes = new Set(
    data.fixtures.filter((f) =>
      data.fixtures.some((o) => o.id !== f.id && o.channel === f.channel),
    ).map((f) => f.channel),
  ).size;

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62002 · 剧场灯光 · Port 62002</p>
        <h1>剧场灯光 Cue 表管理</h1>
        <span>
          排练演出版：灯具焦点确认后，关联 Cue 才进入待触发；通道号撞车或前一条 Cue
          未完成时，后一条无法触发。灯具焦点、Cue 依赖、版本进度分开维护，灯位图与
          Cue 列表实时显示当前状态。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>灯具数量</small>
          <strong>{data.fixtures.length}</strong>
          <em>{unconfirmed} 盏焦点待确认</em>
        </article>
        <article>
          <small>Cue 数量</small>
          <strong>{data.cues.length}</strong>
          <em>{summary.armed} 条待触发</em>
        </article>
        <article>
          <small>当前场景</small>
          <strong className="metric-text">
            {summary.triggered > 0
              ? `${summary.triggered} 条点亮中`
              : summary.done === summary.total
                ? "本场走完"
                : "暗场等待"}
          </strong>
          <em>{current.name}</em>
        </article>
        <article>
          <small>排练进度 / 通道告警</small>
          <strong>
            {summary.done}/{summary.total}
          </strong>
          <em className={channelDupes > 0 ? "alert-text" : ""}>
            {channelDupes > 0 ? `${channelDupes} 个通道撞车` : "通道无撞车"}
          </em>
        </article>
      </section>

      <section className="panel version-bar">
        <div className="version-tabs">
          {data.versions.map((v) => (
            <button
              key={v.id}
              className={`version-tab${v.isCurrent ? " version-tab-on" : ""}`}
              onClick={() => store.switchVersion(v.id)}
              title={v.note}
            >
              {v.name}
              {v.isCurrent && <i className="tab-live" />}
            </button>
          ))}
        </div>
        <div className="version-bar-note">
          <textarea
            rows={2}
            value={current.note}
            placeholder="当前版本备注…"
            onChange={(e) => store.setVersionNote(current.id, e.target.value)}
          />
        </div>
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "tab-on" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button
          className="tab-reset"
          onClick={() => {
            if (confirm("恢复内置演示资料？当前所有修改将丢失。")) store.resetAllData();
          }}
        >
          恢复演示数据
        </button>
      </nav>

      {tab === "rehearsal" && <RehearsalView store={store} />}
      {tab === "fixtures" && <FixturesView store={store} />}
      {tab === "cues" && <CuesView store={store} />}
      {tab === "versions" && <VersionsView store={store} />}

      <footer className="foot-note">
        资料保存在本机浏览器（localStorage）：灯具焦点与 Cue 依赖全局共享，触发进度与备注按版本独立保存。
      </footer>
    </main>
  );
}
