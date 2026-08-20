import { useCallback, useEffect, useState } from "react";

import { SectionCard, StatusBadge } from "./AccountShared.jsx";
import { ACCOUNT_THEME } from "./accountStyles.js";
import { paymentsAPI, usersAPI } from "../../api/index.js";
import {
  AUTO_RENEWAL_OFFERS,
  BOOSTER_PACKS,
  MODULE_SCOPE,
  POINT_EARNING_RULES,
  POINT_REDEMPTION_RULES,
  SUBSCRIPTION_COMPLIANCE_NOTES,
  SUBSCRIPTION_PLANS,
} from "../../pricing/subscriptionCatalog.js";

const freePlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === "free");
const fallbackPointsSummary = {
  balance: 0,
  totalEarned: 0,
  totalSpent: 0,
  todayCheckedIn: false,
  checkinStreak: 0,
  membership: null,
  earningRules: POINT_EARNING_RULES,
  redemptionRules: POINT_REDEMPTION_RULES,
  entitlements: [],
  quotaUsages: [],
  recentLedger: [],
  redemptions: [],
};

const ENTITLEMENT_LABELS = {
  writing_review: "写作批改",
  sentence_analysis: "句子分析",
  reading_analysis: "阅读分析",
  paper_generation: "题卷生成",
  sentence_reading: "句子朗读",
  ai_speaking_minutes: "AI口语分钟（上线后启用）",
  ai_listening_minutes: "AI听力分钟（上线后启用）",
};

const MEMBERSHIP_LABELS = {
  standard: "普通会员",
  premium: "大会员",
};

const MEMBERSHIP_MODULE_SCOPE = {
  standard: MODULE_SCOPE.standard,
  premium: MODULE_SCOPE.premium,
};

const RESERVED_REDEMPTION_CODES = new Set(["ai_speaking_30m", "ai_listening_30m"]);
const ORDER_STATUS_LABELS = {
  pending: "待支付/待确认",
  paid: "已确认",
  closed: "已关闭",
  failed: "支付失败",
  refunded: "已退款",
};

const CYCLES = [
  { key: "month", label: "月卡" },
  { key: "quarter", label: "季卡" },
  { key: "year", label: "年卡" },
];

const TIER_FEATURES = {
  standard: [
    "听、说、读、写全模块开放",
    "词汇 · 语法学习",
    "写作批改 8次/月",
    "句子分析 50次/月",
    "阅读分析 15次/月",
    "题卷生成 8次/月",
    "AI口语 200分钟/月（上线后启用）",
    "AI听力 200分钟/月（上线后启用）",
  ],
  premium: [
    "全部模块开放",
    "词汇 · 语法学习",
    "写作批改 15次/月",
    "句子分析 100次/月",
    "阅读分析 30次/月",
    "题卷生成 15次/月",
    "AI口语 500分钟/月（上线后启用）",
    "AI听力 500分钟/月（上线后启用）",
  ],
};

const CYCLE_SAVINGS = {
  standard: { quarter: "省 ¥18", year: "省 ¥209" },
  premium: { quarter: "省 ¥38", year: "省 ¥549" },
};

function getPlanByCycle(tier, cycle) {
  return SUBSCRIPTION_PLANS.find((p) => p.productCode === `${tier}_${cycle}`);
}

