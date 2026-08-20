import './testSetup.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  applyAnswers,
  docToText,
  extractAnswers,
  parsePaper,
  validateParseResult,
} from '../scripts/parse-gaokao-paper.mjs';

function makeMod(moduleName, questions, groups = []) {
  return { module: moduleName, sectionTitle: '', groups, questions, materials: [], headerText: '' };
}

function makeGroupQuestion(number, subInGroup, stem = `Question ${number}`) {
  return { number, subInGroup, stem, options: [], answer: null };
}

/* ---------------- extractAnswers ---------------- */

test('extractAnswers extracts 语法填空 byParen words', () => {
  const res = extractAnswers('【答案】（1）engineering（2）functional（3）to（4）closed');
  assert.equal(res.byParen[1], 'engineering');
  assert.equal(res.byParen[2], 'functional');
  assert.equal(res.byParen[3], 'to');
  assert.equal(res.byParen[4], 'closed');
});

test('extractAnswers extracts numbered answers (2023 style)', () => {
  const res = extractAnswers('【答案】21. D    22. D\n【答案】56. arrival  57. confident');
  assert.equal(res.byNumber[21], 'D');
  assert.equal(res.byNumber[22], 'D');
  assert.equal(res.byNumber[56], 'arrival');
  assert.equal(res.byNumber[57], 'confident');
});

test('extractAnswers collects orderLetters from 【解答】 lines', () => {
  const res = extractAnswers('【解答】C\n【解答】AB');
  assert.deepEqual(res.orderLetters, ['C', 'AB']);
});

/* ---------------- applyAnswers（历史 bug 回归） ---------------- */

test('REGRESSION: byParen grammar-fill answers must NOT leak into listening', () => {
  const listeningMod = makeMod('listening', [], [{
    number: 6, points: 1.5,
    questions: [
      makeGroupQuestion(6, 1, 'What will the weather be like today?'),
      makeGroupQuestion(7, 2, 'What is the man going to do?'),
      makeGroupQuestion(8, 3, 'Why is Kathy in California now?'),
      makeGroupQuestion(9, 4, 'What is the relationship between Tom and Fiona?'),
    ],
  }]);
  const answers = extractAnswers('【答案】（1）engineering（2）functional（3）to（4）closed');
  applyAnswers(listeningMod, answers);
  for (const q of listeningMod.groups[0].questions) {
    assert.equal(q.answer, null, `listening q${q.number} must not get grammar-fill answer`);
  }
});

test('REGRESSION: byParen grammar-fill answers must NOT leak into reading', () => {
  const readingMod = makeMod('reading', [], [{
    number: 11, points: 7.5,
    questions: [
      makeGroupQuestion(11, 1, 'What is the aim of the team?'),
      makeGroupQuestion(12, 2, 'What is the lower age limit?'),
      makeGroupQuestion(13, 3, 'What are the volunteers expected to do?'),
    ],
  }]);
  const answers = extractAnswers('【答案】（1）engineering（2）functional（3）to（4）closed');
  applyAnswers(readingMod, answers);
  for (const q of readingMod.groups[0].questions) {
    assert.equal(q.answer, null, `reading q${q.number} must not get grammar-fill answer`);
  }
});

test('byParen answers still apply to languageUse (语法填空/完形)', () => {
  const langMod = makeMod('languageUse', [], [{
    number: 16, points: 15,
    questions: [
      makeGroupQuestion(16, 1),
      makeGroupQuestion(17, 2),
      makeGroupQuestion(18, 3),
    ],
  }]);
  const answers = extractAnswers('【答案】（1）engineering（2）functional（3）to');
  applyAnswers(langMod, answers);
  assert.deepEqual(
    langMod.groups[0].questions.map((q) => q.answer),
    ['engineering', 'functional', 'to']
  );
});

test('reading uses stemTailBySub answers (2024 reading line-tail format)', () => {
  const readingMod = makeMod('reading', [], [{
    number: 11, points: 7.5,
    questions: [
      makeGroupQuestion(11, 1, 'What is the aim?'),
      makeGroupQuestion(12, 2, 'What is the limit?'),
    ],
  }]);
  const answers = extractAnswers('（1）What is the aim？ C\n（2）What is the limit？ B');
  applyAnswers(readingMod, answers);
  assert.deepEqual(
    readingMod.groups[0].questions.map((q) => q.answer),
    ['C', 'B']
  );
});

