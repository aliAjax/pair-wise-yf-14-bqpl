// 用 node 直接验证规则引擎（tsx 未安装，故用内联 TS->JS 模拟真实结构）
// 规则与 src/state.tsx 中 getCueRows 保持一致
function getCueRows(data, version) {
  const byId = new Map(data.fixtures.map((f) => [f.id, f]));
  const groups = new Map();
  for (const f of data.fixtures) {
    const list = groups.get(f.channel) ?? [];
    list.push(f);
    groups.set(f.channel, list);
  }
  const rows = [];
  let chainOk = true;
  let prevDone = false;
  data.cues.forEach((cue, index) => {
    const progress = version.progress[cue.id] ?? null;
    const done = progress?.status === "done";
    const reasons = [];
    if (!done) {
      const channelSeen = new Set();
      const focusPending = [];
      for (const lv of cue.levels) {
        const f = byId.get(lv.fixtureId);
        if (!f) continue;
        if (!f.focusConfirmed) focusPending.push(f.code);
        if (!channelSeen.has(f.channel)) {
          const mates = (groups.get(f.channel) ?? []).filter((m) => m.id !== f.id);
          if (mates.length > 0) {
            channelSeen.add(f.channel);
            reasons.push(`channel ${f.channel} clash`);
          }
        }
      }
      if (focusPending.length) reasons.push(`focus: ${focusPending.join(",")}`);
      if (index > 0 && !prevDone) reasons.push("prev not done");
    }
    rows.push({ cue: cue.cueNo, done, ready: !done && reasons.length === 0, reasons, brokenChain: done && !chainOk });
    chainOk = chainOk && done;
    prevDone = done;
  });
  return rows;
}

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.error("  ✗", name); }
}

const F = (id, channel, focusConfirmed) => ({ id, code: id, channel, focusConfirmed });
const L = (fixtureId, level = 50) => ({ fixtureId, level });

// Cue1: a+b（同通道撞车）；Cue2: c（焦点未确认）；Cue3: d（本身没问题）
const data = {
  fixtures: [F("a", 41, true), F("b", 41, true), F("c", 5, false), F("d", 9, true)],
  cues: [
    { id: "q1", cueNo: "1", levels: [L("a"), L("b")] },
    { id: "q2", cueNo: "2", levels: [L("c")] },
    { id: "q3", cueNo: "3", levels: [L("d")] },
  ],
};

console.log("演出版（全新进度）：");
let rows = getCueRows(data, { progress: {} });
assert("Cue1 因通道撞车不能触发", rows[0].ready === false && rows[0].reasons.some((r) => r.includes("clash")));
assert("Cue2 因焦点未确认不能触发", rows[1].ready === false && rows[1].reasons.some((r) => r.startsWith("focus")));
assert("Cue2 同时受前序阻塞", rows[1].reasons.includes("prev not done"));
assert("Cue3 仅受前序阻塞，本身无焦点/通道问题", rows[2].ready === false && rows[2].reasons.length === 1 && rows[2].reasons[0] === "prev not done");

console.log("修好通道 + 确认焦点后：");
const fixed = {
  ...data,
  fixtures: [F("a", 41, true), F("b", 42, true), F("c", 5, true), F("d", 9, true)],
};
rows = getCueRows(fixed, { progress: {} });
assert("Cue1 进入待触发", rows[0].ready === true);
assert("Cue2 仍需等 Cue1", rows[1].ready === false && rows[1].reasons[0] === "prev not done");

console.log("按顺序触发：");
const v = { progress: { q1: { status: "done" } } };
rows = getCueRows(fixed, v);
assert("Cue1 done / Cue2 ready / Cue3 等待", rows[0].done && rows[1].ready && !rows[2].ready);
v.progress.q2 = { status: "done" };
rows = getCueRows(fixed, v);
assert("Cue3 进入待触发", rows[2].ready);
v.progress.q3 = { status: "done" };
rows = getCueRows(fixed, v);
assert("全部 done", rows.every((r) => r.done));

console.log("撤销中间一条（模拟现场回退）：");
delete v.progress.q2;
rows = getCueRows(fixed, v);
assert("Cue3 标记链条中断", rows[2].done && rows[2].brokenChain);
assert("Cue2 重新 ready（Cue1 仍 done）", rows[1].ready);

console.log("旧版本进度与新版本互不干扰：");
const legacy = { progress: { q1: { status: "done", firedAt: "19:32", note: "旧备注" } } };
const perf = { progress: {} };
const rLegacy = getCueRows(fixed, legacy);
const rPerf = getCueRows(fixed, perf);
assert("旧版 Cue1 保留 done + 备注", rLegacy[0].done && legacy.progress.q1.note === "旧备注");
assert("新版 Cue1 从头开始", !rPerf[0].done && rPerf[0].ready);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
