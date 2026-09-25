import type { TheaterData } from "./types";

/**
 * 初始资料。灯具焦点（focusConfirmed）全局维护；
 * Cue 依赖（顺序/关联灯具/预设）与版本进度分开保存。
 */
export function seedData(): TheaterData {
  return {
    fixtures: [
      // 面光（观众厅顶部，灯位图上部）
      { id: "FOH-01", category: "面光", channel: 1, gel: "L101", color: "#ffe9b8", focusLabel: "表演区中央", x: 34, y: 10, focusConfirmed: true },
      { id: "FOH-02", category: "面光", channel: 2, gel: "L101", color: "#ffe9b8", focusLabel: "表演区左", x: 50, y: 9, focusConfirmed: true },
      { id: "FOH-03", category: "面光", channel: 3, gel: "L102", color: "#fff4d6", focusLabel: "上场门口（追光位）", x: 66, y: 10, focusConfirmed: true },
      { id: "FOH-04", category: "面光", channel: 4, gel: "L104", color: "#ffd9a0", focusLabel: "表演区右", x: 82, y: 12, focusConfirmed: false },
      // 侧光（两侧灯架）
      { id: "SL-L1", category: "侧光", channel: 21, gel: "L201", color: "#8fd3ff", focusLabel: "左侧表演区", x: 7, y: 40, focusConfirmed: false },
      { id: "SL-L2", category: "侧光", channel: 22, gel: "L201", color: "#8fd3ff", focusLabel: "左侧二道幕", x: 7, y: 58, focusConfirmed: false },
      { id: "SL-R1", category: "侧光", channel: 23, gel: "L202", color: "#c9b7ff", focusLabel: "右侧表演区", x: 93, y: 40, focusConfirmed: true },
      { id: "SL-R2", category: "侧光", channel: 24, gel: "L201", color: "#8fd3ff", focusLabel: "右侧二道幕", x: 93, y: 58, focusConfirmed: true },
      // 逆光（舞台后部地排/灯杆，灯位图下部）
      { id: "BK-01", category: "逆光", channel: 41, gel: "L301", color: "#ffd29e", focusLabel: "后区暖光", x: 24, y: 88, focusConfirmed: true },
      { id: "BK-02", category: "逆光", channel: 42, gel: "L301", color: "#ffd29e", focusLabel: "后区暖光", x: 40, y: 90, focusConfirmed: true },
      { id: "BK-03", category: "逆光", channel: 43, gel: "L101", color: "#ffe9b8", focusLabel: "谢幕正面铺光", x: 60, y: 90, focusConfirmed: true },
      { id: "BK-04", category: "逆光", channel: 44, gel: "L302", color: "#bfe8ff", focusLabel: "天幕冷色铺底", x: 76, y: 88, focusConfirmed: true },
      // 效果光
      { id: "FX-01", category: "效果光", channel: 61, gel: "L401", color: "#6fe7c8", focusLabel: "舞台中央特效", x: 50, y: 50, focusConfirmed: false },
      { id: "FX-02", category: "效果光", channel: 62, gel: "L402", color: "#ff9db0", focusLabel: "天幕图案", x: 50, y: 74, focusConfirmed: true },
      // 通道号撞车示例：与 BK-03 同为 CH 43
      { id: "BK-05", category: "逆光", channel: 43, gel: "L302", color: "#bfe8ff", focusLabel: "侧后区冷色（待改通道）", x: 12, y: 86, focusConfirmed: false },
    ],
    cues: [
      {
        id: "Cue 10",
        seq: 10,
        name: "二幕开场冷蓝侧光",
        fixtureIds: ["SL-L1", "SL-L2", "SL-R2"],
        preset: 65,
        note: "冷蓝侧光，二幕开场氛围",
      },
      {
        id: "Cue 18",
        seq: 18,
        name: "追光入场",
        fixtureIds: ["FOH-03"],
        preset: 95,
        note: "需演员走位确认，焦点门口",
      },
      {
        id: "Cue 24",
        seq: 24,
        name: "暖色谢幕",
        fixtureIds: ["FOH-01", "FOH-02", "FOH-04", "BK-01", "BK-02", "BK-03"],
        preset: 80,
        note: "全台面光 + 后区暖光",
      },
      {
        id: "Cue 30",
        seq: 30,
        name: "天幕冷色转换",
        fixtureIds: ["BK-04", "BK-05", "FX-02"],
        preset: 55,
        note: "与 Cue 24 共用 CH 43，需错峰触发",
      },
    ],
    versions: [
      {
        id: "v1",
        name: "首演版 V1（旧版）",
        isCurrent: false,
        note: "旧版本资料：Cue 24 的暖光在台右偏暗，复排时重点确认 FOH-04。切回本版时进度与备注沿用上一次排练。",
        progress: {
          "Cue 10": { state: "done", note: "冷蓝到位，SL-L2 略压一档" },
          "Cue 18": { state: "done", note: "走位已确认" },
          "Cue 24": { note: "FOH-04 待复排，先别触发" },
          "Cue 30": { note: "" },
        },
      },
      {
        id: "v2",
        name: "排练版 V2（当前）",
        isCurrent: true,
        note: "本版新增 Cue 30 天幕转换；Cue 10 侧光焦点昨天刚调，已点掉。BK-05 通道与 BK-03 撞 CH 43，待改。",
        progress: {
          "Cue 10": { state: "triggered", note: "亮度 65% 保持，等导演过一遍" },
          "Cue 18": { note: "" },
          "Cue 24": { note: "" },
          "Cue 30": { note: "" },
        },
      },
    ],
  };
}
