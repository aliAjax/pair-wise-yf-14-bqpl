import { useMemo, useState } from "react";
import type { Fixture, FixtureCategory } from "../types";
import { CATEGORIES } from "../types";
import type { TheaterStore } from "../useTheater";

const EMPTY: Omit<Fixture, "focusConfirmed"> = {
  id: "",
  category: "面光",
  channel: 1,
  gel: "",
  color: "#ffe9b8",
  focusLabel: "",
  x: 50,
  y: 50,
};

export default function FixturesView({ store }: { store: TheaterStore }) {
  const { data, fixtureViews } = store;
  const [filter, setFilter] = useState<"全部" | FixtureCategory>("全部");
  const [draft, setDraft] = useState<Omit<Fixture, "focusConfirmed">>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const channelOwners = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const f of data.fixtures) {
      map.set(f.channel, [...(map.get(f.channel) ?? []), f.id]);
    }
    return map;
  }, [data.fixtures]);

  const rows = fixtureViews.filter(
    (v) => filter === "全部" || v.fixture.category === filter,
  );

  const startEdit = (f: Fixture) => {
    setEditingId(f.id);
    const { focusConfirmed: _ignored, ...rest } = f;
    setDraft(rest);
  };

  const submit = () => {
    if (!draft.id.trim() || !draft.gel.trim() || !draft.focusLabel.trim()) return;
    store.saveFixture({ ...draft, id: draft.id.trim() });
    setDraft(EMPTY);
    setEditingId(null);
  };

  return (
    <div className="two-col">
      <section className="panel">
        <div className="heading">
          <div>
            <p>灯具焦点（全局维护，不分版本）</p>
            <h2>灯具资料表</h2>
          </div>
        </div>
        <div className="chips filter-chips">
          <button
            className={filter === "全部" ? "chip-on" : ""}
            onClick={() => setFilter("全部")}
          >
            全部
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={filter === cat ? "chip-on" : ""}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>灯具编号</th>
                <th>类型</th>
                <th>通道号</th>
                <th>色片</th>
                <th>焦点位置</th>
                <th>焦点状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ fixture, duplicateChannel }) => (
                <tr key={fixture.id} className={fixture.focusConfirmed ? "" : "row-warn"}>
                  <td>
                    <b>{fixture.id}</b>
                    <i
                      className="swatch swatch-cell"
                      style={{ background: fixture.color }}
                    />
                  </td>
                  <td>{fixture.category}</td>
                  <td>
                    CH {String(fixture.channel).padStart(3, "0")}
                    {duplicateChannel && (
                      <span className="tag tag-danger">
                        撞 {channelOwners.get(fixture.channel)?.filter((x) => x !== fixture.id).join("、")}
                      </span>
                    )}
                  </td>
                  <td>{fixture.gel}</td>
                  <td>{fixture.focusLabel}</td>
                  <td>
                    <button
                      className={`focus-toggle ${fixture.focusConfirmed ? "is-on" : ""}`}
                      onClick={() => store.toggleFocus(fixture.id)}
                    >
                      {fixture.focusConfirmed ? "✓ 已确认" : "待确认"}
                    </button>
                  </td>
                  <td className="row-actions">
                    <button className="ghost" onClick={() => startEdit(fixture)}>
                      编辑
                    </button>
                    <button
                      className="ghost danger-text"
                      onClick={() => {
                        if (confirm(`删除灯具 ${fixture.id}？引用它的 Cue 会同步摘除该灯。`)) {
                          store.deleteFixture(fixture.id);
                          if (editingId === fixture.id) {
                            setEditingId(null);
                            setDraft(EMPTY);
                          }
                        }
                      }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel side-form">
        <div className="heading">
          <div>
            <p>{editingId ? `编辑 ${editingId}` : "新增灯具"}</p>
            <h2>灯具资料</h2>
          </div>
        </div>
        <div className="form-stack">
          <label>
            <span>灯具编号</span>
            <input
              value={draft.id}
              disabled={Boolean(editingId)}
              placeholder="如 FOH-05"
              onChange={(e) => setDraft({ ...draft, id: e.target.value })}
            />
          </label>
          <label>
            <span>类型</span>
            <select
              value={draft.category}
              onChange={(e) =>
                setDraft({ ...draft, category: e.target.value as FixtureCategory })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              <span>通道号</span>
              <input
                type="number"
                min={1}
                max={512}
                value={draft.channel}
                onChange={(e) => setDraft({ ...draft, channel: Number(e.target.value) })}
              />
            </label>
            <label>
              <span>色片</span>
              <input
                value={draft.gel}
                placeholder="如 L201"
                onChange={(e) => setDraft({ ...draft, gel: e.target.value })}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              <span>光束颜色</span>
              <input
                type="color"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              />
            </label>
            <label>
              <span>焦点位置</span>
              <input
                value={draft.focusLabel}
                placeholder="如 表演区中央"
                onChange={(e) => setDraft({ ...draft, focusLabel: e.target.value })}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              <span>灯位图 X%</span>
              <input
                type="number"
                min={0}
                max={100}
                value={draft.x}
                onChange={(e) => setDraft({ ...draft, x: Number(e.target.value) })}
              />
            </label>
            <label>
              <span>灯位图 Y%</span>
              <input
                type="number"
                min={0}
                max={100}
                value={draft.y}
                onChange={(e) => setDraft({ ...draft, y: Number(e.target.value) })}
              />
            </label>
          </div>
          <p className="form-hint">
            灯具焦点是全局资料：在这里确认焦点后，所有演出版本里关联的 Cue 都会重新评估能否触发。
          </p>
          <div className="form-actions">
            <button className="primary" onClick={submit}>
              {editingId ? "保存修改" : "新增灯具"}
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
