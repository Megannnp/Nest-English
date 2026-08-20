import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PHONETIC_CAMP_DAYS } from "./phoneticCampData.js";
import PhoneticCampPage from "./PhoneticCampPage.jsx";

describe("PhoneticCampPage", () => {
  it("keeps gradable choice and matching answers selectable", () => {
    const invalidAnswers = [];

    for (const day of PHONETIC_CAMP_DAYS) {
      for (const section of day.exerciseSections || []) {
        for (const item of section.items || []) {
          if (typeof item !== "object" || !item.answer) continue;
          if (item.options && !item.options.includes(item.answer)) {
            invalidAnswers.push(`${day.day} ${section.title} ${item.prompt}`);
          }
          if (section.type === "matchSelect" && section.options && !section.options.includes(item.answer)) {
            invalidAnswers.push(`${day.day} ${section.title} ${item.prompt}`);
          }
        }
      }
    }

    expect(invalidAnswers).toEqual([]);
  });

  it("keeps Day 1 listening answers aligned with the supplied answer key", () => {
    const day1Listening = PHONETIC_CAMP_DAYS[0].exerciseSections.find((section) => section.id === "day1-listening-radar");

    expect(day1Listening.items.map((item) => item.answer)).toEqual([
      "/iː/",
      "/uː/",
      "/æ/",
      "/ɔː/",
      "/aʊ/",
      "/aɪ/",
      "/ɔɪ/",
      "/ɪə/",
    ]);
  });

  it("renders a directory and opens Day 1 without expanding every day", () => {
    render(<PhoneticCampPage hideTopBar />);

    expect(screen.getByText("按目录进入每天的语音训练。")).toBeInTheDocument();
    expect(screen.getByText("每一天独立呈现讲义题目；完成全部关卡后统一显示答案和参考标注。")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "语音训练营目录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Day 1.*解锁元音小家/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /补充练.*拓展英语故事练习/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /附录.*常见字母组合的发音/ })).toBeInTheDocument();

    expect(screen.queryByRole("heading", { name: "解锁元音小家" })).not.toBeInTheDocument();
    expect(screen.getByText("第一关 听力雷达")).toBeInTheDocument();
    expect(screen.getByText("Day 1 第一关 听力雷达")).toBeInTheDocument();
    expect(screen.queryByText("第五关 音标连连看")).not.toBeInTheDocument();
    expect(screen.getAllByText(/第 1 关 \/ 共 5 关/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Day 2 练习题第一关和第二关录音")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "提交本关" })).not.toBeInTheDocument();
  });

  it("shows answers only after finishing all sections", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 3.*音节拼词魔法/ }));
    screen.getByRole("region", { name: "第一关 音节小侦探" });

    expect(screen.queryByText(/答案：im\/por\/tant；3/)).not.toBeInTheDocument();
    expect(screen.queryByText("第二关 重音工程师")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    expect(screen.getByText("第二关 重音工程师")).toBeInTheDocument();
    expect(screen.queryByText(/答案：im\/por\/tant；3/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "完成" }));
    expect(screen.getAllByText(/important：你的答案 未作答；正确答案 im\/por\/tant；3/).length).toBeGreaterThan(0);
  });

  it("uses click selection for circle detective exercises", () => {
    render(<PhoneticCampPage hideTopBar />);

    screen.getByRole("region", { name: "第一关 听力雷达" });
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    screen.getByRole("region", { name: "第二关 朗读小喇叭" });
    expect(screen.getByText("Day 1 第二关 朗读小喇叭")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));

    const circleSection = screen.getByRole("region", { name: "第三关 圈音侦探" });
    expect(within(circleSection).getByText("① 圈出所有长元音")).toBeInTheDocument();
    expect(within(circleSection).getByText("② 圈出所有双元音")).toBeInTheDocument();
    expect(within(circleSection).queryByText("当前圈选类别")).not.toBeInTheDocument();
    expect(within(circleSection).queryByRole("combobox")).not.toBeInTheDocument();

    fireEvent.click(within(circleSection).getAllByRole("button", { name: "/iː/" })[0]);
    expect(within(circleSection).getByRole("button", { name: /\/iː\/.*圈出/ })).toBeInTheDocument();
    expect(screen.queryByText(/1 \/ 38 正确/)).not.toBeInTheDocument();
  });

  it("uses left and right click connections for matching exercises", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));

    const matchSection = screen.getByRole("region", { name: "第五关 音标连连看" });
    expect(within(matchSection).getByRole("group", { name: "左侧音标" })).toBeInTheDocument();
    expect(within(matchSection).getByRole("group", { name: "右侧单词" })).toBeInTheDocument();
    expect(within(matchSection).queryByRole("combobox")).not.toBeInTheDocument();

    fireEvent.click(within(matchSection).getByRole("button", { name: /\/iː\/.*点击后选择右侧/ }));
    fireEvent.click(within(matchSection).getByRole("button", { name: "选择连线单词：see" }));

    expect(within(matchSection).getByRole("button", { name: /\/iː\/.*已连：see/ })).toBeInTheDocument();
    expect(screen.queryByText(/1 \/ 16 正确/)).not.toBeInTheDocument();
  });

  it("uses drag-and-drop classification zones for category exercises", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));

    const classifySection = screen.getByRole("region", { name: "第四关 分类工程师" });
    const source = within(classifySection).getByRole("button", { name: "/ɑː/" });
    const target = within(classifySection).getByRole("group", { name: "A 家族" });
    const dataTransfer = {
      data: {},
      setData(type, value) {
        this.data[type] = value;
      },
      getData(type) {
        return this.data[type];
      },
    };

    expect(within(classifySection).getByRole("group", { name: "待分类" })).toBeInTheDocument();
    expect(within(classifySection).queryByRole("combobox")).not.toBeInTheDocument();

    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(within(target).getByRole("button", { name: /\/ɑː\/.*A 家族/ })).toBeInTheDocument();
    expect(screen.queryByText(/1 \/ 20 正确/)).not.toBeInTheDocument();
  });

  it("opens Day 3 from the directory without revealing answers early", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 3.*音节拼词魔法/ }));

    expect(screen.queryByRole("heading", { name: "音节拼词魔法" })).not.toBeInTheDocument();
    expect(screen.getByText("第一关 音节小侦探")).toBeInTheDocument();
    expect(screen.getByText("important")).toBeInTheDocument();
    expect(screen.queryByText(/im\/por\/tant/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "提交本关" })).not.toBeInTheDocument();
  });

  it("opens Day 5 with complete exercises and read-only recording assessments", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 5.*破解语流密码/ }));

    expect(screen.getByText("第一关 听力雷达")).toBeInTheDocument();
    expect(screen.queryByText("第二关 失爆侦探")).not.toBeInTheDocument();
    expect(screen.queryByText("第三关 语音小侦探")).not.toBeInTheDocument();
    expect(screen.queryByText("第四关 听写达人")).not.toBeInTheDocument();
    expect(screen.queryByText("连读专项朗读")).not.toBeInTheDocument();
    expect(screen.queryByText("第一关 听力雷达 跟读评估")).not.toBeInTheDocument();
    expect(screen.getAllByText(/第 1 关 \/ 共 4 关/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: "朗读评估" })).toHaveLength(8);
    expect(screen.getAllByRole("button", { name: "开始录音" })).toHaveLength(8);
    expect(screen.queryByPlaceholderText("录音识别结果会显示在这里；也可以手动输入学生朗读内容。")).not.toBeInTheDocument();
    expect(screen.queryByText("录音后自动显示，不支持手动输入。")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    expect(screen.getByText("第二关 失爆侦探")).toBeInTheDocument();
  });

  it("uses realtime ASR support instead of browser SpeechRecognition for camp recording", () => {
    const originalSpeechRecognition = window.SpeechRecognition;
    const originalWebkitSpeechRecognition = window.webkitSpeechRecognition;
    const originalWebSocket = window.WebSocket;
    const originalAudioContext = window.AudioContext;
    const originalMediaDevices = navigator.mediaDevices;
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
    window.WebSocket = function WebSocketStub() {};
    window.AudioContext = function AudioContextStub() {};
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.resolve({}) },
    });

    try {
      render(<PhoneticCampPage hideTopBar />);
      fireEvent.click(screen.getByRole("button", { name: /Day 5.*破解语流密码/ }));

      expect(screen.getAllByRole("button", { name: "开始录音" })[0]).toBeEnabled();
    } finally {
      window.SpeechRecognition = originalSpeechRecognition;
      window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
      window.WebSocket = originalWebSocket;
      window.AudioContext = originalAudioContext;
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: originalMediaDevices,
      });
    }
  });

  it("does not append standalone Day 5 reading-assessment cards after the worksheet sections", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 5.*破解语流密码/ }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));

    expect(screen.getByText("第四关 听写达人")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "完成" }));
    expect(screen.queryByText("连读专项朗读")).not.toBeInTheDocument();
    expect(screen.queryByText("失去爆破专项朗读")).not.toBeInTheDocument();
    expect(screen.getByText("进度：4 / 4")).toBeInTheDocument();
  });

  it("shows an overall score and answer summary after finishing all big sections", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 3.*音节拼词魔法/ }));

    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "完成" }));

    expect(screen.getByText(/进度：/)).toHaveTextContent("进度：4 / 4");
    const summary = screen.getByRole("region", { name: "整体分数与错题总结" });
    expect(summary).toBeInTheDocument();
    expect(within(summary).getByText((_, element) => element.tagName === "STRONG" && element.textContent.includes("0 / 62 正确"))).toHaveTextContent("0 / 62 正确，0 分");
    expect(within(summary).getByText((_, element) => element.tagName === "LI" && element.textContent.includes("第一关 音节小侦探｜important：你的答案 未作答；正确答案 im/por/tant；3"))).toBeInTheDocument();
    expect(within(summary).getByRole("heading", { name: "整体分数与答案总结" })).toBeInTheDocument();
    expect(within(summary).getByRole("heading", { name: "第一关 音节小侦探" })).toBeInTheDocument();
  });

  it("uses word selection for sentence marking exercises", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 4.*掌握句子韵律/ }));
    const stressSection = screen.getByRole("region", { name: "第一关 听力雷达" });

    expect(within(stressSection).getByText("当前标记")).toBeInTheDocument();
    expect(within(stressSection).queryByPlaceholderText("在这里完成标注")).not.toBeInTheDocument();
    fireEvent.click(within(stressSection).getByRole("button", { name: "标记方式：● 重读" }));
    fireEvent.click(within(stressSection).getAllByRole("button", { name: "like" })[0]);

    expect(within(stressSection).getByText("●")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Day 5.*破解语流密码/ }));
    const linkingSection = screen.getByRole("region", { name: "第一关 听力雷达" });
    expect(within(linkingSection).getByRole("button", { name: "标记方式：‿ 连读" })).toBeInTheDocument();
    expect(within(linkingSection).queryByPlaceholderText("输入答案或标注")).not.toBeInTheDocument();
  });

  it("marks Day 5 linking on the space between words", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 5.*破解语流密码/ }));
    const linkingSection = screen.getByRole("region", { name: "第一关 听力雷达" });

    expect(within(linkingSection).queryByRole("button", { name: "Give" })).not.toBeInTheDocument();
    const linkingGaps = within(linkingSection).getAllByRole("button", { name: /标记连读位置/ });
    fireEvent.click(linkingGaps[1]);

    expect(within(linkingSection).getByText("‿")).toBeInTheDocument();
  });

  it("marks Day 5 plosion on the last letter of a word", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 5.*破解语流密码/ }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    const plosionSection = screen.getByRole("region", { name: "第二关 失爆侦探" });

    expect(within(plosionSection).queryByRole("button", { name: "Good" })).not.toBeInTheDocument();
    fireEvent.click(within(plosionSection).getByRole("button", { name: /标记 Good 的最后一个字母 d/ }));

    expect(within(plosionSection).getByText("̚")).toBeInTheDocument();
  });

  it("marks pauses on the space between words", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 4.*掌握句子韵律/ }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    const pauseSection = screen.getByRole("region", { name: "第二关 节奏工程师" });

    expect(within(pauseSection).queryByRole("button", { name: "When" })).not.toBeInTheDocument();
    const pauseGaps = within(pauseSection).getAllByRole("button", { name: /标记停顿位置/ });
    fireEvent.click(pauseGaps[3]);

    expect(within(pauseSection).getByText("/")).toBeInTheDocument();
  });

  it("scores sentence-marking exercises in the final summary", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 5.*破解语流密码/ }));
    const linkingSection = screen.getByRole("region", { name: "第一关 听力雷达" });
    fireEvent.click(within(linkingSection).getByRole("button", { name: "标记方式：‿ 连读" }));
    fireEvent.click(within(linkingSection).getAllByRole("button", { name: /标记连读位置/ })[4]);
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "完成" }));

    const summary = screen.getByRole("region", { name: "整体分数与错题总结" });
    expect(within(summary).getByText((_, element) => element.tagName === "STRONG" && element.textContent.includes("1 / "))).toBeInTheDocument();
    expect(within(summary).getByRole("heading", { name: "第一关 听力雷达" })).toBeInTheDocument();
    expect(within(summary).getByText((_, element) => element.tagName === "LI" && element.textContent.includes("Give it to me.") && element.textContent.includes("正确答案 ‿"))).toBeInTheDocument();
  });

  it("keeps word marks visible while marking pauses in the full challenge", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 4.*掌握句子韵律/ }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    fireEvent.click(screen.getByRole("button", { name: "下一关" }));
    const challengeSection = screen.getByRole("region", { name: "第四关 全能挑战台" });

    fireEvent.click(within(challengeSection).getByRole("button", { name: "标记方式：● 重读" }));
    fireEvent.click(within(challengeSection).getAllByRole("button", { name: "dinner" })[0]);
    fireEvent.click(within(challengeSection).getByRole("button", { name: "标记方式：/ 停顿" }));

    expect(within(challengeSection).getByText("●")).toBeInTheDocument();
    expect(within(challengeSection).getAllByRole("button", { name: /标记停顿位置/ }).length).toBeGreaterThan(0);
  });

  it("opens Day 6 as story notes without student recording assessment", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 6.*走进英语故事/ }));
    expect(screen.getByRole("heading", { name: "The Tea Party" })).toBeInTheDocument();
    expect(screen.queryByText("The Sword in the Stone 朗读")).not.toBeInTheDocument();
    expect(screen.queryByText("The Tea Party 朗读")).not.toBeInTheDocument();
    expect(screen.queryByText("请录音完成朗读；系统会自动生成识别文本，不支持手动输入。")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("录音识别结果会显示在这里；也可以手动输入学生朗读内容。")).not.toBeInTheDocument();
  });

  it("opens Day 7 with student recording assessments", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 7.*成为朗读达人/ }));
    expect(screen.getByText("The Tea Party 朗读")).toBeInTheDocument();
    expect(screen.queryByText("The Sword in the Stone 朗读")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "The Sword in the Stone" }));
    expect(screen.getByText("The Sword in the Stone 朗读")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "The Boy Who Became a President" }));
    expect(screen.getByText("The Boy Who Became a President 朗读")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "From Britain to America" }));
    expect(screen.getByText("From Britain to America 朗读")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "开始录音" })).toHaveLength(1);
  });

  it("opens supplement stories separately with recording assessments", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /补充练.*拓展英语故事练习/ }));
    expect(screen.getByRole("heading", { name: "The Sword in the Stone" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "The Boy Who Became a President" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "From Britain to America" })).toBeInTheDocument();
    expect(screen.getAllByText("The Sword in the Stone").length).toBeGreaterThan(1);
    expect(screen.getByText("The Sword in the Stone 朗读")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "The General Who Dreamed of an Empire" }));
    expect(screen.getByText("The General Who Dreamed of an Empire 朗读")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "开始录音" })).toHaveLength(1);
    expect(screen.queryByRole("region", { name: "答案参考" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "完成本日训练" }));
    expect(screen.getByRole("region", { name: "答案参考" })).toBeInTheDocument();
    expect(screen.getByText("拓展故事核对标准")).toBeInTheDocument();
  });

  it("opens the appendix directory entry", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /附录.*常见字母组合的发音/ }));

    expect(screen.getByRole("heading", { name: "常见字母组合的发音" })).toBeInTheDocument();
    expect(screen.getByText("常见元音字母组合")).toBeInTheDocument();
    expect(screen.getByText("rain, train")).toBeInTheDocument();
    expect(screen.getByText("musician, magician")).toBeInTheDocument();
  });

  it("keeps Day 6 as notes without completion submission", () => {
    render(<PhoneticCampPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /Day 6.*走进英语故事/ }));
    expect(screen.queryByRole("button", { name: "完成本日训练" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "答案参考" })).not.toBeInTheDocument();
  });
});
