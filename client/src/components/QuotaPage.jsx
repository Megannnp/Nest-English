import { useEffect, useState } from "react";

import { usersAPI } from "../api/index.js";
import { AccountPageShell } from "./account/AccountShared.jsx";
import { PageHeader } from "./shared/UI.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";

const ENTITLEMENT_LABELS = {
  writing_review: "写作批改",
  sentence_analysis: "句子分析",
  reading_analysis: "阅读分析",
  paper_generation: "题卷生成",
  sentence_reading: "句子朗读",
  ai_speaking_minutes: "AI口语分钟（上线后启用）",
  ai_listening_minutes: "AI听力分钟（上线后启用）",
};

const LEDGER_LABELS = {
  admin_grant: "管理员发放",
  payment_order: "购买获得",
  points_redemption: "积分兑换",
  feature_usage: "学习消耗",
  feature_usage_refund: "学习消耗退还",
  entitlement_expired: "额度过期",
  free_plan_monthly: "免费版月度发放",
  membership_period: "会员赠送",
  reading_analyze: "阅读分析",
  grammar_analyze: "句子分析",
  grammar_quiz: "在线测验",
  grammar_practice: "题卷生成",
  grammar_tree: "句子分析",
  tts: "句子朗读",
};

const fallback = {
  entitlements: [],
  quotaUsages: [],
  membership: null,
};

function formatDate(value) {
  if (!value) return "未设置";
  try {
    return new Date(value).toLocaleDateString("zh-CN");
  } catch {
    return "未设置";
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getLedgerLabel(entry) {
  return LEDGER_LABELS[entry.reason] || LEDGER_LABELS[entry.sourceType] || "额度变动";
}

function QuotaRow({ item, mode = "balance", onClick }) {
  const balance = item.balance || 0;
  const total = mode === "cycle" ? item.quota || 0 : item.totalAdded || 0;
  const percent = mode === "cycle" ? Math.min(100, Math.max(0, (balance / Math.max(1, total || 1)) * 100)) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px 0",
        border: "none",
        borderTop: "1px solid #f0f0f0",
        background: "transparent",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 700 }}>
            {ENTITLEMENT_LABELS[item.unit] || item.unit}
          </div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
            {mode === "cycle" ? `已用 ${item.used || 0} · 周期至 ${formatDate(item.periodEnd)}` : `累计到账 ${total}`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18, color: "#1a1a1a", fontWeight: 900, whiteSpace: "nowrap" }}>
            {mode === "cycle" ? `${balance} / ${total}` : balance}
          </span>
          <span aria-hidden="true" style={{ color: "#c8c8c8", fontSize: 18, lineHeight: 1 }}>›</span>
        </div>
      </div>
      {percent !== null && (
        <div style={{ height: 7, borderRadius: 999, background: "#f0ede9", overflow: "hidden", marginTop: 10 }}>
          <div style={{ width: `${percent}%`, height: "100%", background: "#1f7a5c" }} />
        </div>
      )}
    </button>
  );
}

function EmptyState({ text }) {
  return <div style={{ color: "#aaa", fontSize: 13, lineHeight: 1.8, paddingTop: 12 }}>{text}</div>;
}

function LedgerModal({ unit, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const title = `${ENTITLEMENT_LABELS[unit] || unit}记录`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    usersAPI.getEntitlementLedger(unit)
      .then((data) => {
        if (!cancelled) setEntries(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "记录加载失败");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [unit]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quota-ledger-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      <button type="button" aria-label="关闭额度记录" onClick={onClose} style={{ position: "fixed", inset: 0, border: 0, padding: 0, background: "rgba(0,0,0,0.28)" }} />
      <div
        style={{
          position: "relative",
          width: "min(520px, 100%)",
          maxHeight: "min(680px, calc(100vh - 36px))",
          overflow: "auto",
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #eee",
          boxShadow: "0 24px 70px rgba(0,0,0,0.2)",
          padding: "18px 20px 20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
          <h2 id="quota-ledger-title" style={{ margin: 0, fontSize: 18, color: "#1a1a1a" }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            style={{ border: "none", background: "transparent", color: "#888", fontSize: 24, lineHeight: 1, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        {loading ? <EmptyState text="加载中..." /> : null}
        {!loading && error ? <EmptyState text={error} /> : null}
        {!loading && !error && entries.length === 0 ? <EmptyState text="暂无额度记录。" /> : null}
        {!loading && !error && entries.length > 0 ? (
          <div>
            {entries.map((entry, index) => {
              const amount = Number(entry.deltaAmount ?? entry.delta_amount ?? 0);
              const balanceAfter = Number(entry.balanceAfter ?? entry.balance_after ?? 0);
              return (
                <div key={entry.id || index} style={{ padding: "13px 0", borderTop: index === 0 ? "none" : "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 700 }}>{getLedgerLabel(entry)}</div>
                      <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>{formatDateTime(entry.createdAt ?? entry.created_at)}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: amount >= 0 ? "#1f7a5c" : "#d9534f" }}>
                        {amount >= 0 ? "+" : ""}{amount}
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>余额 {balanceAfter}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function QuotaPage({ user, onNavigate }) {
  const pageRef = useScrollReveal();
  const [summary, setSummary] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [ledgerUnit, setLedgerUnit] = useState("");

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

  const entitlements = Array.isArray(summary.entitlements) ? summary.entitlements : [];
  const quotaUsages = Array.isArray(summary.quotaUsages) ? summary.quotaUsages : [];
  const membership = summary.membership;

  return (
    <div ref={pageRef}>
    <AccountPageShell style={{ paddingBottom: 72 }}>
      <PageHeader
        titleZh="我的额度"
        subtitle="查看当前可用权益额度和会员周期额度。"
        onBack={() => onNavigate?.("mine")}
        backLabel="返回我的"
      />

      <div className="studio-reveal studio-reveal--delay-1" style={{ display: "grid", gap: 14 }}>
        <section style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 800 }}>当前会员</div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#777", lineHeight: 1.8 }}>
            {membership ? `会员有效期至 ${formatDate(membership.expiresAt)}` : "当前为免费版，可使用基础学习功能。"}
          </div>
        </section>

        <section style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 800 }}>可用权益额度</div>
          {loading ? <EmptyState text="加载中..." /> : entitlements.length ? entitlements.map((item) => <QuotaRow key={item.unit} item={item} onClick={() => setLedgerUnit(item.unit)} />) : <EmptyState text="暂无可用权益额度。" />}
        </section>

        <section style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 800 }}>当前周期额度</div>
          {loading ? <EmptyState text="加载中..." /> : quotaUsages.length ? quotaUsages.map((item) => <QuotaRow key={item.unit} item={item} mode="cycle" onClick={() => setLedgerUnit(item.unit)} />) : <EmptyState text="当前没有周期额度。" />}
        </section>
      </div>

      <div style={{ marginTop: 8, textAlign: "center" }}>
        <button
          type="button"
          onClick={() => onNavigate?.("refund")}
          style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}
        >
          退款与续费规则
        </button>
      </div>

      {ledgerUnit ? <LedgerModal unit={ledgerUnit} onClose={() => setLedgerUnit("")} /> : null}
    </AccountPageShell>
    </div>
  );
}
