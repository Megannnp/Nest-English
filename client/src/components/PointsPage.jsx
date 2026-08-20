/* eslint-disable complexity */
import { CalendarCheck, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";


import { usersAPI } from "../api/index.js";
import { POINT_EARNING_RULES, POINT_REDEMPTION_RULES } from "../pricing/subscriptionCatalog.js";
import { AccountPageShell } from "./account/AccountShared.jsx";
import { PageHeader, StatusBanner } from "./shared/UI.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";

const fallback = {
  balance: 0,
  pendingPoints: 0,
  pendingRewards: [],
  totalEarned: 0,
  totalSpent: 0,
  todayCheckedIn: false,
  checkinStreak: 0,
  earningRules: POINT_EARNING_RULES,
  redemptionRules: POINT_REDEMPTION_RULES,
  recentLedger: [],
};

const POINT_EVENT_LABELS = {
  daily_checkin: "每日签到",
  checkin_streak_7: "连续签到 7 天",
  checkin_streak_30: "连续签到 30 天",
  learning_writing: "完成写作练习",
  learning_grammar: "完成语法练习",
  learning_reading: "完成阅读练习",
  learning_vocab: "完成词汇练习",
  learning_listening: "完成听读练习",
  learning_phonetics: "完成语音练习",
  learning_speaking: "完成口语练习",
  first_completion: "首次完成学习任务",
  profile_completion: "完善个人资料",
  points_redemption: "积分兑换",
};

const EARNING_RULE_ACTIONS = {
  daily_checkin: { type: "checkin" },
  learning_writing: { page: "writing", label: "去写作" },
  learning_grammar: { page: "grammar-practice", label: "去语法" },
  learning_reading: { page: "reading-analyzer", label: "去阅读" },
  learning_vocab: { page: "vocab-quiz", label: "去词汇" },
  learning_listening: { page: "listening-basics", label: "去听读" },
  learning_phonetics: { page: "phonetics-overview", label: "去语音" },
  learning_speaking: { page: "speaking", label: "去口语" },
  profile_completion: { page: "account", label: "去完善" },
};

function hasPendingReward(rule, summary) {
  const pendingRewards = Array.isArray(summary.pendingRewards) ? summary.pendingRewards : [];
  return pendingRewards.some((reward) => reward.reason === rule.code);
}

function getRedemptionLabel(entry) {
  if (entry?.reason === "points_redemption") {
    const reward = entry?.rewardLabel || entry?.metadata?.reward;
    return reward ? `兑换${reward}` : "兑换学习权益";
  }
  return "";
}

function formatLedgerLabel(entry) {
  const redemptionLabel = getRedemptionLabel(entry);
  if (redemptionLabel) return redemptionLabel;
  const raw = entry?.label || entry?.reason || entry?.sourceType || "";
  if (POINT_EVENT_LABELS[raw]) return POINT_EVENT_LABELS[raw];
  if (/[\u4e00-\u9fff]/.test(raw)) return raw;
  return "学习记录";
}

function getLedgerAmount(entry) {
  return Number(entry?.amount ?? entry?.deltaPoints ?? 0);
}

function formatRulePoints(points) {
  const text = String(points || 0);
  return text.startsWith("+") ? text : `+${text}`;
}

function getRuleStatus(rule, summary) {
  const code = rule.code;
  if (hasPendingReward(rule, summary)) return "待领取";
  if (code === "daily_checkin" && summary.todayCheckedIn) return "已签到";
  const recentLedger = Array.isArray(summary.recentLedger) ? summary.recentLedger : [];
  if (recentLedger.some((entry) => entry.reason === code)) return "已完成";
  if (rule.status === "reserved") return "未开放";
  return "";
}

function canUseEarningRule(rule, summary, checking) {
  if (rule.status === "reserved" || checking) return false;
  if (hasPendingReward(rule, summary)) return true;
  return Boolean(EARNING_RULE_ACTIONS[rule.code]) && !(rule.code === "daily_checkin" && summary.todayCheckedIn);
}

function getEarningRuleActionLabel(rule, summary, checkInLabel) {
  if (hasPendingReward(rule, summary)) return "领取待领取积分";
  if (rule.code === "daily_checkin") return checkInLabel;
  const actionLabel = EARNING_RULE_ACTIONS[rule.code]?.label;
  if (!actionLabel) return "";
  return rule.dailyLimit ? `每日${rule.dailyLimit}次 · ${actionLabel}` : actionLabel;
}

function EarningRuleRow({ rule, isLast, summary, checking, checkInLabel, onAction }) {
  const status = getRuleStatus(rule, summary);
  const canClick = canUseEarningRule(rule, summary, checking);
  const actionLabel = getEarningRuleActionLabel(rule, summary, checkInLabel);
  return (
    <button
      type="button"
      onClick={() => onAction(rule)}
      disabled={!canClick}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "11px 0",
        border: "none",
        borderBottom: !isLast ? "1px solid #f5f5f5" : "none",
        background: "transparent",
        cursor: canClick ? "pointer" : "default",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {rule.code === "daily_checkin" && <CalendarCheck size={18} strokeWidth={2.2} style={{ color: summary.todayCheckedIn ? "#aaa" : "#f5a623", flex: "0 0 auto" }} />}
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, color: rule.status === "reserved" ? "#aaa" : "#555", fontWeight: rule.code === "daily_checkin" ? 700 : 500 }}>{rule.label || rule.action}</span>
          {actionLabel && <span style={{ display: "block", fontSize: 11, color: "#aaa", marginTop: 3 }}>{checking && rule.code === "daily_checkin" ? "签到中..." : actionLabel}</span>}
        </span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
        {status && <span style={{ fontSize: 11, color: status === "待领取" ? "#f5a623" : "#999", fontWeight: 700 }}>{status}</span>}
        <span style={{ fontSize: 13, fontWeight: 700, color: "#f5a623" }}>{formatRulePoints(rule.points || rule.amount)}</span>
      </span>
    </button>
  );
}

