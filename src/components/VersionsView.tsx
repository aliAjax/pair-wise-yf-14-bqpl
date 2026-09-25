import { useMemo, useState } from "react";
import { buildCueViews, versionSummary } from "../logic";
import type { TheaterData } from "../types";
import type { TheaterStore } from "../useTheater";

export default function VersionsView({ store }: { store: TheaterStore }) {
  const { data } = store;
  const [newName, setNewName] = useState("");
  const [copyProgress, setCopyProgress] = useState(true);

  const perVersion = useMemo(
    () =>
      data.versions.map((v) => ({
        version: v,
        views: buildCueViews(data, v),
      })),
    [data],
  );

  return (
    <div className="versions-view">
      <section className="panel">
        <div className="heading">
          <div>
            <p>版本进度各自维护</p>
            <h2>演出版本</h2>
          </div>
          <div className="new-version">
            <input
              value={newName}
              placeholder="新版本名称，如 巡演版 V3"
              onChange={(e) => setNewName(e.target.value)}
            />
            <label className="inline-check">
              <input
                type="checkbox"
                checked={copyProgress}
                onChange={(e) => setCopyProgress(e.target.checked)}
              />
              复制当前版本的进度与备注
            </label>
            <button
              className="primary"
              onClick={() => {
                store.addVersion(newName, copyProgress);
                setNewName("");
              }}
            >
              新建版本
            </button>
          </div>
        </div>

        <p className="form-hint">
          灯具焦点与 Cue 依赖是全局资料；每个版本只保存自己的触发进度和排练备注。
          切回旧版本时，该版本原来的进度和备注原样恢复。
        </p>

        <div className="version-grid">
          {perVersion.map(({ version, views }) => {
            const summary = versionSummary(views);
            return (
              <article
                key={version.id}
                className={`version-card${version.isCurrent ? " version-current" : ""}`}
              >
                <header>
                  <input
                    className="version-name-input"
                    value={version.name}
                    onChange={(e) => store.renameVersion(version.id, e.target.value)}
                  />
                  {version.isCurrent && <span className="tag tag-live">当前版本</span>}
                </header>

                <div className="version-meter">
                  <span className="meter-done" style={{ flexGrow: summary.done }} />
                  <span className="meter-triggered" style={{ flexGrow: summary.triggered }} />
                  <span className="meter-armed" style={{ flexGrow: summary.armed }} />
                  <span className="meter-blocked" style={{ flexGrow: summary.blocked }} />
                </div>
                <small className="muted">
                  完成 {summary.done} · 触发中 {summary.triggered} · 待触发 {summary.armed} ·
                  不可触发 {summary.blocked} / 共 {summary.total} 条
                </small>

                <ul className="version-progress">
                  {views.map((v) => (
                    <li key={v.cue.id}>
                      <span className={`mini-state mini-${v.state}`}>
                        {v.cue.id} · {stateText(v.state)}
                      </span>
                      {v.note && <span className="version-cue-note">{v.note}</span>}
                    </li>
                  ))}
                </ul>

                <label className="version-note-box">
                  <span>版本备注</span>
                  <textarea
                    rows={3}
                    value={version.note}
                    onChange={(e) => store.setVersionNote(version.id, e.target.value)}
                  />
                </label>

                <div className="form-actions">
                  {!version.isCurrent && (
                    <button
                      className="primary"
                      onClick={() => store.switchVersion(version.id)}
                    >
                      切到本版本
                    </button>
                  )}
                  {!version.isCurrent && data.versions.length > 1 && (
                    <button
                      className="ghost danger-text"
                      onClick={() => {
                        if (confirm(`删除版本「${version.name}」？其进度与备注将丢失。`)) {
                          store.deleteVersion(version.id);
                        }
                      }}
                    >
                      删除版本
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function stateText(state: "blocked" | "armed" | "triggered" | "done"): string {
  return { blocked: "不可触发", armed: "待触发", triggered: "已触发", done: "已完成" }[state];
}
