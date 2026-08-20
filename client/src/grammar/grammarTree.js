// 本文件由 grammarContent.js 拆分自动生成：仅保留语法知识树的结构
// （id / title / children）和 hasContent 标记，不含正文与题目。
// 正文与练习题在 grammarCourseContent.js，仅 GrammarCoursesPage 按需加载。

const leaf = (id, title) => ({ id, title, hasContent: true });

export const GRAMMAR_TREE = [
  {
    "id": "sentence",
    "title": "句子",
    "children": [
      {
        "id": "sentence-components",
        "title": "句子成分",
        "children": [
          leaf("by-trunk", "按主干/支干分类"),
          leaf("by-predicate", "按谓语/非谓语分类")
        ]
      },
      {
        "id": "sentence-types",
        "title": "句子分类",
        "children": [
          {
            "id": "by-function",
            "title": "按句子功能/语气分类",
            "children": [
              leaf("declarative-sentence", "陈述句"),
              leaf("interrogative-sentence", "疑问句"),
              leaf("imperative-sentence", "祈使句"),
              leaf("exclamatory-sentence", "感叹句"),
              leaf("subjunctive-sentence", "虚拟句"),
              leaf("emphatic-sentence", "强调句"),
              leaf("inversion", "倒装句")
            ]
          },
          {
            "id": "by-structure",
            "title": "按句子结构分类",
            "children": [
              {
                "id": "simple-sentence",
                "title": "简单句",
                "hasContent": true,
                "children": [
                  leaf("simple-sv", "主谓"),
                  leaf("simple-svp", "主系表"),
                  leaf("simple-svo", "主谓宾"),
                  leaf("simple-svoo", "主谓双宾"),
                  leaf("simple-svoc", "主谓宾宾补"),
                  leaf("there-be", "There be 句型")
                ]
              },
              leaf("compound-sentence", "并列句"),
              {
                "id": "complex-sentence",
                "title": "复合句",
                "children": [
                  {
                    "id": "noun-clause-group",
                    "title": "主干 - 名词性从句",
                    "hasContent": true,
                    "children": [
                      leaf("subject-clause", "主语从句"),
                      leaf("object-clause", "宾语从句"),
                      leaf("predicative-clause", "表语从句"),
                      leaf("appositive-clause", "同位语从句")
                    ]
                  },
                  {
                    "id": "modifier-clause-group",
                    "title": "支干",
                    "children": [
                      {
                        ...leaf("attributive-clause", "定语从句")
                      },
                      {
                        "id": "adverbial-clause",
                        "title": "状语从句",
                        "children": [
                          {
                            "id": "time-clause",
                            "title": "时间状语从句",
                            "hasContent": true
                          },
                          {
                            "id": "condition-clause",
                            "title": "条件状语从句",
                            "hasContent": true
                          },
                          {
                            "id": "reason-clause",
                            "title": "原因状语从句",
                            "hasContent": true
                          },
                          {
                            "id": "concession-clause",
                            "title": "让步状语从句",
                            "hasContent": true
                          },
                          {
                            "id": "result-clause",
                            "title": "结果状语从句",
                            "hasContent": true
                          },
                          {
                            "id": "purpose-clause",
                            "title": "目的状语从句",
                            "hasContent": true
                          },
                          {
                            "id": "manner-clause",
                            "title": "方式状语从句",
                            "hasContent": true
                          },
                          {
                            "id": "comparison-clause",
                            "title": "比较状语从句",
                            "hasContent": true
                          },
                          {
                            "id": "place-clause",
                            "title": "地点状语从句",
                            "hasContent": true
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "word",
    "title": "词语",
    "children": [
      {
        "id": "word-class",
        "title": "词性",
        "children": [
          {
            "id": "noun",
            "title": "名词",
            "hasContent": true
          },
          {
            "id": "verb",
            "title": "动词",
            "hasContent": true,
            "children": [
              {
                "id": "verb-forms",
                "title": "动词的形态",
                "children": [
                  {
                    "id": "tense",
                    "title": "时态",
                    "hasContent": true
                  },
                  {
                    "id": "voice",
                    "title": "语态",
                    "hasContent": true
                  },
                  {
                    "id": "subject-verb-agreement",
                    "title": "主谓一致",
                    "hasContent": true
                  }
                ]
              },
              {
                "id": "verb-classification",
                "title": "动词的分类",
                "children": [
                  {
                    "id": "notional-verb",
                    "title": "实义动词",
                    "hasContent": true
                  },
                  {
                    "id": "linking-verb",
                    "title": "系动词",
                    "hasContent": true
                  },
                  {
                    "id": "auxiliary-verb",
                    "title": "助动词",
                    "hasContent": true
                  },
                  {
                    "id": "modal-verb",
                    "title": "情态动词",
                    "hasContent": true
                  }
                ]
              }
            ]
          },
          {
            "id": "adjective",
            "title": "形容词",
            "hasContent": true
          },
          {
            "id": "adverb",
            "title": "副词",
            "hasContent": true
          },
          {
            "id": "preposition",
            "title": "介词",
            "hasContent": true
          },
          {
            "id": "pronoun",
            "title": "代词",
            "hasContent": true
          },
          {
            "id": "conjunction",
            "title": "连词",
            "hasContent": true
          },
          {
            "id": "article",
            "title": "冠词",
            "hasContent": true
          },
          {
            "id": "numeral",
            "title": "数词",
            "hasContent": true
          },
          {
            "id": "interjection",
            "title": "感叹词",
            "hasContent": true
          }
        ]
      },
      {
        "id": "phrase",
        "title": "短语",
        "children": [
          {
            "id": "phrase-by-pos",
            "title": "按词性",
            "hasContent": true
          },
          {
            "id": "phrase-by-nonfinite",
            "title": "按非谓语",
            "hasContent": true
          }
        ]
      }
    ]
  }
];