function EarningRulesCard({ rules, summary, checking, claimingPending, checkInLabel, msg, onCheckIn, onNavigate, onClaimPending }) {
  function handleAction(rule) {
    if (hasPendingReward(rule, summary)) {
      onClaimPending?.();
      return;
    }
    const action = EARNING_RULE_ACTIONS[rule.code];
    if (!action || rule.status === "reserved") return;
    if (action.type === "checkin") {
      onCheckIn?.();
      return;
    }
    if (action.page) onNavigate?.(action.page);
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>如何获取积分</div>
        {(summary.pendingPoints || 0) > 0 && (
          <button
            type="button"
            onClick={onClaimPending}
            disabled={claimingPending}
            style={{ border: "none", background: "transparent", padding: 0, fontSize: 12, color: "#f5a623", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            {claimingPending ? "领取中..." : `领取 ${summary.pendingPoints}`}
          </button>
        )}
      </div>
      {msg && (
        <div style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 8, background: msg.startsWith("ok:") ? "#f2fbf6" : "#fff5f5", fontSize: 13, color: msg.startsWith("ok:") ? "#27ae60" : "#d9534f", display: "flex", alignItems: "center", gap: 5 }}>
          {msg.startsWith("ok:") ? <CheckCircle size={13} strokeWidth={2.5} /> : <XCircle size={13} strokeWidth={2.5} />}
          {msg.slice(3)}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {rules.map((rule, i) => (
          <EarningRuleRow
            key={rule.code || rule.action || i}
            rule={rule}
            isLast={i >= rules.length - 1}
            summary={summary}
            checking={checking || claimingPending}
            checkInLabel={checkInLabel}
            onAction={handleAction}
          />
        ))}
      </div>
    </div>
  );
}

function RedemptionRow({ rule, index, balance, redeeming, onRedeem }) {
  const reserved = rule.status === "reserved" || ["ai_speaking_30m", "ai_listening_30m"].includes(rule.code);
  const enough = !reserved && balance >= Number(rule.points || 0);
  return (
    <div
      key={rule.code || rule.reward || index}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 0",
        borderTop: index === 0 ? "none" : "1px solid #f5f5f5",
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>{rule.reward}</div>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 3 }}>{rule.points} 积分</div>
      </div>
      <button
        type="button"
        onClick={() => onRedeem(rule)}
        disabled={!enough || Boolean(redeeming)}
        style={{
          border: `1px solid ${enough ? "#d0d0d0" : "#eee"}`,
          background: enough ? "#fff" : "#f8f8f8",
          color: enough ? "#1a1a1a" : "#aaa",
          borderRadius: 8,
          padding: "7px 13px",
          fontSize: 12,
          fontWeight: 700,
          cursor: enough && !redeeming ? "pointer" : "not-allowed",
          whiteSpace: "nowrap",
        }}
      >
        {reserved ? "暂未开放" : redeeming === rule.code ? "兑换中" : "兑换"}
      </button>
    </div>
  );
}

