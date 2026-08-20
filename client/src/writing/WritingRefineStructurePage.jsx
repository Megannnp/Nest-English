import { useState } from "react";

import WritingTopBar from "./WritingTopBar.jsx";
import { writingProgressAPI } from "../api/index.js";
import GuestTopBar from "../app/guest/GuestTopBar.jsx";
import AppIcon from "../components/shared/AppIcon.jsx";
import ModuleAssignmentSection from "../components/shared/ModuleAssignmentSection.jsx";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./WritingRefinePage.css";
import "./writing.css";

const WRITING_REFINE_STRUCTURE_TYPES = [{ value: 'writing-refine-structure', label: '结构调整' }];

const WRITING_STRUCTURES = [
  {
    id: "argumentative",
    title: "议论文",
    icon: "target",
    desc: "观点鲜明，逻辑严密",
    sections: [
      {
        id: "arg-intro",
        title: "开头段",
        content: `议论文开头段的核心任务是**引出话题并亮明观点**。

**结构**：
• 背景引入：用1-2句话介绍话题背景或现象
• 过渡：用连接词自然引出核心论点
• 论点句：清晰表明自己的立场

**常用句型**：
• With the development of..., more and more people begin to realize that...
• It is generally believed that..., but I think/argue that...
• There is no doubt that... plays an important role in our lives.
• When it comes to..., people's opinions differ greatly.

**示例**：
In recent years, technology has transformed the way we communicate. While some argue that social media brings people closer, I firmly believe that face-to-face communication remains irreplaceable.`
      },
      {
        id: "arg-body",
        title: "论证段",
        content: `论证段是议论文的核心，需要提供有力的论据支撑观点。

**PEEL结构**：
• **P**oint（论点）：明确本段中心论点
• **E**vidence（证据）：举例、数据、引用
• **E**xplain（解释）：分析证据与论点的关系
• **L**ink（链接）：回扣主题或过渡到下一段

**常用论据引导词**：
• First and foremost, / To begin with,（首先）
• Furthermore, / In addition,（此外）
• For instance, / Take...as an example,（例如）
• This demonstrates that...（这说明）
• As a result, / Therefore,（因此）

**常见错误**：
• 只列举例子，不分析原因
• 论据与论点脱节
• 缺乏逻辑连接词`
      },
      {
        id: "arg-conclusion",
        title: "结尾段",
        content: `结尾段需要**总结全文并升华主题**，给读者留下深刻印象。

**结构**：
• 重申论点（换种说法，不要原文照抄）
• 总结要点
• 升华或展望

**常用句型**：
• In conclusion, / To sum up, / In summary,...
• It is high time that we...（是时候...了）
• Only by doing... can we...（只有通过...才能...）
• I believe/am convinced that if we..., the world will be a better place.

**注意**：
• 结尾不引入新论点
• 语气可适当加强，但不要夸大
• 字数控制在60-80词左右`
      },
    ]
  },
  {
    id: "narrative",
    title: "记叙文 / 读后续写",
    icon: "books",
    desc: "情节生动，情感真实",
    sections: [
      {
        id: "nar-opening",
        title: "开头与情境",
        content: `记叙文和读后续写的开头需要**快速建立情境，吸引读者**。

**技巧**：
• 环境描写开篇：营造氛围，暗示情感基调
• 动作开篇：直接进入事件，制造悬念
• 对话开篇：生动自然，迅速引入人物

**读后续写注意事项**：
• 仔细分析原文的语气、人物性格、情节走向
• 续写首句必须与原文最后一句自然衔接
• 保持原文人称、时态一致

**常用开头句型**：
• The sun had just set when...（环境开篇）
• Without hesitation, she...（动作开篇）
• "I can't believe it," he whispered...（对话开篇）
• It was a cold winter morning when everything changed.`
      },
      {
        id: "nar-development",
        title: "情节发展与心理描写",
        content: `情节发展需要**有起伏、有转折**，心理描写是拉高档次的关键。

**情节三要素**：
• 冲突/矛盾：制造紧张感
• 转折点：情节峰值，最精彩处
• 解决：问题得到解决或认知改变

**心理描写方法**：
• 直接描写：She felt a wave of anxiety wash over her.
• 动作暗示：Her hands trembled as she reached for the letter.
• 环境烘托：The grey sky seemed to mirror her gloomy mood.
• 内心独白：She kept asking herself, "Why didn't I speak up?"

**高级词汇替换**：
• sad → devastated, heartbroken, melancholy
• happy → elated, overjoyed, thrilled
• walked → strode, trudged, wandered
• said → murmured, exclaimed, confessed`
      },
      {
        id: "nar-ending",
        title: "结尾升华",
        content: `记叙文结尾需要**完成情感升华**，让读者感受到变化与成长。

**升华方式**：
• 情感变化：从消极到积极，或从困惑到顿悟
• 主题点明：通过人物行动或语言暗示主题
• 留白：意味深长的结尾，引发读者思考

**常用结尾句型**：
• At that moment, she realized that...（顿悟型）
• From that day on, nothing would ever be the same.（变化型）
• With a smile, he knew that the hardest part was over.（释然型）
• The experience had taught her more than she had ever expected.（成长型）

**读后续写升华要点**：
• 回应原文的主题（友情、勇气、责任等）
• 人物要有明显的心理/行为变化
• 避免突兀结尾，要有铺垫`
      },
    ]
  },
  {
    id: "applied",
    title: "应用文",
    icon: "mail",
    desc: "格式规范，表达得体",
    sections: [
      {
        id: "app-letter",
        title: "书信 / 邮件",
        content: `书信和邮件是高考应用文最常见的形式，需要**格式正确，语气得体**。

**格式要素**：
• 称呼：Dear + 姓名/称谓,（注意逗号）
• 开头段：说明写信目的
• 正文：分段陈述内容
• 结尾段：表达期望或感谢
• 结束语：Yours sincerely, / Best regards,
• 署名：Li Ming（中国考生统一用）

**开头常用句型**：
• I am writing to express / apply for / invite / recommend...
• I am Li Ming, a student from...
• It is my great pleasure to write to you...

**结尾常用句型**：
• I would appreciate it if you could...
• I look forward to hearing from you.
• Please feel free to contact me if you need further information.
• Thank you for your consideration.`
      },
      {
        id: "app-notice",
        title: "通知 / 倡议书",
        content: `通知和倡议书需要**信息完整，格式清晰**。

**通知格式**：
• 标题：NOTICE（居中大写）
• 正文：时间、地点、内容、要求
• 落款：组织名称 + 日期

**通知常用句型**：
• All students are requested to...
• Please be informed that...
• Anyone who is interested is welcome to...
• For further information, please contact...

**倡议书格式**：
• 称呼：Dear fellow students, / To Whom It May Concern,
• 问题陈述：描述现状或问题
• 倡议内容：具体行动建议
• 号召结尾：呼吁共同行动

**倡议书常用句型**：
• We hereby call on everyone to...
• It is our responsibility to...
• Together, we can make a difference.
• Let us join hands and...`
      },
    ]
  },
  {
    id: "summary",
    title: "概要写作",
    icon: "file-text",
    desc: "精准提炼，简洁表达",
    sections: [
      {
        id: "sum-skills",
        title: "概要写作技巧",
        content: `概要写作要求**准确提炼原文核心信息**，用自己的语言简洁表达。

**四步法**：
1. **通读全文**：把握文章主旨和结构
2. **划分段落**：找出每段核心句
3. **提炼要点**：每段用1-2句话概括
4. **整合成文**：用连接词串联，保持连贯

**注意事项**：
• 字数通常为原文的1/3左右
• 不能照抄原文句子，要换词换句式
• 不加入个人观点
• 保持原文的逻辑顺序

**常用概括句型**：
• The passage mainly discusses...
• According to the author,...
• The text points out that...
• The writer argues/suggests/emphasizes that...
• In conclusion, the article...`
      },
      {
        id: "sum-paraphrase",
        title: "换词换句技巧",
        content: `概要写作的核心技能是**用不同的词汇和句式表达相同的意思**。

**换词方法**：
• 同义词替换：important → significant, crucial
• 上义词替换：dogs and cats → pets
• 概念替换：smartphones → mobile devices

**换句方法**：
• 主动变被动：Scientists discovered... → It was discovered that...
• 分句变从句：He worked hard. He succeeded. → He succeeded because he worked hard.
• 具体变抽象：She cried for hours → She was deeply upset

**常见错误**：
• 直接照抄原文关键词（-2分）
• 遗漏重要信息
• 添加原文没有的内容
• 字数超出要求（通常60词左右）`
      },
    ]
  },
  {
    id: "speech",
    title: "演讲稿",
    icon: "mic",
    desc: "感染力强，逻辑清晰",
    sections: [
      {
        id: "speech-structure",
        title: "演讲稿结构",
        content: `演讲稿需要**有感染力、有逻辑**，同时符合口语化表达风格。

**格式**：
• 称呼：Ladies and gentlemen, / Dear teachers and classmates,
• 开场白：自我介绍 + 引出话题
• 正文：2-3个要点，每点举例说明
• 结语：总结 + 号召
• 感谢：Thank you for your attention.

**开场白技巧**：
• 提问开场：Have you ever wondered...?
• 数据开场：According to a recent survey,...
• 故事开场：Let me share a story with you...
• 名言开场：As someone once said,...

**结语句型**：
• In conclusion, I urge everyone to...
• Let us work together to...
• I believe that with our joint efforts,...
• Thank you, and I hope my speech has inspired you.`
      },
      {
        id: "speech-language",
        title: "演讲语言技巧",
        content: `演讲稿的语言要**生动有力，有节奏感**。

**修辞手法**：
• 排比：Not only..., but also..., and furthermore...
• 反问：Can we afford to ignore this problem?
• 重复：We must act. We must act now. We must act together.
• 对比：While some people..., others...

**感染力词汇**：
• 号召：urge, appeal, call on, encourage
• 强调：crucial, vital, imperative, essential
• 情感：inspiring, moving, heartfelt, passionate

**连接词**：
• 列举：First of all, / Secondly, / Last but not least,
• 举例：For example, / To illustrate, / Consider this:
• 转折：However, / On the other hand,
• 总结：In a word, / To conclude,`
      },
    ]
  },
  {
    id: "expository",
    title: "说明文",
    icon: "search",
    desc: "客观准确，条理清晰",
    sections: [
      {
        id: "exp-structure",
        title: "说明文结构",
        content: `说明文需要**客观、准确、条理清晰**地介绍事物或现象。

**常见结构**：
• 总-分-总：先概述，再分点说明，最后总结
• 时间顺序：按发展历程介绍
• 空间顺序：按位置关系介绍
• 逻辑顺序：按重要程度或因果关系介绍

**开头句型**：
• ... is one of the most... in the world.
• Have you ever wondered how/why...?
• ... plays an important role in our daily lives.
• In this article, I will explain...

**分点说明句型**：
• One of the main features of... is...
• Another important aspect is...
• It is also worth mentioning that...
• In terms of..., ...`
      },
      {
        id: "exp-language",
        title: "说明文语言特点",
        content: `说明文语言要求**准确、简洁、客观**，避免主观判断。

**客观表达**：
• 使用被动语态：It is believed that... / ... is known as...
• 使用数据：Studies show that... / According to statistics,...
• 避免第一人称：用 one 代替 I

**准确表达**：
• 定义句：... is defined as... / ... refers to...
• 分类句：... can be divided into... / There are mainly two types of...
• 比较句：Compared with..., ... is more...

**常用说明文词汇**：
• 功能：function, purpose, role, serve as
• 特征：feature, characteristic, property
• 过程：process, procedure, step, stage
• 原因：due to, owing to, as a result of
• 影响：affect, influence, impact, effect`
      },
    ]
  },
];

