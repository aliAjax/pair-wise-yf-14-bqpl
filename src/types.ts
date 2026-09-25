export const CATEGORIES = ["面光", "侧光", "逆光", "效果光"] as const;
export type FixtureCategory = (typeof CATEGORIES)[number];

/** 灯具：焦点确认状态全局唯一，与演出版本无关 */
export interface Fixture {
  id: string; // 灯具编号，如 FOH-03
  category: FixtureCategory;
  channel: number; // DMX 通道号
  gel: string; // 色片编号，如 L201
  color: string; // 灯位图上的光束颜色
  focusLabel: string; // 焦点位置描述
  x: number; // 灯位图坐标（百分比）
  y: number;
  focusConfirmed: boolean; // 焦点是否已确认
}

/** Cue 静态依赖：触发顺序、关联灯具、亮度预设 */
export interface Cue {
  id: string; // Cue 编号，如 Cue 18
  seq: number; // 触发顺序号
  name: string; // Cue 名称
  fixtureIds: string[]; // 关联灯具
  preset: number; // 亮度预设 %
  note: string; // 资料备注（跨版本共享）
}

/**
 * 单条 Cue 在某个版本里的排练进度。
 * 不存 blocked/armed：这两种状态由焦点、前序完成情况、通道占用实时推导。
 */
export interface CueProgress {
  state?: "triggered" | "done";
  note: string; // 该版本下的排练备注
}

/** 演出版本：进度与备注按版本各自保存 */
export interface Version {
  id: string;
  name: string;
  isCurrent: boolean;
  note: string;
  progress: Record<string, CueProgress>;
}

export interface TheaterData {
  fixtures: Fixture[];
  cues: Cue[];
  versions: Version[];
}

/** 推导出的 Cue 实时状态 */
export type CueState = "blocked" | "armed" | "triggered" | "done";

export interface CueMember {
  fixture: Fixture;
  confirmed: boolean;
}

export interface RuntimeOccupier {
  channel: number;
  cue: Cue;
}

export interface StaticOverlap {
  cue: Cue;
  channels: number[];
}

export interface CueView {
  cue: Cue;
  channels: number[];
  members: CueMember[];
  missingFixtureIds: string[];
  unconfirmed: Fixture[];
  prev: Cue | null;
  prevDone: boolean;
  runtimeOccupiers: RuntimeOccupier[];
  overlaps: StaticOverlap[];
  state: CueState;
  note: string;
}

export interface FixtureView {
  fixture: Fixture;
  duplicateChannel: boolean;
  activeCueIds: string[];
  doneCueIds: string[];
}
