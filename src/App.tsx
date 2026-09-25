import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import {
  conflictChannels,
  FIXTURE_TYPES,
  getCueRows,
  lastDoneCue,
  ShowProvider,
  useShow,
  type CueRow,
} from "./state";
import type { Cue, Fixture, FixtureType } from "./types";

/** 测量容器像素尺寸，让 SVG 按真实宽高比建立 viewBox，圆点不被拉伸 */
function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 800, h: 460 });
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

const TYPE_COLORS: Record<FixtureType, string> = {
  面光: "#f59e0b",
  侧光: "#06b6d4",
  逆光: "#7c3aed",
  效果光: "#e879f9",
};

function App() {
  return (
    <ShowProvider>
      <Shell />
    </ShowProvider>
  );
}

function Shell() {
  const { state, currentVersion, actions } = useShow();
  const { data } = state;
  const [tab, setTab] = useState<"rehearse" | "fixtures" | "cues">("rehearse");

  const rows = useMemo(() => getCueRows(data, currentVersion), [data, currentVersion]);
  const conflicts = useMemo(() => conflictChannels(data.fixtures), [data.fixtures]);
  const focusPending = data.fixtures.filter((f) => !f.focusConfirmed);
  const currentCue = lastDoneCue(data, currentVersion);
  const doneCount = rows.filter((r) => r.done).length;

  return (
    <main className="app">
      <header className="hero">
        <p>{currentVersion.kind === "performance" ? "演出版本 · 排练进程" : "旧版本 · 录资料"}</p>
        <h1>
          <input
            className="show-name"
            value={data.showName}
            onChange={(e) => actions.setShowName(e.target.value)}
            aria-label="演出名称"
          />
        </h1>
        <span>
          灯具焦点、Cue 依赖、版本进度三层分开维护。规则：焦点确认后关联 Cue 才进入待触发；通道号撞车或前一条
          Cue 未完成时，后一条不能触发。切换版本保留各自进度与备注。
        </span>
        <div className="version-bar">
          {data.versions.map((v) => (
            <button
              key={v.id}
              className={`version-tab ${v.id === currentVersion.id ? "active" : ""} ${v.kind}`}
              onClick={() => actions.switchVersion(v.id)}
              title={v.kind === "legacy" ? "旧版本：继续原来的进度和备注" : "演出版本"}
            >
              {v.label}
              <em>
                {Object.values(v.progress).filter((p) => p.status === "done").length}/{data.cues.length}
              </em>
            </button>
          ))}
          <button className="version-tab ghost" onClick={actions.addVersion}>
            ＋ 新建演出版
          </button>
        </div>
        <div className="version-note">
          <input
            value={currentVersion.label}
            onChange={(e) => actions.setVersionLabel(currentVersion.id, e.target.value)}
            className="version-label-input"
            aria-label="版本名称"
          />
          <input
            value={currentVersion.note}
            placeholder="版本备注（按版本独立保存）…"
            onChange={(e) => actions.setVersionNote(currentVersion.id, e.target.value)}
          />
        </div>
      </header>

      <section className="metrics">
        <article>
          <small>灯具数量</small>
          <strong>{data.fixtures.length}</strong>
        </article>
        <article>
          <small>Cue 进度（当前版本）</small>
          <strong>
            {doneCount}
            <i>/{data.cues.length}</i>
          </strong>
        </article>
        <article>
          <small>当前场景</small>
          <strong className="scene-name">{currentCue ? `Cue ${currentCue.cueNo}` : "—"}</strong>
        </article>
        <article className={focusPending.length + conflicts.size > 0 ? "warn" : ""}>
          <small>待确认焦点 / 通道撞车</small>
          <strong>
            {focusPending.length}
            <i> / {conflicts.size}</i>
          </strong>
        </article>
      </section>

      <nav className="tabs">
        <button className={tab === "rehearse" ? "active" : ""} onClick={() => setTab("rehearse")}>
          排练台（灯位图 + Cue 触发）
        </button>
        <button className={tab === "fixtures" ? "active" : ""} onClick={() => setTab("fixtures")}>
          灯具焦点维护
        </button>
        <button className={tab === "cues" ? "active" : ""} onClick={() => setTab("cues")}>
          Cue 依赖维护
        </button>
        <button className="reset" onClick={() => window.confirm("重置为初始演示数据？") && actions.resetAll()}>
          重置演示数据
        </button>
      </nav>

      {tab === "rehearse" && (
        <RehearseTab
          rows={rows}
          conflicts={conflicts}
          focusPending={focusPending}
          currentCue={currentCue}
        />
      )}
      {tab === "fixtures" && <FixturesTab conflicts={conflicts} />}
      {tab === "cues" && <CuesTab />}
    </main>
  );
}

