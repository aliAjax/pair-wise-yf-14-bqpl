import { useState } from "react";
import type { CueView, FixtureView } from "../types";

interface Props {
  fixtureViews: FixtureView[];
  cueViews: CueView[];
  activeCategories: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleFocus: (id: string) => void;
}

const ZONES = [
  { label: "面光桥", top: "2%", height: "18%", left: "2%", right: "2%" },
  { label: "侧光灯架", top: "26%", height: "52%", left: "1%", right: "auto", width: "13%" },
  { label: "侧光灯架", top: "26%", height: "52%", left: "auto", right: "1%", width: "13%" },
  { label: "表 演 区", top: "30%", height: "44%", left: "16%", right: "16%", center: true },
  { label: "后区 / 天幕灯杆", top: "80%", height: "17%", left: "2%", right: "2%" },
];

export default function StageMap({
  fixtureViews,
  cueViews,
  activeCategories,
  selectedId,
  onSelect,
  onToggleFocus,
}: Props) {
  const selected = fixtureViews.find((v) => v.fixture.id === selectedId) ?? null;
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const cueStateOf = (cueId: string) =>
    cueViews.find((v) => v.cue.id === cueId);

  return (
    <div className="stage-wrap">
      <div className="stage">
        {ZONES.map((z, i) => (
          <div
            key={`${z.label}-${i}`}
            className={`zone${z.center ? " zone-center" : ""}`}
            style={{
              top: z.top,
              height: z.height,
              left: z.left,
              right: z.right,
              width: z.width,
            }}
          >
            <span>{z.label}</span>
          </div>
        ))}

        {fixtureViews.map(({ fixture, duplicateChannel, activeCueIds, doneCueIds }) => {
          const dimmed = !activeCategories.has(fixture.category);
          const active = activeCueIds.length > 0;
          const selectedCls = fixture.id === selectedId ? " dot-selected" : "";
          const stateCls = active
            ? " dot-active"
            : fixture.focusConfirmed
              ? " dot-confirmed"
              : " dot-unconfirmed";
          return (
            <button
              key={fixture.id}
              className={`dot${stateCls}${selectedCls}${dimmed ? " dot-dim" : ""}`}
              style={
                {
                  left: `${fixture.x}%`,
                  top: `${fixture.y}%`,
                  "--beam": fixture.color,
                } as React.CSSProperties
              }
              onClick={() => {
                onSelect(fixture.id);
                setConfirmId(null);
              }}
              title={`${fixture.id} · ${fixture.category} · CH ${String(fixture.channel).padStart(3, "0")} · ${fixture.focusLabel}`}
            >
              <span className="dot-head">
                {fixture.id}
                {duplicateChannel && <i className="badge badge-ch" title="通道号撞车">!</i>}
                {fixture.focusConfirmed && !active && (
                  <i className="badge badge-ok" title="焦点已确认">✓</i>
                )}
                {active && <i className="badge badge-live" title="Cue 已触发">●</i>}
                {doneCueIds.length > 0 && !active && (
                  <i className="badge badge-done" title={`走过：${doneCueIds.join("、")}`}>✓</i>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="legend">
        <span><i className="lg lg-unconfirmed" /> 焦点未确认</span>
        <span><i className="lg lg-confirmed" /> 焦点已确认</span>
        <span><i className="lg lg-active" /> Cue 已触发（点亮）</span>
        <span><i className="lg lg-ch" /> 通道号撞车</span>
        <span className="legend-hint">点击灯具查看并确认焦点</span>
      </div>

      {selected && (
        <div className="fixture-detail">
          <div className="fixture-detail-head">
            <div>
              <b>{selected.fixture.id}</b>
              <span className="tag">{selected.fixture.category}</span>
              {selected.duplicateChannel && (
                <span className="tag tag-danger">通道号撞车 CH {selected.fixture.channel}</span>
              )}
            </div>
            <button className="ghost" onClick={() => onSelect("")}>
              关闭
            </button>
          </div>
          <div className="fixture-detail-grid">
            <div>
              <small>通道</small>
              <p>CH {String(selected.fixture.channel).padStart(3, "0")}</p>
            </div>
            <div>
              <small>色片</small>
              <p>
                {selected.fixture.gel}
                <i
                  className="swatch"
                  style={{ background: selected.fixture.color }}
                />
              </p>
            </div>
            <div className="span-2">
              <small>焦点位置</small>
              <p>{selected.fixture.focusLabel}</p>
            </div>
            <div className="span-2">
              <small>关联 Cue 状态</small>
              {(() => {
                const related = cueViews.filter((v) =>
                  v.cue.fixtureIds.includes(selected.fixture.id),
                );
                if (related.length === 0) return <p className="muted">暂未被任何 Cue 引用</p>;
                return (
                  <div className="related-cues">
                    {related.map((v) => (
                      <span key={v.cue.id} className={`mini-state mini-${v.state}`}>
                        {v.cue.id} · {v.cue.name} · {stateText(v.state)}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="fixture-detail-actions">
            <button
              className={selected.fixture.focusConfirmed ? "warn" : "primary"}
              onClick={() => {
                onToggleFocus(selected.fixture.id);
                setConfirmId(selected.fixture.id);
              }}
            >
              {selected.fixture.focusConfirmed ? "撤销焦点确认" : "确认焦点"}
            </button>
            {confirmId === selected.fixture.id && (
              <span className="confirm-flash">
                {selected.fixture.focusConfirmed
                  ? "焦点已确认 —— 关联 Cue 已重新评估可否触发"
                  : "焦点已撤销 —— 关联 Cue 回到不可触发"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function stateText(state: CueView["state"]): string {
  return { blocked: "不可触发", armed: "待触发", triggered: "已触发", done: "已完成" }[state];
}
