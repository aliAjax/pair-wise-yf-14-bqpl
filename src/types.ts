// 数据分三层维护：
// 1. fixtures —— 灯具层：焦点确认、通道号等，跨版本共享
// 2. cues     —— Cue 依赖层：顺序、关联灯具、亮度预设，跨版本共享
// 3. versions —— 版本进度层：每一条 Cue 的触发状态 + 备注，按演出版本独立保存

export type FixtureType = "面光" | "侧光" | "逆光" | "效果光";

export interface Fixture {
  id: string;
  code: string; // 灯具编号，如 FOH-01
  type: FixtureType;
  channel: number; // DMX 通道号 1-512
  gel: string; // 色片编号/名称
  color: string; // 预览用色值
  /** 焦点位置描述（文字） */
  focus: string;
  x: number; // 灯具在灯位图上的坐标，百分比 0-100
  y: number;
  fx: number; // 焦点坐标
  fy: number;
  /** 焦点是否已确认。确认后关联 Cue 才可能进入待触发 */
  focusConfirmed: boolean;
}

export interface CueFixtureLevel {
  fixtureId: string;
  level: number; // 亮度预设 0-100
}

export interface Cue {
  id: string;
  cueNo: string; // Cue 编号，如 "12"
  name: string; // 场景名称
  levels: CueFixtureLevel[];
  note: string; // 录资料时的技术备注
}

export type CueStatus = "waiting" | "ready" | "done";

/** 单个版本内某条 Cue 的排练进度 */
export interface CueProgress {
  status: CueStatus;
  firedAt: string | null; // 触发时刻 HH:MM
  note: string; // 该版本下的排练备注
}

export interface ShowVersion {
  id: string;
  label: string; // 版本名，如「旧版 · 录资料」
  kind: "legacy" | "performance";
  note: string; // 版本整体备注
  progress: Record<string, CueProgress>; // cueId -> 进度
}

export interface ShowData {
  showName: string;
  fixtures: Fixture[];
  cues: Cue[];
  versions: ShowVersion[];
}
