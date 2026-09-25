import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Cue,
  CueProgress,
  Fixture,
  FixtureType,
  ShowData,
  ShowVersion,
} from "./types";

/* ---------------- 种子数据：演出版本从这里补排练进度 ---------------- */

export const FIXTURE_TYPES: FixtureType[] = ["面光", "侧光", "逆光", "效果光"];

const seedFixtures: Fixture[] = [
  // 面光（观众席方向，灯位图下方）
  { id: "f-foh01", code: "FOH-01", type: "面光", channel: 1, gel: "L205 暖橙", color: "#f59e0b", focus: "左前表演区", x: 22, y: 92, fx: 32, fy: 58, focusConfirmed: true },
  { id: "f-foh02", code: "FOH-02", type: "面光", channel: 2, gel: "L205 暖橙", color: "#fbbf24", focus: "中区主持位", x: 50, y: 95, fx: 50, fy: 46, focusConfirmed: true },
  { id: "f-foh03", code: "FOH-03", type: "面光", channel: 3, gel: "L117 追光白", color: "#fef9c3", focus: "上场门口（待演员走位确认）", x: 78, y: 92, fx: 72, fy: 30, focusConfirmed: false },
  // 侧光
  { id: "f-sl01", code: "SL-01", type: "侧光", channel: 21, gel: "L120 冷蓝", color: "#38bdf8", focus: "左中景区", x: 5, y: 34, fx: 38, fy: 48, focusConfirmed: true },
  { id: "f-sl02", code: "SL-02", type: "侧光", channel: 22, gel: "L120 冷蓝", color: "#60a5fa", focus: "左前景区", x: 5, y: 66, fx: 40, fy: 68, focusConfirmed: true },
  { id: "f-sr01", code: "SR-01", type: "侧光", channel: 23, gel: "L120 冷蓝", color: "#22d3ee", focus: "右中景区", x: 95, y: 34, fx: 62, fy: 44, focusConfirmed: true },
  // 逆光（灯位图上方）—— BK-02 通道号误设成 41，与 BK-01 撞车，排练时需改通道
  { id: "f-bk01", code: "BK-01", type: "逆光", channel: 41, gel: "L161 深蓝", color: "#6366f1", focus: "后区人物剪影", x: 30, y: 6, fx: 35, fy: 40, focusConfirmed: true },
  { id: "f-bk02", code: "BK-02", type: "逆光", channel: 41, gel: "L161 深蓝", color: "#818cf8", focus: "右后区轮廓", x: 70, y: 6, fx: 65, fy: 55, focusConfirmed: true },
  // 效果光
  { id: "f-fx01", code: "FX-01", type: "效果光", channel: 61, gel: "L135 玫红", color: "#e879f9", focus: "舞台中线雾效", x: 50, y: 3, fx: 50, fy: 62, focusConfirmed: true },
  { id: "f-fx02", code: "FX-02", type: "效果光", channel: 62, gel: "L158 金黄", color: "#facc15", focus: "谢幕定点", x: 93, y: 70, fx: 58, fy: 72, focusConfirmed: false },
];

const seedCues: Cue[] = [
  {
    id: "q1", cueNo: "1", name: "观众入场 · 静场蓝",
    levels: [
      { fixtureId: "f-sl01", level: 30 },
      { fixtureId: "f-sl02", level: 25 },
      { fixtureId: "f-bk01", level: 20 },
    ],
    note: "开演前 30 分钟起",
  },
  {
    id: "q12", cueNo: "12", name: "二幕开场 · 冷蓝侧光",
    levels: [
      { fixtureId: "f-sl01", level: 65 },
      { fixtureId: "f-sl02", level: 60 },
      { fixtureId: "f-sr01", level: 55 },
      { fixtureId: "f-bk02", level: 45 },
    ],
    note: "CH021-028，亮度参考 65%",
  },
  {
    id: "q18", cueNo: "18", name: "追光入场",
    levels: [
      { fixtureId: "f-foh03", level: 100 },
      { fixtureId: "f-foh02", level: 35 },
    ],
    note: "FOH-03，焦点门口，需演员走位确认",
  },
  {
    id: "q24", cueNo: "24", name: "暖色谢幕",
    levels: [
      { fixtureId: "f-foh01", level: 80 },
      { fixtureId: "f-foh02", level: 80 },
      { fixtureId: "f-foh03", level: 70 },
      { fixtureId: "f-bk01", level: 60 },
      { fixtureId: "f-fx02", level: 90 },
    ],
    note: "全台面光 80%，版本B 配色",
  },
];