/* ---------------- validateParseResult ---------------- */

test('validateParseResult rejects grammar-fill words on choice questions', () => {
  const result = {
    modules: [makeMod('listening', [], [{
      number: 6, points: 1.5,
      questions: [{ number: 6, subInGroup: 1, stem: 'S', options: [], answer: 'engineering' }],
    }])],
  };
  const v = validateParseResult(result);
  assert.equal(v.valid, false);
  assert.equal(v.invalid, 1);
  assert.match(v.issues[0].problem, /A-G/);
});

test('validateParseResult accepts valid letter answers on choice questions', () => {
  const result = {
    modules: [
      makeMod('listening', [], [{
        number: 6, points: 1.5,
        questions: [
          { number: 6, subInGroup: 1, stem: 'S', options: [], answer: 'C' },
          { number: 7, subInGroup: 2, stem: 'S', options: [], answer: 'B' },
        ],
      }]),
      makeMod('reading', [{ number: 21, stem: 'R', options: [], answer: 'A' }]),
      makeMod('languageUse', [{ number: 56, stem: 'G', options: [], answer: 'engineering' }]),
      makeMod('writing', [{ number: 18, stem: 'W', options: [], answer: null }]),
    ],
  };
  const v = validateParseResult(result);
  assert.equal(v.valid, true);
  assert.equal(v.invalid, 0);
  assert.equal(v.total, 5);
  assert.equal(v.answered, 4);
});

test('validateParseResult tolerates non-array module shapes (defensive)', () => {
  const v = validateParseResult({ modules: [{ module: 'reading', questions: 20, materials: 4 }] });
  assert.equal(v.valid, true);
  assert.equal(v.total, 0);
});

/* ---------------- docToText ---------------- */