function CyclePill({ cycles, active, onChange }) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "#f2ede8",
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {cycles.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          style={{
            padding: "5px 14px",
            borderRadius: 8,
            border: "none",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s",
            background: active === c.key ? "#fff" : "transparent",
            color: active === c.key ? ACCOUNT_THEME.text : ACCOUNT_THEME.textMuted,
            boxShadow: active === c.key ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
          }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function CheckIcon({ color = ACCOUNT_THEME.success }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="7" cy="7" r="7" fill={color} fillOpacity="0.12" />
      <path d="M4 7l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
      <path d="M6.5 1l1.5 3.1 3.4.5-2.45 2.4.58 3.38L6.5 8.76l-3.03 1.62.58-3.38L1.6 4.6l3.4-.5z" fill="#f5a623" />
    </svg>
  );
}

function getPlanCardTheme(isPremium) {
  return {
    accentColor: isPremium ? "#2f4358" : "#1a1a1a",
    accentLight: isPremium ? "#edf2f7" : "#f5f5f5",
    borderColor: isPremium ? "#2f4358" : ACCOUNT_THEME.border,
    background: isPremium ? "#f8fafc" : "#fff",
  };
}

function RecommendedRibbon({ isPremium, accentColor }) {
  if (!isPremium) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: -11,
        left: "50%",
        transform: "translateX(-50%)",
        background: accentColor,
        color: "#fff",
        fontSize: 10,
        fontWeight: 800,
        padding: "3px 10px",
        borderRadius: 999,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      ★ 推荐
    </div>
  );
}

function FirstMonthOffer({ offer, cycle }) {
  if (!offer || cycle !== "month") return null;
  return (
    <div style={{ fontSize: 11, color: "#b06000", marginTop: 4, fontWeight: 600 }}>
      自动续费接入后首月 {offer.price}
    </div>
  );
}

function SavingBadge({ saving }) {
  if (!saving) return null;
  return (
    <div
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        color: ACCOUNT_THEME.success,
        background: ACCOUNT_THEME.successLight,
        borderRadius: 5,
        padding: "2px 6px",
        marginTop: 4,
      }}
    >
      {saving}
    </div>
  );
}

function PlanCardHeader({ tierLabel, plan, cycle, isPremium, isActive, accentColor, accentLight }) {
  const firstMonthOffer = AUTO_RENEWAL_OFFERS.find((offer) => offer.tier === tierLabel);
  const saving = cycle !== "month" ? CYCLE_SAVINGS[plan.tier]?.[cycle] : null;

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
      <div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: accentLight,
            borderRadius: 6,
            padding: "3px 8px",
            marginBottom: 6,
          }}
        >
          {isPremium && <StarIcon />}
          <span style={{ fontSize: 11, fontWeight: 800, color: accentColor }}>{tierLabel}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: ACCOUNT_THEME.text, lineHeight: 1 }}>
          {plan.price}
        </div>
        <FirstMonthOffer offer={firstMonthOffer} cycle={cycle} />
        <SavingBadge saving={saving} />
      </div>
      {isActive && <StatusBadge tone="success">当前方案</StatusBadge>}
    </div>
  );
}

function PlanFeatureList({ features, checkColor }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {features.map((feature) => (
        <div key={feature} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: ACCOUNT_THEME.textSecondary }}>
          <CheckIcon color={checkColor} />
          <span>{feature}</span>
        </div>
      ))}
    </div>
  );
}

function PlanOrderButton({ plan, onOrder, orderStatus, canUsePoints, background }) {
  const busy = orderStatus.action === plan.productCode;
  const disabled = !canUsePoints || Boolean(orderStatus.action);

  return (
    <button
      type="button"
      onClick={() => onOrder(plan.productCode)}
      disabled={disabled}
      style={{
        border: "none",
        background,
        color: "#fff",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "opacity 0.15s",
        marginTop: 2,
      }}
    >
      {busy ? "创建中..." : "立即开通"}
    </button>
  );
}

function PlanCard({ tier, tierLabel, cycle, isPremium, onOrder, orderStatus, canUsePoints, isActive }) {
  const plan = getPlanByCycle(tier, cycle);
  if (!plan) return null;

  const features = TIER_FEATURES[tier] || [];
  const theme = getPlanCardTheme(isPremium);
  const checkColor = isPremium ? theme.accentColor : ACCOUNT_THEME.success;

  return (
    <div
      style={{
        border: `1.5px solid ${theme.borderColor}`,
        borderRadius: 16,
        padding: "18px 16px",
        background: theme.background,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
      }}
    >
      <RecommendedRibbon isPremium={isPremium} accentColor={theme.accentColor} />
      <PlanCardHeader
        tierLabel={tierLabel}
        plan={{ ...plan, tier }}
        cycle={cycle}
        isPremium={isPremium}
        isActive={isActive}
        accentColor={theme.accentColor}
        accentLight={theme.accentLight}
      />
      <PlanFeatureList features={features} checkColor={checkColor} />
      <PlanOrderButton
        plan={plan}
        onOrder={onOrder}
        orderStatus={orderStatus}
        canUsePoints={canUsePoints}
        background={isPremium ? theme.accentColor : ACCOUNT_THEME.text}
      />
    </div>
  );
}

