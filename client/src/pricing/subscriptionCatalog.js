export const MODULE_SCOPE = {
  free: "阅读、写作、词汇、语法",
  standard: "听、说、读、写、词汇、语法全部开放",
  premium: "全部模块开放",
};

export const SUBSCRIPTION_PLANS = [
  {
    id: "free",
    tier: "免费版",
    cycle: "长期",
    price: "¥0",
    moduleScope: MODULE_SCOPE.free,
    quota: "写作批改2次/月；句子分析5次/月；阅读分析2次/月；题卷生成1次/月",
    highlight: "基础体验",
  },
  {
    id: "standard-month",
    productCode: "standard_month",
    tier: "普通会员",
    cycle: "月卡",
    price: "¥59/月",
    moduleScope: MODULE_SCOPE.standard,
    quota: "写作8次；句子分析50次；阅读15次；题卷8次；朗读100次；AI口语200分钟（上线后启用）；AI听力200分钟（上线后启用）",
    highlight: "全模块入门",
  },
  {
    id: "standard-quarter",
    productCode: "standard_quarter",
    tier: "普通会员",
    cycle: "季卡",
    price: "¥159/季",
    moduleScope: "同普通会员",
    quota: "同普通会员",
    highlight: "季度稳定学习",
  },
  {
    id: "standard-year",
    productCode: "standard_year",
    tier: "普通会员",
    cycle: "年卡",
    price: "¥499/年",
    moduleScope: "同普通会员",
    quota: "同普通会员",
    highlight: "年度更划算",
  },
  {
    id: "premium-month",
    productCode: "premium_month",
    tier: "大会员",
    cycle: "月卡",
    price: "¥129/月",
    moduleScope: MODULE_SCOPE.premium,
    quota: "写作15次；句子分析100次；阅读30次；题卷15次；朗读300次；AI口语500分钟（上线后启用）；AI听力500分钟（上线后启用）",
    highlight: "高频训练",
  },
  {
    id: "premium-quarter",
    productCode: "premium_quarter",
    tier: "大会员",
    cycle: "季卡",
    price: "¥349/季",
    moduleScope: "同大会员",
    quota: "同大会员",
    highlight: "阶段冲刺",
  },
  {
    id: "premium-year",
    productCode: "premium_year",
    tier: "大会员",
    cycle: "年卡",
    price: "¥999/年",
    moduleScope: "同大会员",
    quota: "同大会员",
    highlight: "全年深度学习",
  },
];

export const AUTO_RENEWAL_OFFERS = [
  { tier: "普通会员", price: "¥29.9", note: "自动续费接入后首月优惠", status: "reserved" },
  { tier: "大会员", price: "¥69.9", note: "自动续费接入后首月优惠", status: "reserved" },
];

export const BOOSTER_PACKS = [
  { item: "写作批改包", price: "¥29", quota: "15次 · 90天有效", productCode: "booster_writing_review_15" },
  { item: "句子分析包", price: "¥9.9", quota: "20次 · 90天有效", productCode: "booster_sentence_analysis_20" },
  { item: "阅读分析包", price: "¥9.9", quota: "10次 · 90天有效", productCode: "booster_reading_analysis_10" },
  { item: "句子朗读包", price: "¥5", quota: "50次 · 90天有效", productCode: "booster_sentence_reading_50" },
  { item: "题卷生成包", price: "¥9.9", quota: "10次 · 90天有效", productCode: "booster_paper_generation_10" },
];

export const POINT_EARNING_RULES = [
  { code: "daily_checkin", action: "每日签到", points: "+5" },
  { code: "checkin_streak_7", action: "连续签到7天", points: "+20" },
  { code: "checkin_streak_30", action: "连续签到30天", points: "+100" },
  { code: "learning_writing", action: "每日完成写作训练", points: "+10", dailyLimit: 1 },
  { code: "learning_reading", action: "每日完成阅读训练", points: "+5", dailyLimit: 1 },
  { code: "learning_listening", action: "每日完成听力训练", points: "+5", dailyLimit: 1 },
  { code: "learning_phonetics", action: "每日完成语音训练", points: "+5", dailyLimit: 1 },
  { code: "learning_speaking", action: "每日完成口语训练", points: "+5", dailyLimit: 1 },
  { code: "learning_vocab", action: "每日完成词汇学习", points: "+3", dailyLimit: 1 },
  { code: "learning_grammar", action: "每日完成语法学习", points: "+3", dailyLimit: 1 },
  { code: "profile_completion", action: "完善个人资料", points: "+20" },
  { code: "first_completion", action: "首次完成写作/阅读/听力/口语/语音/词汇/语法", points: "各+20" },
  { code: "referral_registration", action: "邀请好友注册", points: "+50", status: "reserved", note: "邀请系统上线后启用" },
  { code: "referral_standard_member", action: "好友开通普通会员", points: "+200", status: "reserved", note: "邀请系统上线后启用" },
  { code: "referral_premium_member", action: "好友开通大会员", points: "+500", status: "reserved", note: "邀请系统上线后启用" },
];

export const POINT_REDEMPTION_RULES = [
  { code: "writing_review_1", reward: "写作批改1次", points: "100" },
  { code: "sentence_analysis_5", reward: "句子分析5次", points: "50" },
  { code: "reading_analysis_1", reward: "阅读分析1次", points: "80" },
  { code: "paper_generation_1", reward: "题卷生成1次", points: "80" },
  { code: "sentence_reading_10", reward: "句子朗读10次", points: "20" },
  { code: "ai_speaking_30m", reward: "AI口语30分钟（上线后启用）", points: "150" },
  { code: "ai_listening_30m", reward: "AI听力30分钟（上线后启用）", points: "150" },
];

export const SUBSCRIPTION_COMPLIANCE_NOTES = [
  "会员与加油包仅对应平台学习工具额度，不承诺提分、升学结果或替代学校教学。",
  "AI口语/AI听力分钟为预留权益，随对应功能正式上线后启用并扣减。",
  "加油包自确认到账起90天内有效，系统优先消耗更早到期的权益额度。",
  "待支付订单24小时内有效；超时、取消或支付失败的订单不会发放权益。",
  "第三方自动支付接入前，当前采用人工二维码收款与后台确认到账；发票与退款需联系管理员人工处理，已消耗权益的退款以人工审核结果为准。",
  "自动续费能力未接入前，首月优惠仅作为后续支付方案预留展示，不会自动扣费。",
  "积分用于站内学习权益兑换，按运营规则发放与核销，不支持现金兑换。",
  "邀请好友相关积分为预留规则，需邀请码、归因记录和风控策略上线后启用。",
  "第三方支付回调、发票申请和自动退款流程上线前，以人工核对订单状态与权益发放记录为准。",
];
