import { blockReasons, formatChannels } from "../logic";
import type { CueView } from "../types";

interface Props {
  view: CueView;
  onTrigger: (id: string) => void;
  onComplete: (id: string) => void;
  onReset: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}

export default function CueCard({
  view,
  onTrigger,
  onComplete,
  onReset,
  onNoteChange,
}: Props) {
  const { cue, state } = view;
  const reasons = state === "blocked" ? blockReasons(view) : [];

  return (
    <article className={`cue-card cue-${state}`}>
      <header className="cue-head">
        <div className="cue-title">
          <b>{cue.id}</b>
          <span className="cue-seq">顺序 {cue.seq}</span>
          <span className={`state-pill state-${state}`}>{stateLabel(state)}</span>
        </div>
        <div className="cue-name">{cue.name}</div>
      </header>

      <div className="cue-members">
        {view.members.map((m) => (
          <span
            key={m.fixture.id}
            className={`member${m.confirmed ? " member-ok" : " member-wait"}`}
            title={`CH ${String(m.fixture.channel).padStart(3, "0")} · ${m.fixture.focusLabel}`}
          >
            {m.fixture.id}
            <i>{m.confirmed ? "✓焦点" : "待焦点"}</i>
          </span>
        ))}
        {view.missingFixtureIds.map((id) => (
          <span key={id} className="member member-missing" title="灯具已被删除或编号失效">
            {id} <i>缺失</i>
          </span>
        ))}
      </div>

      <dl className="cue-meta">
        <div>
          <dt>通道</dt>
          <dd>{formatChannels(view.channels) || "—"}</dd>
        </div>
        <div>
          <dt>亮度预设</dt>
          <dd>{cue.preset}%</dd>
        </div>
        <div className="span-2">
          <dt>资料备注</dt>
          <dd className="muted">{cue.note || "—"}</dd>
        </div>
      </dl>

      {view.overlaps.length > 0 && (
        <div className="overlap-warn">
          <b>⚠ 通道撞车：</b>
          {view.overlaps.map((o) => (
            <span key={o.cue.id}>
              与 {o.cue.id} 共用 {formatChannels(o.channels)}
              {o.cue.id !== view.overlaps[view.overlaps.length - 1].cue.id ? "；" : ""}
            </span>
          ))}
          ，触发时若对方仍占用将被拦下。
        </div>
      )}

      {state === "blocked" && (
        <ul className="block-reasons">
          {reasons.map((r) => (
            <li key={r}>⛔ {r}</li>
          ))}
        </ul>
      )}

      {state === "armed" && <p className="armed-hint">▶ 焦点齐备、前序已完成、通道空闲，可以触发。</p>}
      {state === "triggered" && (
        <p className="triggered-hint">
          ● 已触发，通道占用中 —— 完成本 Cue 后，后一条才允许触发。
        </p>
      )}

      <div className="cue-actions">
        <button
          className="primary"
          disabled={state !== "armed"}
          onClick={() => onTrigger(cue.id)}
        >
          触发 Cue
        </button>
        <button
          disabled={state !== "triggered"}
          onClick={() => onComplete(cue.id)}
        >
          标记完成
        </button>
        <button
          className="ghost"
          disabled={state !== "triggered" && state !== "done"}
          onClick={() => onReset(cue.id)}
        >
          复位
        </button>
      </div>

      <label className="cue-note">
        <span>本版本排练备注</span>
        <textarea
          rows={2}
          value={view.note}
          placeholder="记录这条 Cue 在当前版本排练时的问题…"
          onChange={(e) => onNoteChange(cue.id, e.target.value)}
        />
      </label>
    </article>
  );
}

function stateLabel(state: CueView["state"]): string {
  return { blocked: "不可触发", armed: "待触发", triggered: "已触发", done: "已完成" }[state];
}