function renderInlineStrong(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function StructureContent({ user }) {
  const [activeType, setActiveType] = useState(null);
  const [openSections, setOpenSections] = useState(new Set());
  const [saveState, setSaveState] = useState({ sectionId: "", status: "" });

  function toggleSection(id) {
    const isOpen = openSections.has(id);
    const next = new Set(openSections);
    isOpen ? next.delete(id) : next.add(id);
    setOpenSections(next);
    if (!isOpen && user?.id && activeType) {
      setSaveState({ sectionId: id, status: "saving" });
      writingProgressAPI.saveStructureProgress({ typeId: activeType, sectionId: id })
        .then(() => setSaveState({ sectionId: id, status: "saved" }))
        .catch(() => setSaveState({ sectionId: id, status: "error" }));
    }
  }

  const selected = WRITING_STRUCTURES.find(s => s.id === activeType);

  return (
    <div className="wr-structure">
      <div className="wr-structure__types">
        {WRITING_STRUCTURES.map(type => (
          <button
            key={type.id}
            type="button"
            className={`wr-structure__type-card ${activeType === type.id ? "active" : ""}`}
            onClick={() => { setActiveType(type.id); setOpenSections(new Set()); }}
          >
            <span className="wr-structure__type-icon"><AppIcon name={type.icon} size={22} /></span>
            <span className="wr-structure__type-title">{type.title}</span>
            <span className="wr-structure__type-desc">{type.desc}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="wr-structure__content">
          <div className="wr-structure__content-header">
            <span><AppIcon name={selected.icon} size={24} /></span>
            <h2>{selected.title}</h2>
            <p>{selected.desc}</p>
          </div>
          <div className="wr-structure__sections">
            {selected.sections.map(section => {
              const isOpen = openSections.has(section.id);
              const lines = section.content.split("\n");
              return (
                <div key={section.id} className="wr-structure__section">
                  <button
                    type="button"
                    className={`wr-structure__section-btn ${isOpen ? "is-open" : ""}`}
                    onClick={() => toggleSection(section.id)}
                  >
                    <span>{isOpen ? "−" : "+"}</span>
                    <span>{section.title}</span>
                    {saveState.sectionId === section.id && saveState.status && (
                      <span style={{ marginLeft: "auto", fontSize: 12, color: saveState.status === "error" ? "#b02020" : "#8a7d6e" }}>
                        {saveState.status === "saving" ? "保存中..." : saveState.status === "saved" ? "已记录" : "记录失败"}
                      </span>
                    )}
                  </button>
                  {isOpen && (
                    <div className="wr-structure__section-body">
                      {lines.map((line, i) => {
                        if (!line.trim()) return <br key={i} />;
                        const content = renderInlineStrong(line);
                        if (line.trim().startsWith("•")) {
                          return <p key={i} className="gc-content__bullet">{content}</p>;
                        }
                        if (/^\d+\./.test(line.trim())) {
                          return <p key={i} className="gc-content__numbered">{content}</p>;
                        }
                        return <p key={i} className="gc-content__para">{content}</p>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selected && (
        <div className="wr-structure__empty">
          <p>选择左侧文体开始学习</p>
        </div>
      )}
    </div>
  );
}

export default function WritingRefineStructurePage({
  onNavigate, user, onLoginClick, onRegisterClick, onAccountClick, navigateGuestPage,
  hideTopBar = false}) {
  const pageRef = useScrollReveal();

  function handleLogin() {
    if (onLoginClick) { onLoginClick(); return; }
    onNavigate?.("auth");
  }
  function handleRegister() {
    if (onRegisterClick) { onRegisterClick(); return; }
    onNavigate?.("auth");
  }

  return (
    <div className={`writing-studio-shell${user ? "" : " writing-studio-shell--guest"}`} ref={pageRef}>
      {!hideTopBar && (user ? (
        <WritingTopBar
          user={user}
          onNavigate={onNavigate}
          activePage="writing-refine-structure"
          onAccountClick={onAccountClick}
        />
      ) : (
        <GuestTopBar
          onLogin={handleLogin}
          onRegister={handleRegister}
          onNavigate={onNavigate || navigateGuestPage}
          activePage="writing-refine-structure"
        />
      ))}
      <main className="wr-refine-page">
        <PageHero eyebrow="筑巢写作 · 写作建构" title="胸有成竹，下笔有神。" description="分文体讲解写作框架，掌握高分写法" />
        <section className="wr-refine-content">
          <StructureContent user={user} />
        </section>
        {user?.role === 'teacher' && (
          <section style={{ padding: '0 24px 40px' }}>
            <ModuleAssignmentSection user={user} moduleTypes={WRITING_REFINE_STRUCTURE_TYPES} accentColor="#a0522d" />
          </section>
        )}
      </main>
    </div>
  );
}