function buildCheckInLabel(checkedIn, streak) {
  if (checkedIn) return streak > 1 ? `✓ 今日已签到 · 连续 ${streak} 天` : "✓ 今日已签到";
  return streak > 0 ? `今日签到（连续 ${streak} 天）` : "今日签到";
}

function RedeemToast({ toast }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 200,
        width: "min(360px, calc(100vw - 36px))",
        boxShadow: "0 18px 42px rgba(0,0,0,0.16)",
        borderRadius: 16,
      }}
    >
      <StatusBanner tone="success" style={{ borderRadius: 16, margin: 0 }}>
        <div style={{ display: "grid", gap: 5 }}>
          <div style={{ fontWeight: 800 }}>✓ 兑换成功</div>
          <div>已消耗 {toast.points} 积分</div>
          <div>获得：{toast.reward}</div>
        </div>
      </StatusBanner>
    </div>
  );
}

export default function PointsPage({ user, onNavigate }) {
  const pageRef = useScrollReveal();
  const [summary, setSummary] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [claimingPending, setClaimingPending] = useState(false);
  const [redeeming, setRedeeming] = useState("");
  const [msg, setMsg] = useState("");
  const [redeemToast, setRedeemToast] = useState(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    usersAPI.getPointsSummary()
      .then((data) => {
        if (!cancelled) setSummary({ ...fallback, ...(data || {}) });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!redeemToast) return undefined;
    const timer = window.setTimeout(() => setRedeemToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [redeemToast]);

  const handleCheckIn = async () => {
    if (summary.todayCheckedIn || checking) return;
    setChecking(true);
    setMsg("");
    try {
      const result = await usersAPI.checkIn();
      setSummary((prev) => ({ ...prev, ...(result?.summary || result || {}) }));
      setMsg("ok:签到成功，可在本页或今日任务领取积分。");
    } catch (e) {
      setMsg(`err:${e.message || "签到失败"}`);
    } finally {
      setChecking(false);
    }
  };

  const handleClaimPending = async () => {
    if (claimingPending || (summary.pendingPoints || 0) <= 0) return;
    setClaimingPending(true);
    setMsg("");
    try {
      const result = await usersAPI.claimPendingPoints();
      setSummary((prev) => ({ ...prev, ...((result && result.summary) || result || {}) }));
      setMsg(`ok:领取成功，获得 ${result?.claimedPoints || 0} 积分。`);
    } catch (e) {
      setMsg(`err:${e.message || "领取失败"}`);
    } finally {
      setClaimingPending(false);
    }
  };

  const handleRedeem = async (rule) => {
    const code = rule?.code;
    if (!code || redeeming) return;
    const ok = window.confirm(`确认兑换「${rule.reward}」？将消耗 ${rule.points} 积分。`);
    if (!ok) return;
    setRedeeming(code);
    setRedeemToast(null);
    try {
      const result = await usersAPI.redeemPoints(code);
      setSummary((prev) => ({ ...prev, ...((result && result.summary) || result || {}) }));
      const reward = result?.redemption?.reward || "学习权益";
      const points = result?.redemption?.points || 0;
      setRedeemToast({ reward, points });
    } catch (e) {
      setMsg(`err:${e.message || "兑换失败"}`);
    } finally {
      setRedeeming("");
    }
  };

  const earningRules = Array.isArray(summary.earningRules) ? summary.earningRules : POINT_EARNING_RULES;
  const redemptionRules = Array.isArray(summary.redemptionRules) ? summary.redemptionRules : POINT_REDEMPTION_RULES;
  const recentLedger = Array.isArray(summary.recentLedger) ? summary.recentLedger.slice(0, 10) : [];
  const checkInLabel = buildCheckInLabel(summary.todayCheckedIn, summary.checkinStreak);

  return (
    <div ref={pageRef}>
    <AccountPageShell style={{ paddingBottom: 72 }}>
      <PageHeader
        titleZh="我的积分"
        subtitle="查看积分余额、获取方式和兑换记录。"
        onBack={() => onNavigate?.("mine")}
        backLabel="返回我的"
      />
      <RedeemToast toast={redeemToast} />

      {/* 头部积分卡 */}
      <div className="studio-reveal" style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #333 100%)",
        padding: "32px 20px 28px",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>当前积分</div>
        <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>
          {loading ? "—" : (summary.balance || 0)}
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
          {(summary.pendingPoints || 0) > 0 && <span>待领取 <b style={{ color: "rgba(255,255,255,0.8)" }}>{summary.pendingPoints}</b></span>}
          <span>累计获得 <b style={{ color: "rgba(255,255,255,0.8)" }}>{summary.totalEarned || 0}</b></span>
          <span>已消耗 <b style={{ color: "rgba(255,255,255,0.8)" }}>{summary.totalSpent || 0}</b></span>
        </div>
      </div>

      <div className="studio-reveal studio-reveal--delay-1" style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* 获取方式 */}
        <EarningRulesCard
          rules={earningRules}
          summary={summary}
          checking={checking}
          claimingPending={claimingPending}
          checkInLabel={checkInLabel}
          msg={msg}
          onCheckIn={handleCheckIn}
          onNavigate={onNavigate}
          onClaimPending={handleClaimPending}
        />

        {/* 积分兑换 */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>积分兑换</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>当前 {loading ? "—" : (summary.balance || 0)} 积分</div>
          </div>
          <div style={{ display: "grid", gap: 0 }}>
            {redemptionRules.map((rule, index) => (
              <RedemptionRow
                key={rule.code || rule.reward || index}
                rule={rule}
                index={index}
                balance={summary.balance || 0}
                redeeming={redeeming}
                onRedeem={handleRedeem}
              />
            ))}
          </div>
        </div>

        {/* 积分明细 */}
        {recentLedger.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0f0f0", padding: "16px 20px" }}>
            <button
              type="button"
              onClick={() => setLedgerOpen((open) => !open)}
              aria-expanded={ledgerOpen}
              style={{ width: "100%", border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit", cursor: "pointer" }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>近期记录</span>
              <span style={{ fontSize: 12, color: "#aaa" }}>{ledgerOpen ? "收起" : `展开 ${recentLedger.length} 条`}</span>
            </button>
            {ledgerOpen && <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 12 }}>
              {recentLedger.map((entry, i) => {
                const amount = getLedgerAmount(entry);
                return (
                  <div
                    key={entry.id || i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: i < recentLedger.length - 1 ? "1px solid #f5f5f5" : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: "#333", fontWeight: 500 }}>{formatLedgerLabel(entry)}</div>
                      {entry.createdAt && (
                        <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
                          {new Date(entry.createdAt).toLocaleDateString("zh-CN")}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: amount >= 0 ? "#27ae60" : "#d9534f" }}>
                      {amount >= 0 ? "+" : ""}{amount}
                    </span>
                  </div>
                );
              })}
            </div>}
          </div>
        )}
      </div>
    </AccountPageShell>
    </div>
  );
}
