export const WRITING_RECORD_FILTER_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'ready', label: '已完成' },
  { id: 'pending', label: '生成中' },
  { id: 'partial', label: '部分完成' },
  { id: 'failed', label: '待补全' },
];

export function buildWritingRecordSections({
  taskFiltered,
  practiceFiltered,
  taskWritings,
  practiceWritings,
  taskFilter,
  practiceFilter,
  setTaskFilter,
  setPracticeFilter,
}) {
  return [
    {
      key: 'task',
      title: '任务记录',
      subtitle: '回看老师布置任务的提交、反馈与教师评价。',
      badge: `${taskFiltered.length} 项`,
      writings: taskWritings,
      filtered: taskFiltered,
      filter: taskFilter,
      setFilter: setTaskFilter,
      emptyMessage: '还没有任务写作记录',
      divider: false,
    },
    {
      key: 'practice',
      title: '自由练习记录',
      subtitle: '回看自主练习的题目、反馈和详细分析，观察长期进步。',
      badge: `${practiceFiltered.length} 项`,
      writings: practiceWritings,
      filtered: practiceFiltered,
      filter: practiceFilter,
      setFilter: setPracticeFilter,
      emptyMessage: '还没有自由练习记录',
      divider: true,
    },
  ];
}