function BoosterPackCard({ pack, onOrder, orderStatus, canUsePoints }) {
  const busy = orderStatus.action === pack.productCode;
  return (
    <div
      style={{
        border: `1px solid ${ACCOUNT_THEME.border}`,
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        background: "#fff",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: ACCOUNT_THEME.text }}>{pack.item}</div>
        <div style={{ fontSize: 12, color: ACCOUNT_THEME.textMuted, marginTop: 2 }}>{pack.quota}</div>
      </div>
      <button
        type="button"
        onClick={() => onOrder(pack.productCode)}
        disabled={!canUsePoints || Boolean(orderStatus.action)}
        style={{
          flexShrink: 0,
          border: `1.5px solid ${ACCOUNT_THEME.border}`,
          background: canUsePoints && !orderStatus.action ? "#fff" : "#f8f8f8",
          color: canUsePoints ? ACCOUNT_THEME.text : ACCOUNT_THEME.textMuted,
          borderRadius: 8,
          padding: "7px 12px",
          fontSize: 13,
          fontWeight: 800,
          cursor: canUsePoints && !orderStatus.action ? "pointer" : "not-allowed",
        }}
      >
        {busy ? "..." : pack.price}
      </button>
    </div>
  );
}

function PointsEarnRow({ rule }) {
  const reserved = rule.status === "reserved";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 0",
        borderTop: `1px solid ${ACCOUNT_THEME.border}`,
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, color: ACCOUNT_THEME.textSecondary }}>
        {rule.action}{reserved ? "（待上线）" : ""}
      </span>
      <span style={{ fontSize: 12, fontWeight: 800, color: reserved ? ACCOUNT_THEME.textMuted : ACCOUNT_THEME.success, whiteSpace: "nowrap" }}>
        {reserved ? (rule.note || "待上线") : (String(rule.points || "").startsWith("+") ? rule.points : `+${rule.points}`)}
      </span>
    </div>
  );
}

function PointsRedeemRow({ rule, balance, canUsePoints, onRedeem, loading }) {
  const reserved = RESERVED_REDEMPTION_CODES.has(rule.code);
  const enough = canUsePoints && balance >= Number(rule.points || 0) && !reserved;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 0",
        borderTop: `1px solid ${ACCOUNT_THEME.border}`,
        gap: 10,
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: ACCOUNT_THEME.textSecondary }}>{rule.reward}</div>
        <div style={{ fontSize: 11, color: ACCOUNT_THEME.textMuted, marginTop: 2 }}>{rule.points} 积分</div>
      </div>
      <button
        type="button"
        onClick={() => onRedeem(rule.code)}
        disabled={!enough || Boolean(loading)}
        style={{
          flexShrink: 0,
          border: `1.5px solid ${enough ? ACCOUNT_THEME.border : "#eee"}`,
          background: enough ? "#fff" : "#f8f8f8",
          color: enough ? ACCOUNT_THEME.text : ACCOUNT_THEME.textMuted,
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 700,
          cursor: enough && !loading ? "pointer" : "not-allowed",
        }}
      >
        {reserved ? "暂未开放" : loading === rule.code ? "兑换中" : "兑换"}
      </button>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: ACCOUNT_THEME.border }} />
      {label && <span style={{ fontSize: 11, color: ACCOUNT_THEME.textMuted, fontWeight: 600 }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: ACCOUNT_THEME.border }} />
    </div>
  );
}