function seedData(): ShowData {
  const legacy: ShowVersion = {
    id: "v-legacy",
    label: "旧版 · 录资料",
    kind: "legacy",
    note: "初版录资料表，保留原进度与批注。",
    progress: {
      q1: { status: "done", firedAt: "19:32", note: "首周连排走过一次，亮度 OK" },
      q12: { status: "waiting", firedAt: null, note: "二幕开场" },
      q18: { status: "waiting", firedAt: null, note: "需演员走位确认" },
      q24: { status: "waiting", firedAt: null, note: "版本B" },
    },
  };
  const rehearsal: ShowVersion = {
    id: "v-perf",
    label: "演出版 · 联排",
    kind: "performance",
    note: "9/25 联排使用：焦点确认 + 按序触发。",
    progress: {},
  };
  return {
    showName: "话剧《雾港之夜》",
    fixtures: seedFixtures,
    cues: seedCues,
    versions: [legacy, rehearsal],
  };
}

/* ---------------- 规则引擎 ---------------- */

export interface CueRow {
  cue: Cue;
  index: number;
  done: boolean;
  ready: boolean; // 无任何阻塞项
  reasons: string[]; // 阻塞原因
  brokenChain: boolean; // 已触发但前序存在未完成（撤销过前序）
  progress: CueProgress | null;
}

export function channelGroups(fixtures: Fixture[]): Map<number, Fixture[]> {
  const groups = new Map<number, Fixture[]>();
  for (const f of fixtures) {
    const list = groups.get(f.channel) ?? [];
    list.push(f);
    groups.set(f.channel, list);
  }
  return groups;
}

export function conflictChannels(fixtures: Fixture[]): Map<number, Fixture[]> {
  const result = new Map<number, Fixture[]>();
  for (const [ch, list] of channelGroups(fixtures)) {
    if (list.length > 1) result.set(ch, list);
  }
  return result;
}

export function getCueRows(data: ShowData, version: ShowVersion): CueRow[] {
  const byId = new Map(data.fixtures.map((f) => [f.id, f]));
  const groups = channelGroups(data.fixtures);
  const rows: CueRow[] = [];
  let chainOk = true;
  let prevDone = false;

  data.cues.forEach((cue, index) => {
    const progress = version.progress[cue.id] ?? null;
    const done = progress?.status === "done";
    const reasons: string[] = [];

    if (!done) {
      const channelSeen = new Set<number>();
      const focusPending: string[] = [];
      for (const lv of cue.levels) {
        const f = byId.get(lv.fixtureId);
        if (!f) continue;
        if (!f.focusConfirmed) focusPending.push(`${f.code}（${f.focus}）`);
        if (!channelSeen.has(f.channel)) {
          const mates = (groups.get(f.channel) ?? []).filter((m) => m.id !== f.id);
          if (mates.length > 0) {
            channelSeen.add(f.channel);
            reasons.push(
              `通道号撞车：CH ${f.channel} → ${f.code} / ${mates.map((m) => m.code).join(" / ")}`,
            );
          }
        }
      }
      if (focusPending.length > 0) reasons.push(`灯具焦点未确认：${focusPending.join("、")}`);
      if (index > 0 && !prevDone) {
        reasons.push(`前一条 Cue ${data.cues[index - 1].cueNo} 未触发完成`);
      }
    }

    rows.push({
      cue,
      index,
      done,
      ready: !done && reasons.length === 0,
      reasons,
      brokenChain: done && !chainOk,
      progress,
    });

    chainOk = chainOk && done;
    prevDone = done;
  });
  return rows;
}

export function lastDoneCue(data: ShowData, version: ShowVersion): Cue | null {
  for (let i = data.cues.length - 1; i >= 0; i--) {
    if (version.progress[data.cues[i].id]?.status === "done") return data.cues[i];
  }
  return null;
}

/* ---------------- Store（localStorage 持久化，切版本保留各自进度） ---------------- */

const STORAGE_KEY = "hxyfront-62002-state-v1";

