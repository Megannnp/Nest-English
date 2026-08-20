import { array, boolean, number, object, passthrough, string } from '../schema.js';

function buildAssignmentSchema({ requireClassId }) {
  return object({
    classId: string({ required: requireClassId, max: 64, message: 'classId 不能为空' }),
    title: string({ required: true, max: 200, message: 'title 不能为空' }),
    promptText: string({ required: true, max: 20000, message: 'promptText 不能为空' }),
    questionId: string({ max: 64 }),
    questionTitle: string({ max: 255 }),
    selectedType: string({ max: 32 }),
    selectedTypeMix: array(object({
      type: string({ required: true, max: 32, message: '题型不能为空' }),
      percentage: number({ required: true, integer: true, min: 1, max: 100, message: '题型占比不合法' }),
    }), { maxItems: 3 }),
    selectedThemes: array(string({ max: 30 }), { maxItems: 10 }),
    maxScore: number({ required: true, integer: true, min: 1, message: 'maxScore 必须是正整数' }),
    dueAt: passthrough({ defaultValue: null }),
    allowLate: boolean({ defaultValue: false }),
  });
}

export const createAssignmentBodySchema = buildAssignmentSchema({ requireClassId: true });
export const updateAssignmentBodySchema = buildAssignmentSchema({ requireClassId: false });