/* ================= 排练台 ================= */

function RehearseTab({
  rows,
  conflicts,
  focusPending,
  currentCue,
}: {
  rows: CueRow[];
  conflicts: Map<number, Fixture[]>;
  focusPending: Fixture[];
  currentCue: Cue | null;
}) {
  const { state, currentVersion, actions } = useShow();
  const { data } = state;
  const selected = data.fixtures.find((f) => f.id === state.selectedFixtureId) ?? null;

  return (
    <>
      {(conflicts.size > 0 || focusPending.length > 0) && (
        <section className="banner">
          {conflicts.size > 0 && (
            <p>
              ⚠ 通道号撞车：
              {[...conflicts.entries()].map(([ch, list]) => (
                <b key={ch}>
                  CH {ch}（{list.map((f) => f.code).join(" / ")}）
                </b>
              ))}
              ，相关 Cue 已锁定，请到「灯具焦点维护」改通道号。
            </p>
          )}
          {focusPending.length > 0 && (
            <p>
              ⚠ 待确认焦点：{focusPending.map((f) => `${f.code}（${f.focus}）`).join("、")}
              ，确认后关联 Cue 才会进入待触发。
            </p>
          )}
        </section>
      )}

      <section className="workspace">
        <aside className="panel">
          <h2>灯具筛选</h2>
          <div className="chips">
            {(["全部", ...FIXTURE_TYPES] as const).map((t) => (
              <button
                key={t}
                className={state.filter === t ? "chip active" : "chip"}
                style={t !== "全部" ? { borderColor: TYPE_COLORS[t] } : undefined}
                onClick={() => actions.setFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <h2 className="mt">当前场景预览</h2>
          <ScenePreview cue={currentCue} fixtures={data.fixtures} />

          {selected && (
            <div className="fixture-detail">
              <h2 className="mt">
                {selected.code}
                <span className={`focus-pill ${selected.focusConfirmed ? "ok" : "pending"}`}>
                  {selected.focusConfirmed ? "焦点已确认" : "待确认焦点"}
                </span>
              </h2>
              <p>
                {selected.type} · CH {selected.channel} · {selected.gel}
              </p>
              <p>焦点：{selected.focus}</p>
              <label className="check">
                <input
                  type="checkbox"
                  checked={selected.focusConfirmed}
                  onChange={() => actions.toggleFocus(selected.id)}
                />
                焦点已确认（确认后关联 Cue 进入待触发）
              </label>
              <div className="mini-grid">
                <label>
                  <span>通道号</span>
                  <input
                    type="number"
                    min={1}
                    max={512}
                    value={selected.channel}
                    onChange={(e) =>
                      actions.updateFixture(selected.id, { channel: Number(e.target.value) || 1 })
                    }
                  />
                </label>
                <label>
                  <span>色片</span>
                  <input
                    value={selected.gel}
                    onChange={(e) => actions.updateFixture(selected.id, { gel: e.target.value })}
                  />
                </label>
              </div>
              <label>
                <span>焦点位置</span>
                <input
                  value={selected.focus}
                  onChange={(e) => actions.updateFixture(selected.id, { focus: e.target.value })}
                />
              </label>
            </div>
          )}
        </aside>

        <section className="panel">
          <div className="heading">
            <div>
              <p>舞台平面灯位图</p>
              <h2>点击灯具查看 / 确认焦点</h2>
            </div>
            <div className="legend">
              {FIXTURE_TYPES.map((t) => (
                <span key={t}>
                  <i style={{ background: TYPE_COLORS[t] }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
          <StageMap
            fixtures={data.fixtures}
            filter={state.filter}
            conflicts={conflicts}
            selectedId={state.selectedFixtureId}
            onSelect={(id) => actions.selectFixture(id === state.selectedFixtureId ? null : id)}
          />
        </section>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>Cue 列表 · {currentVersion.label}</p>
            <h2>按顺序触发，阻塞项实时提示</h2>
          </div>
        </div>
        <div className="cue-list">
          {rows.map((row) => (
            <CueRowView key={row.cue.id} row={row} versionId={currentVersion.id} />
          ))}
        </div>
      </section>
    </>
  );
}

function StageMap({
  fixtures,
  filter,
  conflicts,
  selectedId,
  onSelect,
}: {
  fixtures: Fixture[];
  filter: FixtureType | "全部";
  conflicts: Map<number, Fixture[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const conflictIds = new Set([...conflicts.values()].flat().map((f) => f.id));
  const { ref, w, h } = useBoxSize<HTMLDivElement>();
  // 逻辑坐标 x,y ∈ 0..100；Y 轴按容器宽高比映射并留内边距，圆形灯不贴边
  const aspect = h / w;
  const P = (x: number, y: number): [number, number] => [x, (3 + y * 0.94) * aspect];
  const V = 100 * aspect; // viewBox 高
  return (
    <div ref={ref} className="stage-map-wrap">
      <svg viewBox={`0 0 100 ${V}`} className="stage-map">
        <rect x={2} y={P(0, 2)[1]} width={96} height={77.08 * aspect} rx={2} className="stage-floor" />
        <text x={50} y={P(0, 5)[1]} className="stage-label" textAnchor="middle">
          舞台后缘（逆光吊杆）
        </text>
        <text x={50} y={P(0, 96)[1]} className="stage-label" textAnchor="middle">
          观众席 / 面光桥
        </text>
        {fixtures.map((f) => (
          <line
            key={`beam-${f.id}`}
            x1={P(f.x, f.y)[0]}
            y1={P(f.x, f.y)[1]}
            x2={P(f.fx, f.fy)[0]}
            y2={P(f.fx, f.fy)[1]}
            className={`focus-line ${f.focusConfirmed ? "ok" : "pending"}`}
          />
        ))}
        {fixtures.map((f) => {
          const [cx, cy] = P(f.fx, f.fy);
          return (
            <g key={`fx-${f.id}`}>
              <line x1={cx - 1.6} y1={cy} x2={cx + 1.6} y2={cy} className="focus-cross" />
              <line x1={cx} y1={cy - 1.6} x2={cx} y2={cy + 1.6} className="focus-cross" />
            </g>
          );
        })}
        {fixtures.map((f) => {
          const dim = filter !== "全部" && f.type !== filter;
          const [cx, cy] = P(f.x, f.y);
          return (
            <g
              key={f.id}
              className={`fixture ${dim ? "dim" : ""} ${selectedId === f.id ? "selected" : ""}`}
              onClick={() => onSelect(f.id)}
            >
              <circle cx={cx} cy={cy} r="3.4" fill={TYPE_COLORS[f.type]} opacity={dim ? 0.25 : 0.9} />
              <circle
                cx={cx}
                cy={cy}
                r="3.4"
                fill="none"
                stroke={conflictIds.has(f.id) ? "#ef4444" : f.focusConfirmed ? "#16a34a" : "#f59e0b"}
                strokeWidth={selectedId === f.id ? 1.2 : 0.7}
                strokeDasharray={f.focusConfirmed ? "0" : "1.4 1"}
              />
              <text x={cx} y={cy - 4.6} textAnchor="middle" className="fixture-code">
                {f.code}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ScenePreview({ cue, fixtures }: { cue: Cue | null; fixtures: Fixture[] }) {
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  const active = cue
    ? cue.levels
        .map((l) => ({ f: byId.get(l.fixtureId), level: l.level }))
        .filter((x): x is { f: Fixture; level: number } => Boolean(x.f))
    : [];
  const { ref, w, h } = useBoxSize<HTMLDivElement>();
  const aspect = h / w;
  const V = 100 * aspect;
  const Y = (y: number) => (3 + y * 0.94) * aspect;
  return (
    <div className="scene-preview">
      <div ref={ref} className="preview-svg-wrap">
        <svg viewBox={`0 0 100 ${V}`}>
          <rect x={0} y={0} width={100} height={V} className="preview-bg" />
          {active.map(({ f, level }) => {
            const [x1, y1] = [f.x, Y(f.y)];
            const [x2, y2] = [f.fx, Y(f.fy)];
            return (
              <polygon
                key={f.id}
                points={`${x1},${y1} ${x2 - 7},${y2} ${x2 + 7},${y2}`}
                fill={f.color}
                opacity={0.12 + (level / 100) * 0.5}
              />
            );
          })}
          {active.map(({ f, level }) => (
            <circle
              key={`h-${f.id}`}
              cx={f.fx}
              cy={Y(f.fy)}
              r={1.4 + level / 40}
              fill={f.color}
              opacity="0.9"
            />
          ))}
          {active.length === 0 && (
            <text x="50" y={V / 2} textAnchor="middle" className="preview-empty">
              尚未触发任何 Cue
            </text>
          )}
        </svg>
      </div>
      <p>
        {cue ? (
          <>
            当前场景：<b>Cue {cue.cueNo} · {cue.name}</b>
            <span className="levels">
              {active.map(({ f, level }) => `${f.code} ${level}%`).join(" · ")}
            </span>
          </>
        ) : (
          "触发第一条 Cue 后在此预览场景"
        )}
      </p>
    </div>
  );
}

function CueRowView({ row, versionId }: { row: CueRow; versionId: string }) {
  const { state, actions } = useShow();
  const { cue } = row;
  const fixtureById = new Map(state.data.fixtures.map((f) => [f.id, f]));
  const statusClass = row.done ? "done" : row.ready ? "ready" : "blocked";
  const statusText = row.done
    ? `已触发 ${row.progress?.firedAt ?? ""}`
    : row.ready
      ? "待触发"
      : "未就绪";

  return (
    <article className={`cue-row ${statusClass}`}>
      <div className="cue-no">
        <b>{cue.cueNo}</b>
        <span className={`status-dot ${statusClass}`} />
      </div>
      <div className="cue-main">
        <h3>
          Cue {cue.cueNo} · {cue.name}
          <span className={`badge ${statusClass}`}>{statusText}</span>
          {row.brokenChain && <span className="badge broken">前序已撤销，链条中断</span>}
        </h3>
        <p className="levels">
          {cue.levels.length === 0
            ? "（未关联灯具）"
            : cue.levels
                .map((l) => {
                  const f = fixtureById.get(l.fixtureId);
                  return f ? `${f.code}·CH${f.channel}·${l.level}%` : "已删除灯具";
                })
                .join("　")}
        </p>
        {cue.note && <p className="tech-note">资料备注：{cue.note}</p>}
        {!row.done && row.reasons.length > 0 && (
          <ul className="reasons">
            {row.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        <input
          className="cue-note"
          placeholder="本版本排练备注…"
          value={row.progress?.note ?? ""}
          onChange={(e) => actions.setCueProgressNote(versionId, cue.id, e.target.value)}
        />
      </div>
      <div className="cue-actions">
        {row.done ? (
          <button className="undo" onClick={() => actions.undoCue(versionId, cue.id)}>
            撤销触发
          </button>
        ) : (
          <button
            className="primary"
            disabled={!row.ready}
            title={row.ready ? "触发该 Cue" : row.reasons.join("；")}
            onClick={() => actions.fireCue(versionId, cue.id)}
          >
            触发
          </button>
        )}
      </div>
    </article>
  );
}

/* ================= 灯具焦点维护 ================= */

function FixturesTab({ conflicts }: { conflicts: Map<number, Fixture[]> }) {
  const { state, actions } = useShow();
  const conflictIds = new Set([...conflicts.values()].flat().map((f) => f.id));
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>灯具层 · 跨版本共享</p>
          <h2>焦点确认与通道号在这里维护</h2>
        </div>
        <button className="primary" onClick={actions.addFixture}>
          ＋ 新增灯具
        </button>
      </div>
      <table className="grid-table">
        <thead>
          <tr>
            <th>灯具编号</th>
            <th>类型</th>
            <th>通道号</th>
            <th>色片</th>
            <th>焦点位置</th>
            <th>焦点确认</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {state.data.fixtures.map((f) => (
            <tr key={f.id} className={conflictIds.has(f.id) ? "row-conflict" : ""}>
              <td>
                <input value={f.code} onChange={(e) => actions.updateFixture(f.id, { code: e.target.value })} />
              </td>
              <td>
                <select
                  value={f.type}
                  onChange={(e) => actions.updateFixture(f.id, { type: e.target.value as FixtureType })}
                >
                  {FIXTURE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={512}
                  className={conflictIds.has(f.id) ? "conflict" : ""}
                  value={f.channel}
                  onChange={(e) => actions.updateFixture(f.id, { channel: Number(e.target.value) || 1 })}
                />
                {conflictIds.has(f.id) && <em className="conflict-tag">撞车</em>}
              </td>
              <td>
                <input value={f.gel} onChange={(e) => actions.updateFixture(f.id, { gel: e.target.value })} />
              </td>
              <td>
                <input value={f.focus} onChange={(e) => actions.updateFixture(f.id, { focus: e.target.value })} />
              </td>
              <td>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={f.focusConfirmed}
                    onChange={() => actions.toggleFocus(f.id)}
                  />
                  {f.focusConfirmed ? "已确认" : "待确认"}
                </label>
              </td>
              <td>
                <button
                  className="danger"
                  onClick={() => window.confirm(`删除 ${f.code}？其 Cue 关联会一并移除`) && actions.removeFixture(f.id)}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/* ================= Cue 依赖维护 ================= */

function CuesTab() {
  const { state, actions } = useShow();
  const { data } = state;
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>Cue 依赖层 · 跨版本共享</p>
          <h2>维护 Cue 顺序、关联灯具与亮度预设</h2>
        </div>
        <button className="primary" onClick={actions.addCue}>
          ＋ 新增 Cue
        </button>
      </div>
      <div className="cue-deps">
        {data.cues.map((cue) => (
          <article key={cue.id} className="cue-dep">
            <div className="cue-dep-head">
              <label>
                <span>Cue 编号</span>
                <input value={cue.cueNo} onChange={(e) => actions.updateCue(cue.id, { cueNo: e.target.value })} />
              </label>
              <label>
                <span>场景名称</span>
                <input value={cue.name} onChange={(e) => actions.updateCue(cue.id, { name: e.target.value })} />
              </label>
              <label>
                <span>资料备注</span>
                <input value={cue.note} onChange={(e) => actions.updateCue(cue.id, { note: e.target.value })} />
              </label>
              <button
                className="danger"
                onClick={() => window.confirm(`删除 Cue ${cue.cueNo}？`) && actions.removeCue(cue.id)}
              >
                删除
              </button>
            </div>
            <div className="dep-grid">
              {data.fixtures.map((f) => {
                const lv = cue.levels.find((l) => l.fixtureId === f.id);
                return (
                  <label key={f.id} className={`dep-item ${lv ? "on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={Boolean(lv)}
                      onChange={(e) => actions.setCueLevel(cue.id, f.id, e.target.checked ? 50 : null)}
                    />
                    <span>
                      {f.code} <i>CH{f.channel}</i>
                    </span>
                    {lv && (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={lv.level}
                        onChange={(e) =>
                          actions.setCueLevel(cue.id, f.id, Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                        }
                      />
                    )}
                    {lv && <em>%</em>}
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default App;
