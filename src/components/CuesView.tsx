import { useState } from "react";
import { formatChannels } from "../logic";
import type { TheaterStore } from "../useTheater";

interface Draft {
  id: string;
  seq: number;
  name: string;
  fixtureIds: string[];
  preset: number;
  note: string;
}

const EMPTY: Draft = { id: "", seq: 1, name: "", fixtureIds: [], preset: 50, note: "" };

export default function CuesView({ store }: { store: TheaterStore }) {
  const { data, cueViews } = store;
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleFixture = (id: string) => {
    setDraft((d) => ({
      ...d,
      fixtureIds: d.fixtureIds.includes(id)
        ? d.fixtureIds.filter((x) => x !== id)
        : [...d.fixtureIds, id],
    }));
  };

  const startEdit = (cueId: string) => {
    const cue = data.cues.find((c) => c.id === cueId);
    if (!cue) return;
    setEditingId(cue.id);
    setDraft({
      id: cue.id,
      seq: cue.seq,
      name: cue.name,
      fixtureIds: [...cue.fixtureIds],
      preset: cue.preset,
      note: cue.note,
    });
  };

  const submit = () => {
    if (!draft.id.trim() || !draft.name.trim()) return;
    store.saveCue({ ...draft, id: draft.id.trim() });
    setDraft(EMPTY);
    setEditingId(null);
  };

  return (
    <div className="cues-admin">
      <section className="panel">
        <div className="heading">
          <div>
            <p>Cue 依赖（全局资料，版本共用）</p>
            <h2>Cue 触发顺序与关联灯具</h2>
          </div>
        </div>
        <div className="cue-cards cue-cards-static">
          {cueViews.map((view) => (
            <article key={view.cue.id} className="cue-static">
              <header>
                <b>{view.cue.id}</b>
                <span className="cue-seq">顺序 {view.cue.seq}</span>
                <span className="muted">{view.cue.name}</span>
                <span className="tag">亮度 {view.cue.preset}%</span>
                {view.overlaps.length > 0 && (
                  <span className="tag tag-danger">
                    撞车 {view.overlaps.map((o) => o.cue.id).join("、")}
                  </span>
                )}
              </header>
              <p className="cue-static-members">
                {view.members.map((m) => (
                  <span key={m.fixture.id} className={m.confirmed ? "" : "unconfirmed-name"}>
                    {m.fixture.id}
                    {!m.confirmed && " *"}
                  </span>
                )).reduce<React.ReactNode[]>((acc, el, i) => {
                  if (i > 0) acc.push(<span key={`sep-${i}`} className="sep">、</span>);
                  acc.push(el);
                  return acc;
                }, [])}
                {view.missingFixtureIds.length > 0 && (
                  <span className="missing-name">（缺失：{view.missingFixtureIds.join("、")}）</span>
                )}
              </p>
              <p className="muted cue-static-ch">
                {formatChannels(view.channels) || "无有效通道"}
                {view.unconfirmed.length > 0 && (
                  <span className="unconfirmed-hint">
                    {" "}— 带 * 的灯具焦点未确认，关联 Cue 在任何版本都不能触发
                  </span>
                )}
              </p>
              <div className="row-actions">
                <button className="ghost" onClick={() => startEdit(view.cue.id)}>
                  编辑
                </button>
                <button
                  className="ghost danger-text"
                  onClick={() => {
                    if (confirm(`删除 ${view.cue.id}？各版本中该条的进度与备注也会移除。`)) {
                      store.deleteCue(view.cue.id);
                      if (editingId === view.cue.id) {
                        setEditingId(null);
                        setDraft(EMPTY);
                      }
                    }
                  }}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel side-form">
        <div className="heading">
          <div>
            <p>{editingId ? `编辑 ${editingId}` : "新增 Cue"}</p>
            <h2>Cue 资料</h2>
          </div>
        </div>
        <div className="form-stack">
          <div className="form-row">
            <label>
              <span>Cue 编号</span>
              <input
                value={draft.id}
                disabled={Boolean(editingId)}
                placeholder="如 Cue 32"
                onChange={(e) => setDraft({ ...draft, id: e.target.value })}
              />
            </label>
            <label>
              <span>触发顺序号</span>
              <input
                type="number"
                value={draft.seq}
                onChange={(e) => setDraft({ ...draft, seq: Number(e.target.value) })}
              />
            </label>
          </div>
          <label>
            <span>Cue 名称</span>
            <input
              value={draft.name}
              placeholder="如 暖色谢幕"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            <span>亮度预设（%）</span>
            <input
              type="number"
              min={0}
              max={100}
              value={draft.preset}
              onChange={(e) => setDraft({ ...draft, preset: Number(e.target.value) })}
            />
          </label>
          <div className="fixture-picker">
            <span>关联灯具（焦点全部确认后 Cue 才进入待触发）</span>
            <div className="picker-list">
              {data.fixtures.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={draft.fixtureIds.includes(f.id) ? "picked" : ""}
                  onClick={() => toggleFixture(f.id)}
                  title={`${f.category} · CH ${String(f.channel).padStart(3, "0")} · ${f.focusLabel}`}
                >
                  {f.id}
                  {!f.focusConfirmed && <i>*</i>}
                </button>
              ))}
            </div>
          </div>
          <label>
            <span>资料备注（跨版本共享）</span>
            <textarea
              rows={2}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button className="primary" onClick={submit}>
              {editingId ? "保存修改" : "新增 Cue"}
            </button>
            {editingId && (
              <button
                className="ghost"
                onClick={() => {
                  setEditingId(null);
                  setDraft(EMPTY);
                }}
              >
                取消编辑
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
