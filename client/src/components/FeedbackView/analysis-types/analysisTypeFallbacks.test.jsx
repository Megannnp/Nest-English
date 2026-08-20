import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ArgumentativeAnalysis from './argumentative/index.jsx';
import ContinuationPlanningPanel from './continuation/ContinuationPlanningPanel.jsx';
import ContinuationResourceBank from './continuation/ContinuationResourceBank.jsx';
import ContinuationStoryEmotionPanel from './continuation/ContinuationStoryEmotionPanel.jsx';
import ExpositoryAnalysis from './expository/index.jsx';
import LetterAnalysis from './letter/index.jsx';
import ReportAnalysis from './report/index.jsx';
import SpeechAnalysis from './speech/index.jsx';
import SummaryAnalysis from './summary/index.jsx';

vi.mock('../../../../hooks/useIsMobile.js', () => ({
  default: () => false,
}));

describe('analysis type fallback rendering', () => {
  it('renders summary analysis with fallback copy when fields are missing', () => {
    render(<SummaryAnalysis feedback={{}} />);

    expect(screen.getByText('材料解构与任务边界')).toBeInTheDocument();
    expect(screen.getByText('需要区分“原文概括”和“个人评论”的边界，既不能只复述，也不能脱离材料空谈。')).toBeInTheDocument();
    expect(screen.getByText('建议严格按照“概括贴原文顺序，评论按观点-论据-小结展开”的逻辑组织语言。')).toBeInTheDocument();
  });

  it('renders speech analysis with safe empty-state guidance', () => {
    render(<SpeechAnalysis feedback={{}} />);

    expect(screen.getByText('题型分析')).toBeInTheDocument();
    expect(screen.getByText('暂无立意分析。')).toBeInTheDocument();
    expect(screen.getByText('暂无可展示的演讲表达资源。')).toBeInTheDocument();
    expect(screen.getByText('暂无主体展开建议。')).toBeInTheDocument();
  });

  it('renders letter analysis with default communication guidance', () => {
    render(<LetterAnalysis feedback={{}} />);

    expect(screen.getByText('交际情境与关系')).toBeInTheDocument();
    expect(screen.getByText('需要先明确这封信要让对方理解什么、做什么、感受到什么，再决定语言分寸。')).toBeInTheDocument();
    expect(screen.getByText('暂无硬性任务要点。')).toBeInTheDocument();
    expect(screen.getByText('细节要么服务事务落地，要么服务情感真诚，要么服务诉求说服，不能堆砌无关信息。')).toBeInTheDocument();
  });

  it('renders report analysis with fallback structure and risk hints', () => {
    render(<ReportAnalysis feedback={{}} />);

    expect(screen.getByText('报告情境与交际目标')).toBeInTheDocument();
    expect(screen.getByText('报告应围绕“事实呈现、问题分析、结论提炼、建议落地”展开，帮助读者快速抓住重点。')).toBeInTheDocument();
    expect(screen.getByText('暂无硬性任务分析。')).toBeInTheDocument();
    expect(screen.getByText('报告语言应中立、客观、基于事实，结论与建议要可执行，避免情绪化判断。')).toBeInTheDocument();
  });

  it('renders continuation planning fallbacks when starter and storyline fields are missing', () => {
    render(
      <ContinuationPlanningPanel
        starters={{}}
        storyLine={{}}
        contentAnalysis={{}}
      />
    );

    expect(screen.getByText('首句理解')).toBeInTheDocument();
    expect(screen.getAllByText('未提供')).toHaveLength(2);
    expect(screen.getAllByText('暂无中文理解')).toHaveLength(2);
    expect(screen.getByText((content) => content.includes('先围绕“老师为什么不纠错”展开'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('结尾要既有结果，也有成长回扣'))).toBeInTheDocument();
  });

  it('renders continuation resource and story-emotion fallbacks without optional banks', () => {
    render(
      <>
        <ContinuationResourceBank
          resourceBank={{
            vocabularyGroups: [],
            phraseGroups: [],
            sentenceGroups: [],
          }}
        />
        <ContinuationStoryEmotionPanel
          storyLine={{}}
          emotionLine={{}}
          activeStoryKeys={[]}
          activeEmotionKeys={[]}
        />
      </>
    );

    expect(screen.getByText('暂无专属词汇素材。')).toBeInTheDocument();
    expect(screen.getByText('暂无专属短语素材。')).toBeInTheDocument();
    expect(screen.getByText('暂无专属句型素材。')).toBeInTheDocument();
    expect(screen.getAllByText('暂无分析内容')).toHaveLength(3);
    expect(screen.getByText('暂无情绪起点分析')).toBeInTheDocument();
  });

  it('renders argumentative analysis fallback metrics and empty hints', () => {
    render(<ArgumentativeAnalysis feedback={{}} />);

    expect(screen.getByText('论点明确性分析')).toBeInTheDocument();
    expect(screen.getByText('未识别论点')).toBeInTheDocument();
    expect(screen.getByText('当前没有额外的论点修改建议。')).toBeInTheDocument();
    expect(screen.getByText('当前没有额外的论据补充建议。')).toBeInTheDocument();
    expect(screen.getByText('当前没有额外的逻辑连贯性问题提示。')).toBeInTheDocument();
  });

  it('renders expository analysis fallback when prompt and categories are missing', () => {
    render(<ExpositoryAnalysis feedback={{}} originalText="" />);

    expect(screen.getByText('题目要求')).toBeInTheDocument();
    expect(screen.getByText('未提供题目材料。')).toBeInTheDocument();
    expect(screen.queryByText('写作要点清单')).not.toBeInTheDocument();
  });
});