function MembershipSummaryCard({ activePlanLabel, activeMembership, activePlanDetail, activeModuleScope }) {
  return (
    <div
      style={{
        background: "#f7f4f0",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: ACCOUNT_THEME.text }}>{activePlanLabel}</span>
          {activeMembership && <StatusBadge tone="success">有效</StatusBadge>}
        </div>
        <div style={{ fontSize: 12, color: ACCOUNT_THEME.textMuted, lineHeight: 1.6 }}>{activePlanDetail}</div>
        <div style={{ fontSize: 11, color: ACCOUNT_THEME.textMuted }}>开放范围：{activeModuleScope}</div>
        {activeMembership?.nextResetAt && (
          <div style={{ fontSize: 11, color: ACCOUNT_THEME.textMuted }}>
            下次额度重置：{new Date(activeMembership.nextResetAt).toLocaleDateString("zh-CN")}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{ fontSize: 12, color: ACCOUNT_THEME.error, background: ACCOUNT_THEME.errorLight, borderRadius: 10, padding: "9px 12px" }}>
      {message}
    </div>
  );
}

function PlanCycleSelector({ selectedCycle, setSelectedCycle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <CyclePill cycles={CYCLES} active={selectedCycle} onChange={setSelectedCycle} />
      {selectedCycle === "year" && (
        <span style={{ fontSize: 11, color: ACCOUNT_THEME.success, fontWeight: 700 }}>🎉 年卡最划算</span>
      )}
    </div>
  );
}

function PlanCardsGrid({ selectedCycle, isMobile, handleCreateOrder, orderStatus, canUsePoints, activeMembership }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
      <PlanCard
        tier="standard"
        tierLabel="普通会员"
        cycle={selectedCycle}
        isPremium={false}
        onOrder={handleCreateOrder}
        orderStatus={orderStatus}
        canUsePoints={canUsePoints}
        isActive={activeMembership?.tier === "standard"}
      />
      <PlanCard
        tier="premium"
        tierLabel="大会员"
        cycle={selectedCycle}
        isPremium={true}
        onOrder={handleCreateOrder}
        orderStatus={orderStatus}
        canUsePoints={canUsePoints}
        isActive={activeMembership?.tier === "premium"}
      />
    </div>
  );
}

function FirstMonthOfferNote({ selectedCycle }) {
  if (selectedCycle !== "month") return null;
  return (
    <div style={{ fontSize: 11, color: ACCOUNT_THEME.textMuted, textAlign: "center", lineHeight: 1.6 }}>
      自动续费接入后可享首月优惠，当前不会自动扣费 ·{" "}
      {AUTO_RENEWAL_OFFERS.map((offer) => `${offer.tier} ${offer.price}`).join(" / ")}
    </div>
  );
}

function PendingOrderCard({ orderStatus, handleCloseOrder }) {
  const order = orderStatus.order;
  if (!order) return null;
  return (
    <div
      style={{
        border: `1.5px solid ${ACCOUNT_THEME.border}`,
        borderRadius: 12,
        padding: 16,
        background: "#fafafa",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: ACCOUNT_THEME.text }}>
          {order.productLabel}
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: ACCOUNT_THEME.text }}>
          ¥{(order.amountCents / 100).toFixed(2)}
        </div>
      </div>
      {order.qrUrl ? (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img
            src={order.qrUrl}
            alt="支付二维码"
            style={{ width: 160, height: 160, objectFit: "contain", border: `1px solid ${ACCOUNT_THEME.border}`, borderRadius: 10 }}
          />
        </div>
      ) : (
        <div style={{ fontSize: 12, color: ACCOUNT_THEME.textMuted, lineHeight: 1.7, textAlign: "center" }}>
          会员开通暂未开放自动支付，如需开通请联系老师或客服。
          <br />付款确认后，管理员会手动为你开通权益。
        </div>
      )}
      <div style={{ fontSize: 11, color: ACCOUNT_THEME.textMuted, textAlign: "center" }}>
        订单号：{order.id} · 状态：{ORDER_STATUS_LABELS[order.status] || order.status}
        {order.expiresAt && <> · 有效期至 {new Date(order.expiresAt).toLocaleString("zh-CN", { hour12: false })}</>}
      </div>
      {order.status === "pending" && (
        <button
          type="button"
          aria-label={orderStatus.action === "close_order" ? "关闭中" : "关闭订单"}
          onClick={handleCloseOrder}
          disabled={orderStatus.action === "close_order"}
          style={{
            alignSelf: "center",
            border: `1px solid ${ACCOUNT_THEME.border}`,
            background: "#fff",
            color: ACCOUNT_THEME.textSecondary,
            borderRadius: 8,
            padding: "7px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: orderStatus.action === "close_order" ? "not-allowed" : "pointer",
          }}
        >
          {orderStatus.action === "close_order" ? "关闭中..." : "关闭订单"}
        </button>
      )}
    </div>
  );
}

