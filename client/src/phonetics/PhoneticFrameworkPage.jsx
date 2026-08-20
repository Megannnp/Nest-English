import { useState } from "react";

import PhoneticAnnotatorPanel from "./PhoneticAnnotatorPanel.jsx";
import PhoneticQuiz from "./PhoneticQuiz.jsx";
import PhoneticTopBar from "./PhoneticTopBar.jsx";
import PhoneticWordLookupPanel from "./PhoneticWordLookupPanel.jsx";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import useTTS from "../hooks/useTTS.js";
import "./phonetics.css";

function renderInlineStrong(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function TopicBody({ body }) {
  const lines = body.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        if (line.trim().startsWith("•")) {
          return <p key={i} className="ph-framework-card__topic-bullet">{renderInlineStrong(line)}</p>;
        }
        return <p key={i}>{renderInlineStrong(line)}</p>;
      })}
    </>
  );
}

const TEA_PARTY_STORY = {
  id: "tea-party",
  title: "The Tea Party",
  summary: "1773年，美国殖民者为反对英国征税，将英国茶叶倒入波士顿港，成为美国独立战争的重要导火索。",
  sentences: [
    {
      text: "In the 18th century, many people lived in the American colonies.",
      annotations: ["段落起点：开头放慢，century 后短停顿。", "信息焦点：18th century、American colonies。"],
    },
    {
      text: "At that time, they bought tea from Britain.",
      annotations: ["篇章连贯：At that time 承接时间背景。", "信息焦点：tea、Britain。"],
    },
    {
      text: "However, Britain asked them to pay more taxes on tea, so many people thought this was unfair.",
      annotations: ["篇章连贯：However 转折，so 引出结果。", "信息焦点：more taxes、unfair。", "段落节奏：逗号处停顿，转折后语气加重。"],
    },
    {
      text: "One night, two friends were talking near Boston Harbor.",
      annotations: ["段落节奏：新场景开始，One night 后停顿。", "信息焦点：two friends、Boston Harbor。"],
    },
    {
      text: "John: Why do we have to pay so much tax?",
      annotations: ["表达态度：疑问句用升调，so much tax 加重。"],
    },
    {
      text: "Mike: Because Britain makes the rules.",
      annotations: ["表达态度：Because 后稍停，rules 用降调收束。"],
    },
    {
      text: "John: But we don’t think it’s fair.",
      annotations: ["篇章连贯：But 表示反驳。", "信息焦点：don’t、fair。"],
    },
    {
      text: "Mike: We must do something.",
      annotations: ["表达态度：must 重读，语气坚定。"],
    },
    {
      text: "Later that night, many people went onto the ships and threw the tea into the sea.",
      annotations: ["段落节奏：Later that night 后停顿，动作链条保持连贯。", "信息焦点：ships、threw、sea。"],
    },
    {
      text: "As a result, this event became known as the Boston Tea Party.",
      annotations: ["篇章连贯：As a result 引出结果。", "信息焦点：Boston Tea Party。"],
    },
    {
      text: "A few years later, America became an independent country.",
      annotations: ["段落收束：A few years later 后停顿，句末降调。", "信息焦点：independent country。"],
    },
  ],
};

const DISCOURSE_STORIES = [TEA_PARTY_STORY];

function PlayStoryButton({ id, text, label, playingKey, loadingKey, onPlay }) {
  const active = playingKey === id;
  const loading = loadingKey === id;

  return (
    <button
      type="button"
      className={`ph-story-play${active ? " is-playing" : ""}`}
      onClick={() => onPlay(id, text, 0.8)}
      disabled={loading}
      aria-label={active ? "停止播放" : label}
    >
      {loading ? "…" : active ? "■" : "▶"}
      <span>{label}</span>
    </button>
  );
}