interface PersistShape {
  data: ShowData;
  currentVersionId: string;
  filter: FixtureType | "全部";
  selectedFixtureId: string | null;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function useShowStore() {
  const [state, setState] = useState<PersistShape>(() => {
    const base: PersistShape = {
      data: seedData(),
      currentVersionId: "v-perf",
      filter: "全部",
      selectedFixtureId: null,
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...base, ...(JSON.parse(raw) as PersistShape) };
    } catch {
      /* ignore */
    }
    return base;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const currentVersion = useMemo(
    () => state.data.versions.find((v) => v.id === state.currentVersionId) ?? state.data.versions[0],
    [state.data.versions, state.currentVersionId],
  );

  const patchData = useCallback((fn: (d: ShowData) => ShowData) => {
    setState((s) => ({ ...s, data: fn(s.data) }));
  }, []);

  const patchVersion = useCallback(
    (versionId: string, fn: (v: ShowVersion) => ShowVersion) => {
      patchData((d) => ({
        ...d,
        versions: d.versions.map((v) => (v.id === versionId ? fn(v) : v)),
      }));
    },
    [patchData],
  );

  const actions = useMemo(
    () => ({
      setFilter: (filter: FixtureType | "全部") => setState((s) => ({ ...s, filter })),
      selectFixture: (id: string | null) => setState((s) => ({ ...s, selectedFixtureId: id })),
      setShowName: (showName: string) => patchData((d) => ({ ...d, showName })),

      toggleFocus: (fixtureId: string) =>
        patchData((d) => ({
          ...d,
          fixtures: d.fixtures.map((f) =>
            f.id === fixtureId ? { ...f, focusConfirmed: !f.focusConfirmed } : f,
          ),
        })),
      updateFixture: (fixtureId: string, patch: Partial<Fixture>) =>
        patchData((d) => ({
          ...d,
          fixtures: d.fixtures.map((f) => (f.id === fixtureId ? { ...f, ...patch } : f)),
        })),
      addFixture: () => {
        const f: Fixture = {
          id: uid("f"),
          code: `NEW-${String(Math.floor(Math.random() * 90) + 10)}`,
          type: "效果光",
          channel: 100,
          gel: "待定",
          color: "#a3e635",
          focus: "待定焦点",
          x: 50,
          y: 50,
          fx: 50,
          fy: 50,
          focusConfirmed: false,
        };
        patchData((d) => ({ ...d, fixtures: [...d.fixtures, f] }));
        setState((s) => ({ ...s, selectedFixtureId: f.id }));
      },
      removeFixture: (fixtureId: string) =>
        patchData((d) => ({
          ...d,
          fixtures: d.fixtures.filter((f) => f.id !== fixtureId),
          cues: d.cues.map((c) => ({
            ...c,
            levels: c.levels.filter((l) => l.fixtureId !== fixtureId),
          })),
        })),

      addCue: () =>
        patchData((d) => ({
          ...d,
          cues: [
            ...d.cues,
            { id: uid("q"), cueNo: String(d.cues.length + 1), name: "新 Cue", levels: [], note: "" },
          ],
        })),
      removeCue: (cueId: string) =>
        patchData((d) => ({ ...d, cues: d.cues.filter((c) => c.id !== cueId) })),
      updateCue: (cueId: string, patch: Partial<Cue>) =>
        patchData((d) => ({
          ...d,
          cues: d.cues.map((c) => (c.id === cueId ? { ...c, ...patch } : c)),
        })),
      setCueLevel: (cueId: string, fixtureId: string, level: number | null) =>
        patchData((d) => ({
          ...d,
          cues: d.cues.map((c) => {
            if (c.id !== cueId) return c;
            const rest = c.levels.filter((l) => l.fixtureId !== fixtureId);
            return level === null ? { ...c, levels: rest } : { ...c, levels: [...rest, { fixtureId, level }] };
          }),
        })),

      switchVersion: (versionId: string) => setState((s) => ({ ...s, currentVersionId: versionId })),
      addVersion: () => {
        const id = uid("v");
        patchData((d) => ({
          ...d,
          versions: [
            ...d.versions,
            { id, label: `演出版 · 排练${d.versions.length}`, kind: "performance" as const, note: "", progress: {} },
          ],
        }));
        setState((s) => ({ ...s, currentVersionId: id }));
      },
      setVersionLabel: (versionId: string, label: string) =>
        patchVersion(versionId, (v) => ({ ...v, label })),
      setVersionNote: (versionId: string, note: string) =>
        patchVersion(versionId, (v) => ({ ...v, note })),

      setCueProgressNote: (versionId: string, cueId: string, note: string) =>
        patchVersion(versionId, (v) => {
          const cur = v.progress[cueId] ?? { status: "waiting" as const, firedAt: null, note: "" };
          return { ...v, progress: { ...v.progress, [cueId]: { ...cur, note } } };
        }),
      fireCue: (versionId: string, cueId: string) =>
        patchVersion(versionId, (v) => {
          const cur = v.progress[cueId] ?? { status: "waiting" as const, firedAt: null, note: "" };
          return {
            ...v,
            progress: { ...v.progress, [cueId]: { ...cur, status: "done", firedAt: nowHM() } },
          };
        }),
      undoCue: (versionId: string, cueId: string) =>
        patchVersion(versionId, (v) => {
          const cur = v.progress[cueId];
          if (!cur) return v;
          return {
            ...v,
            progress: { ...v.progress, [cueId]: { ...cur, status: "waiting", firedAt: null } },
          };
        }),
      resetAll: () => {
        const fresh = seedData();
        setState({ data: fresh, currentVersionId: "v-perf", filter: "全部", selectedFixtureId: null });
      },
    }),
    [patchData, patchVersion],
  );

  return { state, currentVersion, actions };
}

/* Context：保证所有组件共享同一份进度状态 */

type ShowStore = ReturnType<typeof useShowStore>;

const ShowContext = createContext<ShowStore | null>(null);

export function ShowProvider({ children }: { children: ReactNode }) {
  const store = useShowStore();
  return <ShowContext.Provider value={store}>{children}</ShowContext.Provider>;
}

export function useShow(): ShowStore {
  const ctx = useContext(ShowContext);
  if (!ctx) throw new Error("useShow 必须在 ShowProvider 内使用");
  return ctx;
}