function RecentOrders({ orders, isMobile, setOrderStatus }) {
  if (!orders.length) return null;
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: ACCOUNT_THEME.text, marginBottom: 4 }}>最近订单</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {orders.slice(0, 5).map((order) => (
          <div
            key={order.id}
            style={{
              border: `1px solid ${ACCOUNT_THEME.border}`,
              borderRadius: 10,
              padding: "10px 12px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
              gap: 8,
              alignItems: "center",
              background: "#fff",
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: ACCOUNT_THEME.text }}>{order.productLabel}</div>
              <div style={{ fontSize: 11, color: ACCOUNT_THEME.textMuted, marginTop: 3 }}>
                {new Date(order.createdAt).toLocaleString("zh-CN", { hour12: false })} · 订单号 {order.id}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: isMobile ? "space-between" : "flex-end" }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: ACCOUNT_THEME.text }}>
                ¥{(order.amountCents / 100).toFixed(2)}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: order.status === "paid" ? ACCOUNT_THEME.success : ACCOUNT_THEME.textMuted,
                  background: order.status === "paid" ? ACCOUNT_THEME.successLight : "#f5f5f5",
                  borderRadius: 999,
                  padding: "3px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                {ORDER_STATUS_LABELS[order.status] || order.status}
              </span>
              {order.status === "pending" && (
                <button
                  type="button"
                  onClick={() => setOrderStatus({ action: "", error: "", order })}
                  style={{
                    border: `1px solid ${ACCOUNT_THEME.border}`,
                    background: "#fff",
                    color: ACCOUNT_THEME.text,
                    borderRadius: 8,
                    padding: "5px 9px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  继续支付
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoosterPacksGrid({ isMobile, handleCreateOrder, orderStatus, canUsePoints }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
      {BOOSTER_PACKS.map((pack) => (
        <BoosterPackCard
          key={pack.productCode}
          pack={pack}
          onOrder={handleCreateOrder}
          orderStatus={orderStatus}
          canUsePoints={canUsePoints}
        />
      ))}
    </div>
  );
}

function _EntitlementsPanel({ entitlements, isMobile }) {
  if (!entitlements?.length) return null;
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: ACCOUNT_THEME.text, marginBottom: 4 }}>可用权益额度</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", columnGap: 18 }}>
        {entitlements.map((item) => (
          <div
            key={item.unit}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 0",
              borderTop: `1px solid ${ACCOUNT_THEME.border}`,
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: ACCOUNT_THEME.textSecondary }}>
                {ENTITLEMENT_LABELS[item.unit] || item.unit}
              </div>
              <div style={{ fontSize: 11, color: ACCOUNT_THEME.textMuted, marginTop: 2 }}>
                累计到账 {item.totalAdded || 0}
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: ACCOUNT_THEME.text }}>{item.balance || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function _QuotaUsagePanel({ quotaUsages, isMobile }) {
  if (!quotaUsages?.length) return null;
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: ACCOUNT_THEME.text, marginBottom: 4 }}>当前周期额度</div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", columnGap: 18 }}>
        {quotaUsages.map((item) => (
          <div
            key={item.unit}
            style={{
              padding: "9px 0",
              borderTop: `1px solid ${ACCOUNT_THEME.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 12, color: ACCOUNT_THEME.textSecondary }}>
                {ENTITLEMENT_LABELS[item.unit] || item.unit}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: ACCOUNT_THEME.text }}>
                剩余 {item.balance || 0} / {item.quota || 0}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "#f0ede9", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, ((item.balance || 0) / Math.max(1, item.quota || 1)) * 100))}%`,
                  height: "100%",
                  background: ACCOUNT_THEME.success,
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: ACCOUNT_THEME.textMuted }}>
              已用 {item.used || 0} · 本周期至 {new Date(item.periodEnd).toLocaleDateString("zh-CN")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function _RedemptionPanel({ redemptionRules, pointsStatus, pointsSummary, canUsePoints, handleRedeem, isMobile }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: ACCOUNT_THEME.text, marginBottom: 2 }}>积分兑换</div>
      <div style={{ fontSize: 11, color: ACCOUNT_THEME.textMuted, marginBottom: 6 }}>
        当前积分：{pointsStatus.loading ? "加载中" : pointsSummary.balance || 0} ·
        累计获得 {pointsSummary.totalEarned || 0} · 已兑换 {pointsSummary.totalSpent || 0}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", columnGap: 18 }}>
        {redemptionRules.map((rule) => (
          <PointsRedeemRow
            key={rule.code || rule.reward}
            rule={rule}
            balance={pointsSummary.balance || 0}
            canUsePoints={canUsePoints}
            onRedeem={handleRedeem}
            loading={pointsStatus.action}
          />
        ))}
      </div>
    </div>
  );
}

function _EarningRulesPanel({ showEarning, setShowEarning, earningRules, isMobile }) {
  return (
    <div>
      <button
        type="button"
        onClick={() => setShowEarning((value) => !value)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          fontSize: 13,
          fontWeight: 700,
          color: ACCOUNT_THEME.text,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: showEarning ? 2 : 0,
        }}
      >
        <span>如何获取积分</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ transform: showEarning ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        >
          <path d="M2 4l4 4 4-4" stroke={ACCOUNT_THEME.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {showEarning && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", columnGap: 18, marginTop: 4 }}>
          {earningRules.map((rule) => (
            <PointsEarnRow key={rule.code || rule.action} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
}

function ComplianceNotes() {
  return (
    <div
      style={{
        fontSize: 11,
        color: ACCOUNT_THEME.textMuted,
        lineHeight: 1.8,
        background: "#faf6f0",
        border: "1px solid #eee3d4",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      {SUBSCRIPTION_COMPLIANCE_NOTES.map((note) => (
        <div key={note}>{note}</div>
      ))}
    </div>
  );
}

function _pickRules(primaryRules, fallbackRules) {
  return primaryRules?.length ? primaryRules : fallbackRules;
}

function getActivePlanSnapshot(pointsSummary) {
  const activeMembership = pointsSummary.membership;
  return {
    activeMembership,
    activePlanLabel: activeMembership
      ? (MEMBERSHIP_LABELS[activeMembership.tier] || activeMembership.tier)
      : (freePlan?.tier || "免费版"),
    activePlanDetail: activeMembership?.expiresAt
      ? `有效期至 ${new Date(activeMembership.expiresAt).toLocaleDateString("zh-CN")}`
      : (freePlan?.quota || "可使用基础学习功能"),
    activeModuleScope: activeMembership
      ? (MEMBERSHIP_MODULE_SCOPE[activeMembership.tier] || MODULE_SCOPE.standard)
      : (freePlan?.moduleScope || MODULE_SCOPE.free),
  };
}

function _buildCheckInLabel(canUsePoints, pointsSummary) {
  if (!canUsePoints) return "登录后签到";
  if (pointsSummary.todayCheckedIn) return `今日已签到 · 连续${pointsSummary.checkinStreak || 1}天 🔥`;
  return "签到 +5 积分";
}

export default function SubscriptionTab({ isMobile, user }) {
  const [pointsSummary, setPointsSummary] = useState(fallbackPointsSummary);
  const [pointsStatus, setPointsStatus] = useState({ loading: false, action: "", error: "" });
  const [orderStatus, setOrderStatus] = useState({ action: "", error: "", order: null });
  const [orders, setOrders] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState("month");

  const canUsePoints = Boolean(user?.id);
  const {
    activeMembership,
    activePlanLabel,
    activePlanDetail,
    activeModuleScope,
  } = getActivePlanSnapshot(pointsSummary);

  useEffect(() => {
    let cancelled = false;
    if (!canUsePoints) {
      setPointsSummary(fallbackPointsSummary);
      return undefined;
    }
    setPointsStatus({ loading: true, action: "", error: "" });
    usersAPI.getPointsSummary()
      .then((summary) => {
        if (cancelled) return;
        setPointsSummary({ ...fallbackPointsSummary, ...(summary || {}) });
        setPointsStatus({ loading: false, action: "", error: "" });
      })
      .catch((error) => {
        if (cancelled) return;
        setPointsStatus({ loading: false, action: "", error: error?.message || "积分信息加载失败" });
      });
    return () => { cancelled = true; };
  }, [canUsePoints]);

  const refreshOrders = useCallback(({ skipStateUpdate = false } = {}) => {
    if (!canUsePoints) {
      if (!skipStateUpdate) setOrders([]);
      return Promise.resolve([]);
    }
    return paymentsAPI.orders()
      .then((items) => {
        if (!skipStateUpdate) setOrders(Array.isArray(items) ? items : []);
        return items;
      })
      .catch(() => []);
  }, [canUsePoints]);

  useEffect(() => {
    let cancelled = false;
    refreshOrders({ skipStateUpdate: true }).then((items) => {
      if (!cancelled) setOrders(Array.isArray(items) ? items : []);
    });
    return () => { cancelled = true; };
  }, [canUsePoints, refreshOrders]);

  const handleCreateOrder = (productCode) => {
    if (!canUsePoints || orderStatus.action) return;
    setOrderStatus({ action: productCode, error: "", order: null });
    paymentsAPI.createOrder(productCode)
      .then((order) => {
        setOrderStatus({ action: "", error: "", order });
        refreshOrders();
      })
      .catch((error) => setOrderStatus({ action: "", error: error?.message || "订单创建失败", order: null }));
  };

  const handleCloseOrder = () => {
    const orderId = orderStatus.order?.id;
    if (!orderId || orderStatus.action) return;
    setOrderStatus((current) => ({ ...current, action: "close_order", error: "" }));
    paymentsAPI.closeOrder(orderId)
      .then((order) => {
        setOrderStatus({ action: "", error: "", order });
        refreshOrders();
      })
      .catch((error) => setOrderStatus((current) => ({
        ...current,
        action: "",
        error: error?.message || "订单关闭失败",
      })));
  };

  return (
    <SectionCard title="订阅与权益" isMobile={isMobile}>
      <MembershipSummaryCard
        activePlanLabel={activePlanLabel}
        activeMembership={activeMembership}
        activePlanDetail={activePlanDetail}
        activeModuleScope={activeModuleScope}
      />
      <ErrorBanner message={pointsStatus.error} />
      <Divider label="选择套餐" />
      <PlanCycleSelector selectedCycle={selectedCycle} setSelectedCycle={setSelectedCycle} />
      <PlanCardsGrid
        selectedCycle={selectedCycle}
        isMobile={isMobile}
        handleCreateOrder={handleCreateOrder}
        orderStatus={orderStatus}
        canUsePoints={canUsePoints}
        activeMembership={activeMembership}
      />
      <FirstMonthOfferNote selectedCycle={selectedCycle} />
      <ErrorBanner message={orderStatus.error} />
      <PendingOrderCard orderStatus={orderStatus} handleCloseOrder={handleCloseOrder} />
      <RecentOrders orders={orders} isMobile={isMobile} setOrderStatus={setOrderStatus} />
      <Divider label="加油包" />
      <BoosterPacksGrid
        isMobile={isMobile}
        handleCreateOrder={handleCreateOrder}
        orderStatus={orderStatus}
        canUsePoints={canUsePoints}
      />
      <ComplianceNotes />
    </SectionCard>
  );
}