function DiscourseStoryBrowser({ stories }) {
  const [selectedId, setSelectedId] = useState(stories[0]?.id || "");
  const selected = stories.find((story) => story.id === selectedId) || stories[0];
  const { play, playSequence, playingKey, loadingKey, unsupported, errorMessage } = useTTS();
  if (!selected) return null;

  const fullText = selected.sentences.map((sentence) => sentence.text);
  const playFullStory = playSequence || play;

  return (
    <div className="ph-story-browser">
      <div className="ph-story-list" aria-label="故事列表">
        {stories.map((story) => (
          <button
            type="button"
            key={story.id}
            className={`ph-story-list__item${story.id === selected.id ? " is-active" : ""}`}
            onClick={() => setSelectedId(story.id)}
          >
            <span>{story.title}</span>
            <small>{story.sentences.length} 句 · 查看故事和标注</small>
          </button>
        ))}
      </div>

      <div className="ph-story-detail">
        <div className="ph-story-detail__head">
          <div>
            <h3>{selected.title}</h3>
            <p>{selected.summary}</p>
          </div>
          <PlayStoryButton
            id={`story-${selected.id}-full`}
            text={fullText}
            label="播放全文"
            playingKey={playingKey}
            loadingKey={loadingKey}
            onPlay={playFullStory}
          />
        </div>

        {unsupported ? (
          <div className="ph-annot-tts-warning" role="status">
            {errorMessage || "语音服务暂时不可用，请稍后重试或检查网络连接。"}
          </div>
        ) : null}

        <div className="ph-story-sentences">
          {selected.sentences.map((sentence, index) => (
            <article className="ph-story-sentence" key={`${selected.id}-${index}`}>
              <PlayStoryButton
                id={`story-${selected.id}-${index}`}
                text={sentence.text}
                label="播放"
                playingKey={playingKey}
                loadingKey={loadingKey}
                onPlay={play}
              />
              <div>
                <p className="ph-story-sentence__text">{sentence.text}</p>
                <ul className="ph-story-sentence__notes">
                  {sentence.annotations.map((annotation) => (
                    <li key={annotation}>{annotation}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

const PAGE_CONTENT = {
  syllable: {
    activePage: "phonetics-syllable",
    eyebrow: "筑巢语音 · 音节",
    title: "拆清音节结构。",
    description: "先理解音节是什么，再学习音节分类。",
    sections: [
      {
        title: "总览",
        topics: [
          {
            heading: "音节是什么",
            body: "**音素**是英语最小的发音单位，分为元音和辅音两类；**音节**由音素组合而成，是单词拼读的基本单元。\n• 音节的辅音搭配方式很多：元、辅元、元辅、辅元辅、辅辅元辅、辅元辅辅等\n• 但有一条规律始终不变：一个音节必须包含一个元音音素，辅音音素可以有，也可以没有",
          },
          {
            heading: "怎么数音节",
            body: "数音节数的是**元音音素**，不是元音字母。一个单词里有几个元音音素，通常就有几个音节：\n• cat /kæt/ 只有一个元音音素 /æ/，是单音节词\n• paper /ˈpeɪpə/ 有 /eɪ/ 和 /ə/ 两个元音音素，是双音节词\n• banana /bəˈnɑːnə/ 有 /ə/、/ɑː/、/ə/ 三个元音音素，是三音节词\n要注意，两个甚至三个元音字母有时只对应一个元音音素，这些单词元音字母虽然不止一个，却都只有一个音节：\n• rain 中的 ai 只发 /eɪ/\n• boat 中的 oa 只发 /əʊ/\n• team 中的 ea 发 /iː/\n• food 中的 oo 发 /uː/\n判断音节数量时，应先找出单词中的元音字母组合，再结合音标确认它对应的元音音素数量。",
          },
          {
            heading: "怎么划分音节",
            body: "划分音节时先按拼写规律初步切分，再用音标验证发音，最常用的两条规律是：\n• 两个元音字母之间只有一个辅音字母时，辅音通常归入后一个音节，如 pa-per /ˈpeɪ-pə/、ti-ger /ˈtaɪ-ɡə/、mu-sic /ˈmjuː-zɪk/、ro-bot /ˈrəʊ-bɒt/、stu-dent /ˈstjuː-dənt/\n• 两个元音字母之间是两个相同的辅音字母时，从两个辅音中间切开，如 rab-bit /ˈræb-ɪt/、hap-py /ˈhæp-i/、bet-ter /ˈbet-ə/、sum-mer /ˈsʌm-ə/、lit-tle /ˈlɪt-əl/",
          },
        ],
        quiz: [
          {
            id: "syl-overview-q1",
            question: "一个英语音节必须包含什么？",
            options: ["A. 一个辅音音素", "B. 一个元音音素", "C. 至少两个元音字母", "D. 一个重音符号"],
            answer: "B",
            explanation: "一个音节必须包含一个元音音素，辅音音素可以有，也可以没有——这是划分音节最核心的规律。",
            optionsAnalysis: {
              A: "【错误】辅音音素不是音节的必要条件，很多音节（如 a、I）根本没有辅音。",
              B: "【正确】元音音素是音节的核心，无论辅音怎么搭配，都必须有且仅有对应数量的元音音素。",
              C: "【错误】元音字母数量不等于元音音素数量，如 rain 有两个元音字母却只有一个元音音素。",
              D: "【错误】重音符号标记的是哪个音节读得响亮，不是音节存在的必要条件。",
            },
          },
          {
            id: "syl-overview-q2",
            question: "单词 rain /reɪn/ 为什么只有一个音节？",
            options: ["A. ai 是两个元音字母，对应两个元音音素", "B. ai 两个元音字母只对应一个元音音素 /eɪ/", "C. rain 里没有元音字母", "D. r 本身就是元音"],
            answer: "B",
            explanation: "数音节数的是元音音素而不是元音字母，rain 中的 ai 只发一个元音音素 /eɪ/，所以整词只有一个音节。",
            optionsAnalysis: {
              A: "【错误】音标 /reɪn/ 中只有一个元音音素 /eɪ/，字母数量不能直接当作音素数量。",
              B: "【正确】两个元音字母组合有时只对应一个元音音素，判断音节数要以音标为准。",
              C: "【错误】rain 有元音字母 a、i，只是它们合起来只发一个音。",
              D: "【错误】r 是辅音字母，不是元音。",
            },
          },
          {
            id: "syl-overview-q3",
            question: "pa-per /ˈpeɪ-pə/ 划分音节时，为什么辅音 p 归入第二个音节？",
            options: ["A. 两个元音字母之间只有一个辅音字母，辅音通常归入后一个音节", "B. 两个元音字母之间是两个相同的辅音字母", "C. p 是不发音字母", "D. 音节划分完全没有规律"],
            answer: "A",
            explanation: "paper 中 a 和 e 之间只有一个辅音字母 p，按规律该辅音归入后一个音节，读作 pa-per。",
            optionsAnalysis: {
              A: "【正确】这正是最常用的音节划分规律之一：单辅音夹在两个元音字母之间时，归入后一个音节。",
              B: "【错误】这条规律对应的是 rabbit、better 这类双写辅音的情况，与 paper 不同。",
              C: "【错误】p 在 paper 中是发音的，并非不发音字母。",
              D: "【错误】音节划分有明确的拼写规律，可以结合音标验证。",
            },
          },
        ],
      },
      {
        title: "分类",
        topics: [
          {
            heading: "开音节与闭音节",
            body: "音节按元音后面是否有辅音收尾分为**开音节**和**闭音节**。\n• 绝对开音节本身就以元音音素结尾，如 he、she、go、no，以及 pa-per、ti-ger、mu-sic 的首音节\n• 相对开音节是元音字母+辅音字母+不发音的 e 结构，如 name、these、bike、home、cute，末尾的 e 不发音，但让前面的元音读字母音\n• 闭音节是元音后紧跟一个或多个辅音，元音因此读短元音，如单音节词 cat /kæt/、pen /pen/、sit /sɪt/、dog /dɒɡ/、cup /kʌp/，以及 rab-bit、bet-ter、sum-mer、lit-tle 的首音节\n判断方法：先划分出音节，再看元音字母后面有没有辅音——没有辅音，或结尾是不发音的 e，就是开音节；有辅音收尾，就是闭音节。",
          },
          {
            heading: "主重读音节与次重读音节",
            body: "英语单词的音节读法并不平均：\n• 读得最响亮、最清楚的音节是**主重读音节**，音标中用左上角的 ˈ 标出，如 banana /bəˈnɑːnə/、computer /kəmˈpjuːtər/\n• 音节较多的单词（四五个音节以上）往往还有一个**次重读音节**，读得稍微突出、但不及主重读明显，音标中用左下角的 ˌ 标出，如 education /ˌedjuˈkeɪʃən/、communication /kəˌmjuːnɪˈkeɪʃən/\n掌握重读位置，是读准多音节单词、说出地道语调的基础。",
          },
        ],
        quiz: [
          {
            id: "syl-category-q1",
            question: "单词 cup /kʌp/ 属于什么音节类型？",
            options: ["A. 开音节，因为以字母结尾", "B. 闭音节，因为元音后紧跟辅音，元音读短音", "C. 开音节，因为元音读字母本身的音", "D. 无法判断"],
            answer: "B",
            explanation: "cup 中元音 u 后面紧跟辅音 p 收尾，元音读短元音 /ʌ/，属于典型的闭音节。",
            optionsAnalysis: {
              A: "【错误】判断开闭音节看的是元音后面有没有辅音收尾，不是单词以什么字母结尾。",
              B: "【正确】元音后有辅音收尾、元音读短音，正是闭音节的定义。",
              C: "【错误】cup 中的 u 读短元音 /ʌ/，不是字母本身的音 /juː/。",
              D: "【错误】结合拼写和音标完全可以判断：这是闭音节。",
            },
          },
          {
            id: "syl-category-q2",
            question: "单词 cute /kjuːt/ 中的 u 为什么读字母本身的音？",
            options: ["A. 其结构是元音字母+辅音字母+不发音的 e，属于相对开音节", "B. 因为它是闭音节", "C. 因为 c 是元音字母", "D. 因为词尾有重读符号"],
            answer: "A",
            explanation: "cute 是元音字母+辅音字母+不发音字母 e 的结构，末尾 e 不发音，但让前面的 u 读字母音 /juː/，属于相对开音节。",
            optionsAnalysis: {
              A: "【正确】这是相对开音节的典型结构，末尾的 e 是“不发音但起作用”的标志。",
              B: "【错误】闭音节的元音应读短音，而 cute 中的 u 读的是字母音，说明不是闭音节。",
              C: "【错误】c 是辅音字母，与元音是否读字母音无关。",
              D: "【错误】重读符号标记的是音节的响亮程度，不是元音读字母音的原因。",
            },
          },
          {
            id: "syl-category-q3",
            question: "音标 /kəmˈpjuːtər/ 中 ˈ 标在 pjuː 前，说明什么？",
            options: ["A. pjuː 是次重读音节", "B. pjuː 是主重读音节，读得最响亮清楚", "C. 这个词没有重音", "D. ˈ 表示这是闭音节"],
            answer: "B",
            explanation: "音标中左上角的 ˈ 标记的是主重读音节，即整个单词中读得最响亮、最清楚的音节。",
            optionsAnalysis: {
              A: "【错误】次重读音节用左下角的 ˌ 标记，与 ˈ 不同。",
              B: "【正确】ˈ 是主重读符号，标在音节前表示该音节是主重读音节。",
              C: "【错误】computer 明确标出了重音符号，说明它是有重音的。",
              D: "【错误】ˈ 与开闭音节无关，只标记重读位置。",
            },
          },
        ],
      },
    ],
  },
  sentence: {
    activePage: "phonetics-sentence",
    eyebrow: "筑巢语音 · 句子",
    title: "读出句子的节奏。",
    description: "句子训练先分韵律，再处理真实语流中的连读、同化和弱化。",
    sections: [
      {
        title: "韵律",
        topics: [
          {
            heading: "重读与弱读",
            body: "英语句子的重音落在承载意义的词与不承载意义的词上，两者交替出现，形成了英语特有的节奏感。\n• **实词重读**：名词、实义动词、形容词、副词、疑问词等，读得响亮、清晰、时值长\n• **虚词弱读**：冠词、介词、连词、助动词、人称代词、be 动词等，元音常央化为 /ə/，读得轻而短",
          },
          {
            heading: "停顿",
            body: "朗读时不是逐词停顿，而是按**意群**（表达一个完整意思的词组）为单位断句。\n• 常见的断句位置：主语与谓语之间、并列成分之间、从句边界处\n合理的意群停顿能帮助听者更容易抓住句子结构和信息重点。",
          },
          {
            heading: "语调",
            body: "句子末尾的语调走向携带语气信息：\n• **降调**：陈述句、特殊疑问句、祈使句结尾，表示肯定和完结\n• **升调**：一般疑问句、列举未尽、礼貌请求等结尾，表示疑问或话未说完",
          },
        ],
        quiz: [
          {
            id: "sen-rhythm-q1",
            question: "英语句子中，哪类词通常重读？",
            options: ["A. 冠词、介词、连词等虚词", "B. 名词、实义动词、形容词等实词", "C. 所有单词都同等重读", "D. 只有句首单词重读"],
            answer: "B",
            explanation: "承载意义的实词——名词、实义动词、形容词、副词、疑问词等——通常重读，虚词一般弱读。",
            optionsAnalysis: {
              A: "【错误】冠词、介词、连词、助动词、人称代词、be 动词等虚词通常弱读，不是重读对象。",
              B: "【正确】实词承载句子的主要意义，读得响亮、清晰、时值长。",
              C: "【错误】英语句子重读与弱读交替出现，并非所有单词同等重读。",
              D: "【错误】重读由词性和意义决定，与词在句中的位置无关。",
            },
          },
          {
            id: "sen-rhythm-q2",
            question: "朗读英语句子时，通常按什么为单位停顿？",
            options: ["A. 逐个单词停顿", "B. 意群（表达一个完整意思的词组）", "C. 每隔三个单词停顿一次", "D. 只在句末停顿"],
            answer: "B",
            explanation: "朗读按意群断句，例如主语与谓语之间、并列成分之间、从句边界处，能帮助听者更容易抓住句子结构。",
            optionsAnalysis: {
              A: "【错误】逐词停顿会破坏句子的自然节奏，也不符合英语朗读习惯。",
              B: "【正确】意群是表达完整意思的词组，是句子朗读断句的自然单位。",
              C: "【错误】停顿位置由句子结构和意义决定，不是固定的单词数量。",
              D: "【错误】句子内部同样需要合理停顿，不能只在句末停顿。",
            },
          },
          {
            id: "sen-rhythm-q3",
            question: "一般疑问句结尾通常使用什么语调？",
            options: ["A. 降调，表示肯定和完结", "B. 升调，表示疑问或话未说完", "C. 平调，没有起伏", "D. 没有固定规律"],
            answer: "B",
            explanation: "一般疑问句、列举未尽、礼貌请求等结尾通常用升调，表示疑问或话未说完；陈述句、特殊疑问句、祈使句多用降调。",
            optionsAnalysis: {
              A: "【错误】降调对应的是陈述句、特殊疑问句、祈使句等表示肯定完结的语气。",
              B: "【正确】一般疑问句结尾用升调，向听者传达疑问、待确认的语气。",
              C: "【错误】语调是有明确升降走向的，不是平调。",
              D: "【错误】不同句型的语调走向有比较稳定的规律可循。",
            },
          },
        ],
      },
      {
        title: "语流现象",
        topics: [
          {
            heading: "连读",
            body: "前一个词以辅音音素结尾、后一个词以元音音素开头，且中间没有停顿时，两个音自然连读成一个音节。\n• 如 an apple 读作 /ə.ˈnæpl/\n• 元音与元音相邻时，也可能借助 /w/ 或 /j/ 过渡音连读",
          },
          {
            heading: "失去爆破",
            body: "**爆破音**（/p/ /b/ /t/ /d/ /k/ /g/）后面紧跟另一个辅音时，前一个爆破音只完成发音部位的准备动作，不再爆破送气，听感上像被“吞掉”，如 good boy 中的 /d/。",
          },
          {
            heading: "同化",
            body: "词尾的 /t/ /d/ /s/ /z/ 遇到下一个词开头的 /j/（如 you、your）时，两个音会融合成新的音：\n• /t/+/j/ → /tʃ/\n• /d/+/j/ → /dʒ/\n• /s/+/j/ → /ʃ/\n• /z/+/j/ → /ʒ/\ndid you 的整体读音接近 /dɪdʒə/。",
          },
          {
            heading: "其他",
            body: "口语中还有几种常见弱化现象：\n• 非重读音节中的 /t/ 可能读成闪音（如 better 中接近 /d/）或喉塞音（如 not now）\n• 固定搭配常约化成新读法，如 want to→wanna、going to→gonna\n• 助动词和 be 动词常缩读，如 it is→it's\n• 相邻辅音相近或相同时，可能整体省略一个音，如 next day 中的 t 常被省略",
          },
        ],
        quiz: [
          {
            id: "sen-flow-q1",
            question: "an apple 读成连读的原因是什么？",
            options: ["A. 前词以辅音音素结尾，后词以元音音素开头，中间无停顿", "B. 两个词都以元音开头", "C. an 和 apple 之间必须有停顿", "D. 连读只发生在重读词之间"],
            answer: "A",
            explanation: "前一个词以辅音音素结尾、后一个词以元音音素开头，且中间没有停顿时，两个音自然连读成一个音节。",
            optionsAnalysis: {
              A: "【正确】这正是连读发生的条件：辅音结尾 + 元音开头 + 无停顿。",
              B: "【错误】an 以辅音音素 /n/ 结尾，apple 以元音音素 /æ/ 开头，并非两个都以元音开头。",
              C: "【错误】恰恰相反，中间没有停顿才会连读。",
              D: "【错误】连读与词是否重读无关，只与音素的性质和是否停顿有关。",
            },
          },
          {
            id: "sen-flow-q2",
            question: "good boy 中的 /d/ 为什么听起来像被“吞掉”？",
            options: ["A. /d/ 后紧跟另一个辅音，只完成发音部位的准备动作，不再爆破送气", "B. /d/ 是不发音字母", "C. good 是弱读词", "D. 两个词之间发生了连读"],
            answer: "A",
            explanation: "爆破音后面紧跟另一个辅音时会失去爆破：前一个爆破音只做发音部位的准备，不再送气爆破，听感上被“吞掉”。",
            optionsAnalysis: {
              A: "【正确】这就是失去爆破的定义：爆破音+辅音时，前者不完全爆破。",
              B: "【错误】/d/ 在 good 中本身是发音的，只是这里发音方式发生了变化。",
              C: "【错误】good 是实义词，语义上并不弱读，这里的现象是失去爆破而非弱读。",
              D: "【错误】连读发生在辅音+元音之间，good boy 是辅音+辅音，属于失去爆破而非连读。",
            },
          },
          {
            id: "sen-flow-q3",
            question: "did you 中 /d/ + /j/ 融合成 /dʒ/，属于哪种语流现象？",
            options: ["A. 失去爆破", "B. 同化：/d/+/j/ 融合成新音 /dʒ/", "C. 单纯弱读", "D. 连读"],
            answer: "B",
            explanation: "词尾的 /d/ 遇到下一个词开头的 /j/ 时会融合成新的音 /dʒ/，did you 的整体读音接近 /dɪdʒə/，这是典型的同化现象。",
            optionsAnalysis: {
              A: "【错误】失去爆破指爆破音后接另一个辅音时不送气，与 /d/+/j/ 融合成新音不同。",
              B: "【正确】/d/+/j/→/dʒ/ 正是同化规律中的一条，did you /dɪdʒə/ 是典型例子。",
              C: "【错误】弱读指虚词元音央化读轻读短，这里的变化是音素融合，不只是弱读。",
              D: "【错误】连读是保留两个原音素、自然衔接；这里的 /d/ 和 /j/ 已经融合成了新的音素。",
            },
          },
        ],
      },
    ],
  },
  discourse: {
    activePage: "phonetics-discourse",
    eyebrow: "筑巢语音 · 语篇",
    title: "把语音放进语篇。",
    description: "先搭建语篇层面的朗读框架，后续接入段落节奏、信息焦点和篇章表达。",
    sections: [
      {
        title: "语篇",
        stories: DISCOURSE_STORIES,
      },
    ],
  },
};

export default function PhoneticFrameworkPage({
  mode,
  onNavigate,
  onLoginClick,
  onRegisterClick,
  user,
  onAccountClick,
  activePage,
  hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const content = PAGE_CONTENT[mode] || PAGE_CONTENT.syllable;
  const currentPage = activePage || content.activePage;

  return (
    <div className="ph-page" ref={pageRef}>
      {!hideTopBar && (
        <PhoneticTopBar
          onNavigate={onNavigate}
          onLogin={onLoginClick}
          onRegister={onRegisterClick}
          user={user}
          onAccountClick={onAccountClick}
          activePage={currentPage}
        />
      )}
      <main className="ph-framework-page">
        <PageHero
          eyebrow={content.eyebrow}
          title={content.title}
          description={content.description}
        />
        {mode === "sentence" || mode === "discourse" ? (
          <PhoneticAnnotatorPanel mode={mode} user={user} />
        ) : null}
        {mode === "syllable" ? <PhoneticWordLookupPanel /> : null}
        <section className="ph-framework-grid studio-reveal studio-reveal--delay-1">
          {content.sections.map((section) => (
            <article className="ph-framework-card" key={section.title}>
              <h2>{section.title}</h2>
              {section.stories ? (
                <DiscourseStoryBrowser stories={section.stories} />
              ) : (
                <div className="ph-framework-card__topics">
                  {section.topics.map((topic) => (
                    <div className="ph-framework-card__topic" key={topic.heading}>
                      <h3>{topic.heading}</h3>
                      <TopicBody body={topic.body} />
                    </div>
                  ))}
                </div>
              )}
              {section.quiz && section.quiz.length > 0 && (
                <PhoneticQuiz quiz={section.quiz} />
              )}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
