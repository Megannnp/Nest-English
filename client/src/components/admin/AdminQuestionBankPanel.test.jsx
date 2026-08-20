import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminApi = vi.hoisted(() => ({
  aiNormalizeAdminQuestionBankQuestions: vi.fn(),
  deleteAdminQuestion: vi.fn(),
  fetchAdminQuestionBankMaterials: vi.fn(),
  fetchAdminQuestionBankMetadata: vi.fn(),
  fetchAdminQuestionBankQuestionDetail: vi.fn(),
  fetchAdminQuestionBankQuestions: vi.fn(),
  importAdminQuestionBank: vi.fn(),
  importAdminQuestionBankQuestions: vi.fn(),
  saveAdminQuestionBankMaterial: vi.fn(),
  saveAdminQuestionBankQuestion: vi.fn(),
  saveAdminQuestionBankResource: vi.fn(),
  updateAdminQuestionBankMaterial: vi.fn(),
  updateAdminQuestionBankQuestion: vi.fn(),
  updateAdminQuestionBankResource: vi.fn(),
  validateAdminQuestionBankQuestions: vi.fn(),
}));

vi.mock('../../api/admin.js', () => adminApi);

const metadata = {
  modules: [{ id: 'module-reading', code: 'reading', name: '阅读', status: 'active' }],
  systems: [{ id: 'system-gaokao', code: 'gaokao', name: '高考', status: 'active' }],
  categories: [{ id: 'category-reading', module_id: 'module-reading', name: '阅读理解', status: 'active' }],
  difficulties: [{ id: 'difficulty-basic', module_id: 'module-reading', name: '基础', status: 'active' }],
  tags: [{ id: 'tag-main-idea', name: '主旨大意' }],
  knowledge_points: [{ id: 'kp-main-idea', module_id: 'module-reading', name: '主旨大意', status: 'active' }],
};

describe('AdminQuestionBankPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.fetchAdminQuestionBankMetadata.mockResolvedValue(metadata);
    adminApi.fetchAdminQuestionBankMaterials.mockResolvedValue([]);
    adminApi.fetchAdminQuestionBankQuestions.mockResolvedValue([]);
    adminApi.aiNormalizeAdminQuestionBankQuestions.mockResolvedValue({
      items: [{ title: 'AI 阅读题', content: 'Choose the main idea.', answer: 'A' }],
    });
    adminApi.validateAdminQuestionBankQuestions.mockResolvedValue({
      valid: 1,
      invalid: 0,
      results: [{ index: 0, ok: true, title: 'AI 阅读题', module: 'reading' }],
    });
    adminApi.importAdminQuestionBankQuestions.mockResolvedValue({
      created: 1,
      failed: 0,
      results: [{ index: 0, ok: true, title: 'AI 阅读题', id: 'question-1' }],
    });
  });

  it('keeps AI normalized preview with selected defaults before import', async () => {
    const { default: AdminQuestionBankPanel } = await import('./AdminQuestionBankPanel.jsx');
    render(<AdminQuestionBankPanel />);

    fireEvent.click(await screen.findByRole('button', { name: '批量录题' }));
    fireEvent.change(screen.getByLabelText('默认科目'), { target: { value: 'module-reading' } });
    fireEvent.change(screen.getByLabelText('默认分类'), { target: { value: 'category-reading' } });
    fireEvent.change(screen.getByLabelText('默认难度'), { target: { value: 'difficulty-basic' } });
    fireEvent.change(screen.getByLabelText('默认题型'), { target: { value: 'single_choice' } });
    fireEvent.change(screen.getByPlaceholderText(/直接粘贴试卷/), { target: { value: '阅读材料和题目原文' } });

    fireEvent.click(screen.getByRole('button', { name: 'AI 解析归类' }));

    await screen.findByText('AI 已解析 1 道题：可导入 1 道，需修正 0 道');
    expect(screen.getByText(/#1 AI 阅读题 · 单选题/)).toBeInTheDocument();
    const jsonPreview = await screen.findByDisplayValue(/"module_id": "module-reading"/);
    expect(jsonPreview.value).toContain('"category_id": "category-reading"');

    fireEvent.click(screen.getByRole('button', { name: '确认导入' }));

    await waitFor(() => expect(adminApi.importAdminQuestionBankQuestions).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'AI 阅读题',
        module_id: 'module-reading',
        category_id: 'category-reading',
        difficulty_id: 'difficulty-basic',
        question_type: 'single_choice',
      }),
    ]));
    expect(await screen.findByText('批量导入完成：成功 1 道，失败 0 道')).toBeInTheDocument();
  });

  it('passes selected exam target to question list search', async () => {
    const { default: AdminQuestionBankPanel } = await import('./AdminQuestionBankPanel.jsx');
    render(<AdminQuestionBankPanel />);

    fireEvent.click(await screen.findByRole('button', { name: '题目列表' }));
    fireEvent.change(await screen.findByDisplayValue('全部备考目标'), { target: { value: 'system-gaokao' } });
    fireEvent.click(await screen.findByRole('button', { name: '搜索' }));

    await waitFor(() => expect(adminApi.fetchAdminQuestionBankQuestions).toHaveBeenLastCalledWith(
      expect.objectContaining({ systemId: 'system-gaokao' })
    ));
  });
});
