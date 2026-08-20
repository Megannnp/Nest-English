import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import DetailedFeedbackStatusSection from './DetailedFeedbackStatusSection.jsx';

describe('DetailedFeedbackStatusSection', () => {
  it('renders general detailed feedback from nested and object-shaped deepReview fields', () => {
    render(
      <DetailedFeedbackStatusSection
        isMobile={false}
        writing={{ selectedType: 'letter' }}
        feedback={{
          detailedFeedback: {
            status: 'ready',
            result: {
              overview: '应用文任务基本完成。',
              aiEvaluation: {
                deepReview: {
                  language: {
                    grammarIssues: [
                      { name: '主谓一致', comment: 'He go 应改为 He goes。' },
                    ],
                  },
                  contentLogic: [
                    { title: '信息不足', detail: '邀请时间需要写清楚。' },
                  ],
                  structure: {
                    structure: ['结尾需要形成明确行动闭环。'],
                  },
                },
              },
            },
          },
        }}
      />
    );

    expect(screen.getByText('主谓一致')).toBeInTheDocument();
    expect(screen.getByText('He go 应改为 He goes。')).toBeInTheDocument();
    expect(screen.getByText('信息不足')).toBeInTheDocument();
    expect(screen.getByText('邀请时间需要写清楚。')).toBeInTheDocument();
    expect(screen.getByText('结尾需要形成明确行动闭环。')).toBeInTheDocument();
  });

  it('does not inject a fallback title for continuation sample essays', () => {
    render(
      <DetailedFeedbackStatusSection
        isMobile={false}
        writing={{ selectedType: 'continuation' }}
        feedback={{
          detailedFeedback: {
            status: 'ready',
            result: {
              overview: '续写方向基本正确。',
              sampleEssay: {
                title: '',
                text: 'In a class discussion I was invited to explain the meaning of my name. I finally decided to speak with confidence.\n\nMany of my classmates got interested and came up to me after class. Their curiosity made me feel proud of my identity.',
                highlights: ['段首句保留'],
              },
            },
          },
        }}
      />
    );

    expect(screen.queryByText('参考续写')).not.toBeInTheDocument();
    expect(screen.getByText('In a class discussion I was invited to explain the meaning of my name. I finally decided to speak with confidence.', { exact: false })).toBeInTheDocument();
  });
});
