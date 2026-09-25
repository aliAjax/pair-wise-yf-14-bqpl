import type {
  Cue,
  CueView,
  Fixture,
  FixtureView,
  TheaterData,
  Version,
} from "./types";

/** Cue 按触发顺序号排序 */
export function sortedCues(cues: Cue[]): Cue[] {
  return [...cues].sort((a, b) => a.seq - b.seq);
}

export function cueById(data: TheaterData, id: string): Cue | undefined {
  return data.cues.find((c) => c.id === id);
}

export function versionOf(data: TheaterData): Version {
  return data.versions.find((v) => v.isCurrent) ?? data.versions[0];
}

/** Cue 实际占用的通道（取其关联灯具的通道，去重升序） */
export function cueChannels(cue: Cue, fixtures: Fixture[]): number[] {
  const map = new Map<number, true>();
  for (const id of cue.fixtureIds) {
    const fx = fixtures.find((f) => f.id === id);
    if (fx) map.set(fx.channel, true);
  }
  return [...map.keys()].sort((a, b) => a - b);
}

export function formatChannels(channels: number[]): string {
  return channels.map((c) => `CH ${String(c).padStart(3, "0")}`).join("、");
}

export const STATE_LABEL = {
  blocked: "不可触发",
  armed: "待触发",
  triggered: "已触发",
  done: "已完成",
} as const;

/**
 * 推导某个版本下全部 Cue 的实时排练状态。
 *
 * 规则：
 * - done/triggered：版本进度里已记录的状态；
 * - blocked → armed：关联灯具焦点全部确认、且没有缺失灯具；
 * - blocked（前序未完成）：触发顺序中紧邻的上一条 Cue 尚未完成；
 * - blocked（通道占用）：本条通道正被其他已触发未完成的 Cue 占用；
 * - 静态通道撞车（两条 Cue 的预设通道交集）始终给出警示，不受顺序限制。
 */
export function buildCueViews(data: TheaterData, version: Version): CueView[] {
  const cues = sortedCues(data.cues);

  // 运行时通道占用：已触发未完成 Cue 持有的通道
  const heldChannels = new Map<number, Cue>();
  for (const cue of cues) {
    if (version.progress[cue.id]?.state === "triggered") {
      for (const ch of cueChannels(cue, data.fixtures)) {
        if (!heldChannels.has(ch)) heldChannels.set(ch, cue);
      }
    }
  }

  return cues.map((cue, index) => {
    const members = cue.fixtureIds.map((id) => {
      const fx = data.fixtures.find((f) => f.id === id);
      return {
        id,
        fixture: fx,
        confirmed: fx ? fx.focusConfirmed : false,
      };
    });
    const missingFixtureIds = members.filter((m) => !m.fixture).map((m) => m.id);
    const presentMembers = members.filter(
      (m): m is { id: string; fixture: Fixture; confirmed: boolean } =>
        Boolean(m.fixture),
    );
    const unconfirmed = presentMembers
      .filter((m) => !m.confirmed)
      .map((m) => m.fixture);
    const channels = cueChannels(cue, data.fixtures);

    const prev = index > 0 ? cues[index - 1] : null;
    const prevState = prev ? version.progress[prev.id]?.state : undefined;
    const prevDone = !prev || prevState === "done";

    const runtimeOccupiers = channels
      .map((ch) => ({ channel: ch, cue: heldChannels.get(ch) }))
      .filter(
        (o): o is { channel: number; cue: Cue } =>
          Boolean(o.cue) && o.cue!.id !== cue.id,
      )
      .map((o) => ({ channel: o.channel, cue: o.cue! }));

    // 静态撞车：与其它任意 Cue（无论顺序）存在预设通道交集
    const overlaps = cues
      .filter((other) => other.id !== cue.id)
      .map((other) => ({
        cue: other,
        channels: cueChannels(other, data.fixtures).filter((ch) =>
          channels.includes(ch),
        ),
      }))
      .filter((o) => o.channels.length > 0);

    const stored = version.progress[cue.id]?.state;
    const state = stored
      ? stored
      : unconfirmed.length > 0 ||
          missingFixtureIds.length > 0 ||
          !prevDone ||
          runtimeOccupiers.length > 0
        ? "blocked"
        : "armed";

    return {
      cue,
      channels,
      members: presentMembers.map((m) => ({
        fixture: m.fixture,
        confirmed: m.confirmed,
      })),
      missingFixtureIds,
      unconfirmed,
      prev,
      prevDone,
      runtimeOccupiers,
      overlaps,
      state,
      note: version.progress[cue.id]?.note ?? "",
    };
  });
}

export function blockReasons(view: CueView): string[] {
  const reasons: string[] = [];
  if (view.missingFixtureIds.length > 0) {
    reasons.push(`关联灯具缺失：${view.missingFixtureIds.join("、")}`);
  }
  if (view.unconfirmed.length > 0) {
    reasons.push(
      `焦点未确认：${view.unconfirmed.map((f) => f.id).join("、")}`,
    );
  }
  if (view.prev && !view.prevDone) {
    reasons.push(`前一条 ${view.prev.id} 未完成`);
  }
  for (const o of view.runtimeOccupiers) {
    reasons.push(
      `CH ${String(o.channel).padStart(3, "0")} 正被 ${o.cue.id} 占用`,
    );
  }
  return reasons;
}

/** 灯位图用：每盏灯的重复通道、参与中的 Cue */
export function buildFixtureViews(
  data: TheaterData,
  version: Version,
): FixtureView[] {
  const channelCounts = new Map<number, number>();
  for (const fx of data.fixtures) {
    channelCounts.set(fx.channel, (channelCounts.get(fx.channel) ?? 0) + 1);
  }
  const activeByFixture = new Map<string, string[]>();
  const doneByFixture = new Map<string, string[]>();
  for (const cue of sortedCues(data.cues)) {
    const pState = version.progress[cue.id]?.state;
    if (pState === "triggered" || pState === "done") {
      const target = pState === "done" ? doneByFixture : activeByFixture;
      for (const id of cue.fixtureIds) {
        target.set(id, [...(target.get(id) ?? []), cue.id]);
      }
    }
  }
  return data.fixtures.map((fixture) => ({
    fixture,
    duplicateChannel: (channelCounts.get(fixture.channel) ?? 0) > 1,
    activeCueIds: activeByFixture.get(fixture.id) ?? [],
    doneCueIds: doneByFixture.get(fixture.id) ?? [],
  }));
}

export function versionSummary(views: CueView[]) {
  const done = views.filter((v) => v.state === "done").length;
  const triggered = views.filter((v) => v.state === "triggered").length;
  const armed = views.filter((v) => v.state === "armed").length;
  return {
    total: views.length,
    done,
    triggered,
    armed,
    blocked: views.length - done - triggered - armed,
  };
}
