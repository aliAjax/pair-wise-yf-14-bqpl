import { useCallback, useMemo, useState } from "react";
import { buildCueViews, buildFixtureViews, cueById, versionOf } from "./logic";
import { seedData } from "./seed";
import type { Cue, FixtureCategory, TheaterData, Version } from "./types";

const STORAGE_KEY = "hxyfront-62002-theater-v1";

function load(): TheaterData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TheaterData;
      if (parsed.fixtures && parsed.cues && parsed.versions) return parsed;
    }
  } catch {
    // 存储损坏时回落到种子数据
  }
  return seedData();
}

function nextId(prefix: string, used: Set<string>): string {
  let n = 1;
  while (used.has(`${prefix}-${String(n).padStart(2, "0")}`)) n += 1;
  return `${prefix}-${String(n).padStart(2, "0")}`;
}

export function useTheater() {
  const [data, setData] = useState<TheaterData>(load);

  const persist = useCallback((updater: (prev: TheaterData) => TheaterData) => {
    setData((prev) => {
      const next = updater(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const current = useMemo(() => versionOf(data), [data]);

  const cueViews = useMemo(
    () => buildCueViews(data, current),
    [data, current],
  );
  const fixtureViews = useMemo(
    () => buildFixtureViews(data, current),
    [data, current],
  );

  /* ---------------- 灯具焦点（全局，不分版本） ---------------- */

  const toggleFocus = useCallback(
    (fixtureId: string) => {
      persist((prev) => ({
        ...prev,
        fixtures: prev.fixtures.map((f) =>
          f.id === fixtureId ? { ...f, focusConfirmed: !f.focusConfirmed } : f,
        ),
      }));
    },
    [persist],
  );

  const saveFixture = useCallback(
    (fixture: {
      id: string;
      category: FixtureCategory;
      channel: number;
      gel: string;
      color: string;
      focusLabel: string;
      x: number;
      y: number;
    }) => {
      persist((prev) => {
        const exists = prev.fixtures.some((f) => f.id === fixture.id);
        const fixtures = exists
          ? prev.fixtures.map((f) => (f.id === fixture.id ? { ...f, ...fixture } : f))
          : [...prev.fixtures, { ...fixture, focusConfirmed: false }];
        return { ...prev, fixtures };
      });
    },
    [persist],
  );

  const deleteFixture = useCallback(
    (fixtureId: string) => {
      persist((prev) => ({
        ...prev,
        fixtures: prev.fixtures.filter((f) => f.id !== fixtureId),
        cues: prev.cues.map((c) => ({
          ...c,
          fixtureIds: c.fixtureIds.filter((id) => id !== fixtureId),
        })),
      }));
    },
    [persist],
  );

  /* ---------------- Cue 依赖维护 ---------------- */

  const saveCue = useCallback(
    (input: {
      id: string;
      seq: number;
      name: string;
      fixtureIds: string[];
      preset: number;
      note: string;
    }) => {
      persist((prev) => {
        const exists = cueById(prev, input.id);
        if (exists) {
          return {
            ...prev,
            cues: prev.cues.map((c) => (c.id === input.id ? { ...c, ...input } : c)),
          };
        }
        const cue: Cue = { ...input };
        // 新版本里没有该 Cue 的进度条目：buildCueViews 会按初始状态推导
        return { ...prev, cues: [...prev.cues, cue] };
      });
    },
    [persist],
  );

  const deleteCue = useCallback(
    (cueId: string) => {
      persist((prev) => ({
        ...prev,
        cues: prev.cues.filter((c) => c.id !== cueId),
        versions: prev.versions.map((v) => {
          const progress = { ...v.progress };
          delete progress[cueId];
          return { ...v, progress };
        }),
      }));
    },
    [persist],
  );

  /* ---------------- 版本排练进度 ---------------- */

  const patchProgress = useCallback(
    (cueId: string, patch: Partial<{ state: "triggered" | "done"; note: string }>) => {
      persist((prev) => {
        const cur = versionOf(prev);
        return {
          ...prev,
          versions: prev.versions.map((v) =>
            v.id === cur.id
              ? {
                  ...v,
                  progress: {
                    ...v.progress,
                    [cueId]: {
                      note: patch.note ?? v.progress[cueId]?.note ?? "",
                      ...(patch.state
                        ? { state: patch.state }
                        : v.progress[cueId]?.state
                          ? { state: v.progress[cueId]!.state }
                          : {}),
                    },
                  },
                }
              : v,
          ),
        };
      });
    },
    [persist],
  );

  /** 触发：只有实时推导为 armed 的 Cue 才允许 */
  const triggerCue = useCallback(
    (cueId: string) => {
      const view = cueViews.find((v) => v.cue.id === cueId);
      if (!view || view.state !== "armed") return;
      patchProgress(cueId, { state: "triggered" });
    },
    [cueViews, patchProgress],
  );

  const completeCue = useCallback(
    (cueId: string) => patchProgress(cueId, { state: "done" }),
    [patchProgress],
  );

  /** 复位本条 Cue（清状态，保留备注） */
  const resetCue = useCallback(
    (cueId: string) => {
      persist((prev) => {
        const cur = versionOf(prev);
        return {
          ...prev,
          versions: prev.versions.map((v) => {
            if (v.id !== cur.id) return v;
            const entry = v.progress[cueId];
            return {
              ...v,
              progress: {
                ...v.progress,
                [cueId]: { note: entry?.note ?? "" },
              },
            };
          }),
        };
      });
    },
    [persist],
  );

  /** 复位当前版本全部进度（保留每条备注） */
  const resetVersionProgress = useCallback(() => {
    persist((prev) => {
      const cur = versionOf(prev);
      return {
        ...prev,
        versions: prev.versions.map((v) =>
          v.id === cur.id
            ? {
                ...v,
                progress: Object.fromEntries(
                  Object.entries(v.progress).map(([id, p]) => [id, { note: p.note }]),
                ),
              }
            : v,
        ),
      };
    });
  }, [persist]);

  /* ---------------- 版本管理 ---------------- */

  const switchVersion = useCallback(
    (versionId: string) => {
      persist((prev) => ({
        ...prev,
        versions: prev.versions.map((v) => ({
          ...v,
          isCurrent: v.id === versionId,
        })),
      }));
    },
    [persist],
  );

  const addVersion = useCallback(
    (name: string, copyProgress: boolean) => {
      persist((prev) => {
        const cur = versionOf(prev);
        const used = new Set(prev.versions.map((v) => v.id));
        const id = nextId("v", used);
        const version: Version = {
          id,
          name: name.trim() || `演出版本 ${prev.versions.length + 1}`,
          isCurrent: true,
          note: copyProgress
            ? `从「${cur.name}」复制：进度与备注已带过来，可自由调整。`
            : "新版本：灯具焦点与 Cue 资料沿用全局，排练进度从零开始。",
          progress: copyProgress
            ? JSON.parse(JSON.stringify(cur.progress))
            : {},
        };
        return {
          ...prev,
          versions: [...prev.versions.map((v) => ({ ...v, isCurrent: false })), version],
        };
      });
    },
    [persist],
  );

  const renameVersion = useCallback(
    (versionId: string, name: string) => {
      persist((prev) => ({
        ...prev,
        versions: prev.versions.map((v) =>
          v.id === versionId ? { ...v, name } : v,
        ),
      }));
    },
    [persist],
  );

  const setVersionNote = useCallback(
    (versionId: string, note: string) => {
      persist((prev) => ({
        ...prev,
        versions: prev.versions.map((v) =>
          v.id === versionId ? { ...v, note } : v,
        ),
      }));
    },
    [persist],
  );

  const deleteVersion = useCallback(
    (versionId: string) => {
      persist((prev) => {
        if (prev.versions.length <= 1) return prev;
        const removing = prev.versions.find((v) => v.id === versionId);
        const versions = prev.versions.filter((v) => v.id !== versionId);
        if (removing?.isCurrent) versions[0] = { ...versions[0], isCurrent: true };
        return { ...prev, versions };
      });
    },
    [persist],
  );

  const resetAllData = useCallback(() => {
    const fresh = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setData(fresh);
  }, []);

  return {
    data,
    current,
    cueViews,
    fixtureViews,
    toggleFocus,
    saveFixture,
    deleteFixture,
    saveCue,
    deleteCue,
    patchProgress,
    triggerCue,
    completeCue,
    resetCue,
    resetVersionProgress,
    switchVersion,
    addVersion,
    renameVersion,
    setVersionNote,
    deleteVersion,
    resetAllData,
  };
}

export type TheaterStore = ReturnType<typeof useTheater>;
