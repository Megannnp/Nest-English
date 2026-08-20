const FOUNDER = {
  name: "彭静怡（Megan）",
  role: "OPC 独立产品实践者｜产品与教学设计",
  undergraduate: "本科｜商务英语",
  bio: "专注于 AI 英语学习产品与教学设计，以 OPC 方式推进长期产品迭代。",
};

const RESUME_SECTIONS = [
  {
    title: "个人定位",
    items: [
      "OPC（one person company）独立产品实践者",
      "筑巢英语（Nest English）产品与教学设计负责人",
      "AI 英语教育实践者",
      "课程内容与学习反馈设计者",
    ],
  },
  {
    title: "教育背景",
    items: [
      "教育硕士（在读）｜学科教学（英语）",
      "本科｜商务英语",
    ],
  },
  {
    title: "关注方向",
    items: [
      "英语写作、阅读、语法与词汇学习",
      "AI 辅助批改、学习反馈与个性化练习",
      "OPC 模式下的产品迭代、内容生产与运营",
    ],
  },
  {
    title: "正在进行的项目",
    items: [
      "OPC：以个人长期负责的方式推进 AI 英语学习产品、课程内容和学习服务。",
      "筑巢英语（Nest English）：设计并迭代 AI 英语学习平台，覆盖写作批改、阅读思维训练、语法框架、词汇学习、听读和语音等模块。",
      "英语课程体系：围绕多阶段英语学习路径，设计语法、阅读、写作与词汇相关课程内容，并与练习、反馈和学习记录衔接。",
    ],
  },
];

const PARTNERS = [
  {
    name: "沈媛",
    role: "运营",
    bio: "四年市场营销经验，擅长产品营销与教育社媒运营。",
  },
];

const ASSISTANTS = [
  { name: "彭俊铖、刘耀辉", role: "网站技术维护" },
];

const CONTACT_ITEMS = [
  { label: "邮箱", value: "pjymegan@gmail.com", href: "mailto:pjymegan@gmail.com" },
];

export function TeamSection({ resumeMode, styles: s }) {
  return (
    <section className="studio-reveal studio-reveal--delay-1">
      {!resumeMode && <div style={s.sectionTitle}>关于团队</div>}
      {!resumeMode && (
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.8, marginBottom: 20 }}>
          筑巢英语由一支专注于 AI + 英语教育的小团队打造。我们相信，每个学生的每一次练习都值得被认真对待。
        </p>
      )}
      <div style={s.card}>
        {resumeMode ? (
          <div style={s.resumeIntro}>
            <div style={s.resumeKicker}>OPC（one person company）独立产品实践</div>
            <div style={s.resumeHeadline}>把英语学习产品、课程内容和反馈系统长期做深。</div>
            <div style={s.resumeMeta}>
              {FOUNDER.name} · 产品与教学设计
            </div>
          </div>
        ) : (
          <div style={s.memberName}>
            <a href="/resume" aria-label={`${FOUNDER.name} 简历`} style={s.memberNameLink}>{FOUNDER.name}</a>
          </div>
        )}
        {!resumeMode && <div style={s.memberRole}>{FOUNDER.role}</div>}
        <div style={s.memberBio}>{FOUNDER.bio}</div>

        {resumeMode && (
          <div style={s.resumeGrid}>
            {RESUME_SECTIONS.map((section) => (
              <div key={section.title} style={s.resumeBlock}>
                <div style={s.resumeBlockTitle}>{section.title}</div>
                <ul style={s.resumeList}>
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {!resumeMode && PARTNERS.map((p) => (
          <div key={p.name} style={{ marginTop: 20 }}>
            <div style={s.memberName}>{p.name}</div>
            <div style={s.memberRole}>{p.role}</div>
            <div style={{ ...s.memberBio, marginTop: 6 }}>{p.bio}</div>
          </div>
        ))}

        {!resumeMode && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
            {ASSISTANTS.map((a) => (
              <div key={a.name}>
                <div style={s.memberName}>{a.name}</div>
                <div style={s.memberRole}>{a.role}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function ContactSection({ styles: s }) {
  return (
    <section className="studio-reveal studio-reveal--delay-1">
      <div style={s.sectionTitle}>联系我们</div>
      <div style={s.card}>
        {CONTACT_ITEMS.map((item, i) => (
          <div
            key={item.label}
            style={{
              ...s.contactRow,
              borderBottom: i < CONTACT_ITEMS.length - 1 ? "0.5px solid #f0f0f0" : "none",
            }}
          >
            <span style={s.contactLabel}>{item.label}</span>
            {item.href ? (
              <a href={item.href} aria-label={`${item.label}：${item.value}`} style={s.contactValue}>{item.value}</a>
            ) : (
              <span style={s.contactValue}>{item.value}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function FeedbackSection({ styles: s, form, setForm, submitting, sent, error, onSubmit }) {
  const contentEmpty = !form.content.trim();
  return (
    <section className="studio-reveal studio-reveal--delay-2">
      <div style={s.sectionTitle}>提出建议</div>
      <div style={s.card}>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 16, lineHeight: 1.7 }}>
          你的反馈直接影响产品的改进方向。无论是 bug、功能缺失，还是教学内容的建议，都欢迎告诉我们。
        </p>
        <form onSubmit={onSubmit}>
          <label style={s.label} htmlFor="fb-type">类型</label>
          <select
            id="fb-type"
            style={s.select}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            disabled={submitting}
          >
            <option value="suggestion">功能建议</option>
            <option value="bug">问题反馈</option>
            <option value="content">内容建议</option>
            <option value="other">其他</option>
          </select>

          <label style={s.label} htmlFor="fb-content">内容</label>
          <textarea
            id="fb-content"
            style={s.textarea}
            placeholder="请描述你的建议或遇到的问题..."
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            maxLength={1000}
            disabled={submitting}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              type="submit"
              aria-label={submitting ? "提交中" : "提交反馈"}
              style={{
                ...s.submitBtn,
                ...(submitting || contentEmpty ? s.submitBtnDisabled : null),
              }}
              disabled={submitting || contentEmpty}
            >
              {submitting ? "提交中…" : "提交"}
            </button>
            <span style={{ fontSize: 12, color: "#aaa" }}>{form.content.length} / 1000</span>
          </div>

          {error && <div style={s.errorBanner}>{error}</div>}
          {sent && <div style={s.successBanner}>感谢你的反馈，我们会认真阅读每一条建议！</div>}
        </form>
      </div>
    </section>
  );
}