test('docToText reads .txt directly without external tools', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'exam-txt-'));
  try {
    const file = path.join(dir, 'paper.txt');
    await fs.writeFile(file, '第一部分 听力\n1. Hello?', 'utf8');
    const text = await docToText(file);
    assert.equal(text, '第一部分 听力\n1. Hello?');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('docToText honors injected converter for .doc files', async () => {
  const text = await docToText('/tmp/paper.doc', async () => 'converted content');
  assert.equal(text, 'converted content');
});


/* ---------------- parsePaper 端到端 ---------------- */

// 模拟 2020 全国卷III 版式：听力/阅读/语法填空，答案文件中带 2024 式括号单词答案（历史污染源）
const PAPER = `第一部分 听力（共两节，满分30分）
做题时，先将答案标在试卷上。录音内容结束后，你将有两分钟的时间将试卷上的答案转涂到答题卡上。
第一节（共5小题；每小题1.5分，满分7.5分）
听下面5段对话。每段对话后有一个小题，从题中所给的A、B、C三个选项中选出最佳选项。每段对话仅读一遍。
1. Where does the conversation probably take place?
A. In a supermarket. B. In the post office. C. In the street.
2. What did Carl do?
A. He designed a medal. B. He fixed a TV set. C. He took a test.
【答案】1. C  2. B
第二节 听第6段材料，回答第6、7题。
6. What does Bill often do on Friday night?
A. Visit his parents. B. Go to the movies. C. Walk along Broadway.
7. Who watches musical plays most often?
A. Bill. B. Sarah. C. Bill's parents.
【答案】6. B  7. C
第二部分 阅读（共两节，满分37.5分）
第一节 阅读下面短文，从每题所给的A、B、C、D四个选项中选出最佳选项。
HABITAT RESTORATION TEAM
Would you like to help the environment?
21. What is the aim of the Habitat Restoration Team?
A. To plant trees. B. To protect animals. C. To clean rivers.
22. What is the lower age limit for joining the team?
A. 8. B. 10. C. 12.
【答案】21. A  22. C
第三部分 语言运用（共两节，满分30分）
第二节 语法填空（共10小题；每小题1.5分，满分15分）
阅读下面短文，在空白处填入1个适当的单词或括号内单词的正确形式。
56. ______ (engineer)
57. ______ (function)
【答案】56. engineering  57. functional
`;

const ANSWER_FILE = `${PAPER}\n【答案】（1）engineering（2）functional（3）to（4）closed`;

test('parsePaper end-to-end: grammar-fill words never leak into listening/reading', async () => {
  const result = await parsePaper({
    originalPath: 'paper.txt',
    answerPath: 'answer.txt',
    year: '2020',
    region: '全国',
    paper: 'III',
    toText: async (filePath) => (filePath === 'answer.txt' ? ANSWER_FILE : PAPER),
  });

  assert.equal(result.questionCount, 8);
  assert.equal(result.answerCount, 8);
  assert.equal(result.validation.valid, true, `unexpected issues: ${JSON.stringify(result.validation.issues)}`);

  const listening = result.modules.find((m) => m.module === 'listening');
  const reading = result.modules.find((m) => m.module === 'reading');
  const languageUse = result.modules.find((m) => m.module === 'languageUse');

  assert.deepEqual(listening.questions.map((q) => q.answer), ['C', 'B', 'B', 'C']);
  assert.deepEqual(reading.questions.map((q) => q.answer), ['A', 'C']);
  assert.deepEqual(languageUse.questions.map((q) => q.answer), ['engineering', 'functional']);

  for (const q of [...listening.questions, ...reading.questions]) {
    assert.match(String(q.answer), /^[A-G]$/, `choice answer must be a letter: ${JSON.stringify(q.answer)}`);
  }
});


/* ---------------- 2024 连续答案串 + 组分离（本次修复） ---------------- */

test('applyAnswers distributes letter strings one letter per question (CBB → C,B,B)', () => {
  const readingMod = makeMod('reading', [], [{
    number: 11, points: 7.5,
    questions: [
      makeGroupQuestion(11, 1, 'What is the aim?'),
      makeGroupQuestion(12, 2, 'What is the limit?'),
      makeGroupQuestion(13, 3, 'What are the volunteers expected to do?'),
    ],
  }]);
  const answers = { byNumber: {}, byParen: {}, stemTailBySub: {}, orderLetters: ['CBB'], analysisByNumber: {}, analysisFallback: '' };
  applyAnswers(readingMod, answers, ['C', 'B', 'B']);
  assert.deepEqual(readingMod.groups[0].questions.map((q) => q.answer), ['C', 'B', 'B']);
});

test('parsePaper end-to-end: 2024 letter-string format (Q5 kept, groups split, answers per-letter)', async () => {
  const PAPER = `一第一部分 听力 （共两节，满分7.5分）
做题时，先将答案标在试卷上。
第一节 (共5题) 听下面5段对话。
1．（1.5分）What is Kate doing？
A.Boarding a flight.
B.Arranging a trip.
C.Seeing a friend off.
5．（1.5分）When will the next train to Bedford leave？
A.At 9：45.
B.At 10：15.
C.At 11：00.
二第二节 听下面 5 段对话或独白。
6．（3分）（1）What will the weather be like today？
A.Stormy.
B.Sunny.
C.Foggy.
（2）What is the man going to do？
A.Plant a tree.
B.Move his car.
C.Check the map.
7．（4.5分）（1）Why is Kathy in California now？
A.She is on vacation there.
B.She has just moved there.
C.She is doing business there.
（2）What is the relationship between Tom and Fiona？
A.Husband and wife.
B.Brother and sister.
C.Father and daughter.
（3）What does Kathy thank Dave for？
A.Finding her a new job.
B.Sending her a present.
C.Calling on her mother.
三第二部分 阅读 （共两节，满分37.5分）
第一节 阅读下面短文。
HABITAT RESTORATION TEAM
11．（7.5分）（1）What is the aim of the Habitat Restoration Team？
A.To plant trees.
B.To protect animals.
C.To clean rivers.
（2）What is the lower age limit for joining the team？
A.8.
B.10.
C.12.
（3）What are the volunteers expected to do？
A.Work in all weather.
B.Stay at home in rain.
C.Only work indoors.
`;

  const ANSWER = `【答案】见试题解答内容
【解答】C
【解答】A
【解答】AB
【解答】BBC
【答案】CBB
【答案】（1）engineering（2）functional（3）to（4）closed
`;

  const result = await parsePaper({
    originalPath: 'paper.txt',
    answerPath: 'answer.txt',
    year: '2024',
    region: '新高考',
    paper: 'I卷',
    toText: async (filePath) => (filePath === 'answer.txt' ? ANSWER : PAPER),
  });

  assert.equal(result.validation.valid, true, `issues: ${JSON.stringify(result.validation.issues)}`);

  const listening = result.modules.find((m) => m.module === 'listening');
  // Q1-5 独立题（Q5 长题干不得被当作材料丢弃）
  assert.deepEqual(listening.questions.map((q) => q.answer), ['C', 'A']);
  assert.equal(listening.questions.length, 2, 'Q1 & Q5 must be kept as standalone questions');
  // 组分离：两段对话应分为两个 group
  assert.equal(listening.groups.length, 2, 'two conversations must become two groups');
  assert.deepEqual(listening.groups[0].questions.map((q) => q.answer), ['A', 'B'], 'group6 = AB per-letter');
  assert.deepEqual(listening.groups[1].questions.map((q) => q.answer), ['B', 'B', 'C'], 'group7 = BBC per-letter');

  const reading = result.modules.find((m) => m.module === 'reading');
  assert.deepEqual(reading.groups[0].questions.map((q) => q.answer), ['C', 'B', 'B'], 'reading = CBB per-letter');

  // 语法填空答案不得污染听力/阅读
  for (const q of [...listening.questions, ...listening.groups.flatMap((g) => g.questions), ...reading.groups.flatMap((g) => g.questions)]) {
    assert.match(String(q.answer), /^[A-G]$/);
  }
});


/* ---------------- 2024 完形/语法填空/七选五（本次修复） ---------------- */

test('extractAnswers keeps full cloze ranges (1)-(5)(6)-(10)(11)-(15)', () => {
  const res = extractAnswers('【答案】（1）﹣（5）CADCB（6）﹣（10）DCBBA （11）﹣（15）DADBC');
  assert.deepEqual(
    [res.byParen[11], res.byParen[12], res.byParen[13], res.byParen[14], res.byParen[15]],
    ['D', 'A', 'D', 'B', 'C'],
    '11-15 answers must survive after the earlier ranges'
  );
});

test('extractAnswers keeps multi-word grammar answers (to give)', () => {
  const res = extractAnswers('【答案】（1）engineering（2）functional（3）to give（4）closed');
  assert.equal(res.byParen[3], 'to give');
});

test('extractAnswers records parenSegments in answer-file order', () => {
  const res = extractAnswers(
    '【答案】（1）﹣（5）CADCB（6）﹣（10）DCBBA（11）﹣（15）DADBC\n【答案】（1）engineering（2）functional（3）to give'
  );
  assert.equal(res.parenSegments.length, 2);
  assert.deepEqual(res.parenSegments[0][1], 'C');
  assert.deepEqual(res.parenSegments[0][11], 'D');
  assert.deepEqual(res.parenSegments[1][1], 'engineering');
  assert.deepEqual(res.parenSegments[1][3], 'to give');
});

test('applyAnswers consumes parenSegments per group (cloze vs grammar-fill must not bleed)', () => {
  const langMod = makeMod('languageUse', [], [
    {
      number: 16, points: 15,
      questions: Array.from({ length: 15 }, (_, i) => ({ number: 16 + i, subInGroup: i + 1, stem: 's', options: [], answer: null })),
    },
    {
      number: 17, points: 15,
      questions: Array.from({ length: 10 }, (_, i) => ({ number: 17 + i, subInGroup: i + 1, stem: 's', options: [], answer: null })),
    },
  ]);
  const answers = extractAnswers(
    '【答案】（1）﹣（5）CADCB（6）﹣（10）DCBBA（11）﹣（15）DADBC\n【答案】（1）engineering（2）functional（3）to give'
  );
  applyAnswers(langMod, answers, []);
  const cloze = langMod.groups[0].questions.map((q) => q.answer);
  assert.deepEqual(cloze, ['C', 'A', 'D', 'C', 'B', 'D', 'C', 'B', 'B', 'A', 'D', 'A', 'D', 'B', 'C']);
  const grammar = langMod.groups[1].questions.slice(0, 3).map((q) => q.answer);
  assert.deepEqual(grammar, ['engineering', 'functional', 'to give']);
});

test('parsePaper end-to-end: 2024 embedded blanks (cloze + grammar-fill + 7选5)', async () => {
  const PAPER = `一第一部分 听力 （共两节）
1．（1.5分）What is Kate doing？
A.Cooking.
B.Reading.
C.Sleeping.
二第二部分 阅读 （共两节）
第一节
HABITAT RESTORATION TEAM
11．（7.5分）（1）What is the aim？
A.To plant trees.
B.To protect animals.
C.To clean rivers.
（2）What is the limit？
A.8.
B.10.
C.12.
（3）What are the volunteers expected to do？
A.Work in all weather.
B.Stay at home in rain.
C.Only work indoors.
四第二节 七选五
15．（12.5分）ㅤNot all great writers are great spellers.（1）\u3000    \u3000 No editor is likely to tolerate a writer.
ㅤ（2）\u3000    \u3000 Of course，these days there are plenty of online dictionaries.
ㅤ（3）\u3000    \u3000 It should give you a precise definition.
五第三部分语言运用
第一节 完形填空
16．（15分）ㅤI've been motivated all my life.When I was a teenager，a friend （1）\u3000    \u3000 a marathon race.
ㅤThen two things happened.（2）\u3000    \u3000，but then I started running.
（1）A.knew
B.held
C.won
D.quit
（2）A.regularly
B.silently
C.proudly
D.recently
六第二节 语法填空
17．（15分）ㅤThe latest （1）\u3000    \u3000（engineer） techniques are applied.
ㅤThese sepals open on warm days （2）\u3000    \u3000（give） the inside plants sunshine.
七第四部分写作
18．（15分）假定你是李华，请给Chris写一封邮件。
`;

  const ANSWER = `【解答】C
【答案】CBB
【答案】FBEAD
【答案】（1）﹣（5）CADCB（6）﹣（10）DCBBA（11）﹣（15）DADBC
【答案】（1）engineering（2）functional（3）to give
`;

  const result = await parsePaper({
    originalPath: 'paper.txt',
    answerPath: 'answer.txt',
    year: '2024',
    region: '新高考',
    paper: 'I卷',
    toText: async (filePath) => (filePath === 'answer.txt' ? ANSWER : PAPER),
  });

  assert.equal(result.validation.valid, true, `issues: ${JSON.stringify(result.validation.issues)}`);

  const reading = result.modules.find((m) => m.module === 'reading');
  const seven = reading.groups.find((g) => g.number === 15);
  assert.equal(seven.questions.length, 3, '七选五 embedded blanks must become questions');
  assert.deepEqual(seven.questions.map((q) => q.answer), ['F', 'B', 'E']);

  const langUse = result.modules.find((m) => m.module === 'languageUse');
  const cloze = langUse.groups.find((g) => g.number === 16);
  assert.equal(cloze.questions.length, 2, 'cloze embedded blanks + option rows');
  assert.deepEqual(cloze.questions.map((q) => q.answer), ['C', 'A']);
  assert.deepEqual(cloze.questions[0].options.slice(0, 2), ['knew', 'held']);

  const grammar = langUse.groups.find((g) => g.number === 17);
  assert.equal(grammar.questions.length, 2, 'grammar-fill embedded blanks');
  assert.deepEqual(grammar.questions.map((q) => q.answer), ['engineering', 'functional']);
});


/* ---------------- 2020 数字空格格式（本轮修复） ---------------- */

test('parsePaper end-to-end: 2020 spaced-number format (七选五/完形/语法填空)', async () => {
  const PAPER = `一第一部分 听力 （共两节）
1. What does the man do?
A. He is a teacher.
B. He is a doctor.
二第二部分 阅读理解（共两节）
第一节 阅读下列短文。
21. What can visitors see?
A. Animals.
B. Plants.
C. Rivers.
第二节 七选五
根据短文内容，从短文后的选项中选出能填入空白处的最佳选项。
A housewarming party is a special party to be held when someone buys a new home.   36   And it is good time.
   37   Some people register a list of things.
   38   This is often appreciated since there isn't a lot of food served.
People may be asked to help unpack boxes.   39
Housewarming parties get their name from a long time ago.   40   Now most homes have central heating.
A. This isn't usual though.
B. It is traditional to bring a gift.
C. You can also bring food.
D. If you're lucky, keep them safe.
E. It gives people a chance.
F. The best parties encourage friends.
G. This was to keep warm.
三第三部分 语言知识运用
第一节 完形填空
As a businesswoman, I care deeply about my customers. But like anyone,   41   can also drive you mad. They'll come rushing in,   42  their handbag's been stolen.
41. A. shopkeepers\tB. customers\tC. salespersons\tD. receptionists
42. A. saying\tB. pretending\tC. guessing\tD. replying
第二节 语法填空
In ancient China lived an artist.   61   paintings were almost lifelike. The artist's reputation had made him proud. One day the emperor wanted to get his portrait done so he called all great artists to come and present their   62   (fine) work.
四第四部分 写作
假定你是李华，请给Miss Evans写封邮件。
`;

  const ANSWER = `【答案】1. C
【答案】21. A
【答案】36. E    37. B    38. C    39. A    40. G
【答案】41. B    42. A
【答案】61. whose    62. finest
`;

  const result = await parsePaper({
    originalPath: 'paper.txt',
    answerPath: 'answer.txt',
    year: '2020',
    region: '全国',
    paper: 'III',
    toText: async (filePath) => (filePath === 'answer.txt' ? ANSWER : PAPER),
  });

  assert.equal(result.validation.valid, true, `issues: ${JSON.stringify(result.validation.issues)}`);

  // 七选五：行首/行尾数字空格都能拆题，5 题连续
  const reading = result.modules.find((m) => m.module === 'reading');
  const seven = reading.groups.find((g) => g.number === 36);
  assert.equal(seven.questions.length, 5, '7选5 spaced numbers must split into 5 questions');
  assert.deepEqual(seven.questions.map((q) => q.answer), ['E', 'B', 'C', 'A', 'G']);

  // 完形：文章空格拆题 + Tab 选项行合并（不重复建题）
  const langUse = result.modules.find((m) => m.module === 'languageUse');
  const cloze = langUse.groups.find((g) => g.number === 41);
  assert.equal(cloze.questions.length, 2, 'cloze must have 2 questions (not duplicated)');
  assert.deepEqual(cloze.questions.map((q) => q.answer), ['B', 'A']);
  assert.deepEqual(cloze.questions[0].options, ['shopkeepers', 'customers', 'salespersons', 'receptionists']);

  // 语法填空：带提示词空格独立成组，单词答案
  const grammar = langUse.groups.find((g) => g.number === 61);
  assert.equal(grammar.questions.length, 2);
  assert.deepEqual(grammar.questions.map((q) => q.answer), ['whose', 'finest']);
  assert.ok((grammar.questions[1].stem || '').includes('(fine)'), 'grammar hint word should be in stem');
});


/* ---------------- 语法填空 W/O 答案 + 2020 写作拆题（本轮修复） ---------------- */

test('extractAnswers accepts W/O-leading grammar answers (When/As, On)', () => {
  const res = extractAnswers('【答案】65. When/As\n70. On');
  assert.equal(res.byNumber[65], 'When/As');
  assert.equal(res.byNumber[70], 'On');
});

test('parsePaper end-to-end: 2020 unnumbered writing sections become questions', async () => {
  const PAPER = `一第一部分 听力 （共两节）
1. What does the man do?
A. He is a teacher.
B. He is a doctor.
二第二部分 阅读 （共两节）
21. What can visitors see?
A. Animals.
B. Plants.
四第四部分 写作（共两节，满分35分）
第一节  短文改错（共10小题；每小题1分，满分10分）
假定英语课上老师要求同桌之间交换修改作文，请你修改你同桌写的以下作文。
My mom is really concerning with the health of everyone in our families.
第二节  书面表达（满分25分）
假定你是李华，你和同学根据英语课文改编了一个短剧。给外教Miss Evans写封邮件，请她帮忙指导。
`;

  const ANSWER = `【答案】1. C
【答案】21. A
`;

  const result = await parsePaper({
    originalPath: 'paper.txt',
    answerPath: 'answer.txt',
    year: '2020',
    region: '全国',
    paper: 'III',
    toText: async (filePath) => (filePath === 'answer.txt' ? ANSWER : PAPER),
  });

  assert.equal(result.validation.valid, true, `issues: ${JSON.stringify(result.validation.issues)}`);
  const writing = result.modules.find((m) => m.module === 'writing');
  assert.equal(writing.groups.length, 2, '短文改错 + 书面表达 must become 2 writing groups');
  assert.ok(writing.groups[0].sectionTitle.includes('短文改错'));
  assert.ok(writing.groups[1].sectionTitle.includes('书面表达'));
  assert.ok(writing.groups[0].questions[0].stem.includes('交换修改作文'), '改错题干应完整');
  assert.ok(writing.groups[1].questions[0].stem.includes('改编了一个短剧'), '书面表达题干应完整');
});


test('extractAnswers supports dot-less numbered answers (10 C)', () => {
  const res = extractAnswers('【答案】10 C    11. A    12. C');
  assert.equal(res.byNumber[10], 'C');
  assert.equal(res.byNumber[11], 'A');
  assert.equal(res.byNumber[12], 'C');
});


/* ---------------- 2023 地区版（范文排除 / 音频占位符 / 多 section） ---------------- */

test('extractAnswers ignores 范文 (model essay) text in 【答案】 blocks', () => {
  const res = extractAnswers('【答案】Dear Ryan, I am Li Hua from Class 3. I think it is not a good idea to randomly pair up students.');
  assert.equal(res.byNumber[3], undefined, 'Class 3. must not be parsed as question 3 answer');
  assert.equal(res.byNumber[1], undefined, 'model essay must not leak numbered answers');
});

test('parsePaper preprocesses audio placeholder and merges the real stem', async () => {
  const PAPER = `一第一部分 听力 （共两节）
第一节(共 5 小题)
1. 【此处可播放相关音频，请去附件查看】
What will Jack probably do this weekend?
A. Go camping.\tB. Visit a friend.\tC. Watch a film.
二第二部分 阅读（共两节）
第一节 阅读下列短文。
21. What is an advantage of MacBike?
A. Low cost.\tB. Wide choice.\tC. Free helmets.
三第三部分 写作（共两节）
第一节(满分 15 分)
假定你是李华，请给外教写一封邮件。
`;

  const ANSWER = `【答案】C
【答案】21. B
【答案】Dear Ryan, I am Li Hua from Class 3. I think it is not a good idea.
`;

  const result = await parsePaper({
    originalPath: 'paper.txt',
    answerPath: 'answer.txt',
    year: '2023',
    region: '新高考',
    paper: 'I卷',
    toText: async (filePath) => (filePath === 'answer.txt' ? ANSWER : PAPER),
  });

  assert.equal(result.validation.valid, true, `issues: ${JSON.stringify(result.validation.issues)}`);
  const listening = result.modules.find((m) => m.module === 'listening');
  assert.equal(listening.questions.length, 1, 'audio placeholder stem must merge into one question');
  assert.ok(listening.questions[0].stem.includes('What will Jack'), 'real stem must be kept');
  assert.equal(listening.questions[0].answer, 'C', 'single-letter answer applies');
});


/* ---------------- 2023 写作带题号（本轮修复） ---------------- */

test('parsePaper end-to-end: 2023 numbered writing sections (66/67)', async () => {
  const PAPER = `三第三部分 写作（共两节，满分40分）
第一节  (满分15分)
66.   假定你是李华，外教Ryan准备将学生随机分为两人一组，让大家课后练习口语，你认为这样分组存在问题。请你给外教写一封邮件，内容包括：
1. 说明问题；
2. 提出建议
注意：
1. 写作词数应为80个左右；
2. 请按如下格式在答题卡的相应位置作答。
第二节  (满分25分)
67.   阅读下面材料, 根据其内容和所给段落开头语续写两段, 使之构成一篇完整的短文。
When I was in middle school, my social studies teacher asked me to enter a writing contest.
`;

  const ANSWER = `【答案】Dear Ryan, I am Li Hua from Class 3. I think it is not a good idea to randomly pair up students.
`;

  const result = await parsePaper({
    originalPath: 'paper.txt',
    answerPath: 'answer.txt',
    year: '2023',
    region: '新高考',
    paper: 'I卷',
    toText: async (filePath) => (filePath === 'answer.txt' ? ANSWER : PAPER),
  });

  assert.equal(result.validation.valid, true, `issues: ${JSON.stringify(result.validation.issues)}`);
  const writing = result.modules.find((m) => m.module === 'writing');
  assert.equal(writing.groups.length, 2, '应用文 + 读后续写 must be 2 groups');
  assert.deepEqual(writing.groups.map((g) => g.number), [66, 67], 'writing groups must keep 66/67 numbers');
  assert.ok(writing.groups[0].questions[0].stem.includes('假定你是李华'), '应用文题干完整');
  assert.ok(writing.groups[1].questions[0].stem.includes('阅读下面材料'), '读后续写题干完整');
  // 应用文要点不得成为独立题
  assert.equal(writing.questions.length, 0, '要点行不得成为独立题');
});

