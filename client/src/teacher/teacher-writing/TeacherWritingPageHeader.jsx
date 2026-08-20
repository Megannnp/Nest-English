import TeacherWritingHeaderActions from "./TeacherWritingHeaderActions.jsx";
import { PageHeader } from "../../components/shared/UI.jsx";

export default function TeacherWritingPageHeader({
  isMobile,
  onBackToWorkbench,
  previousWriting,
  nextWriting,
  writingContext,
  onOpenWriting,
  onOpenClassContext,
}) {
  return (
    <PageHeader
      titleEn="Writing Detail"
      titleZh="作文详情"
      subtitle="这里是教师处理单篇作文的正式详情页：看结果、补评价、再决定是否回到班级上下文。"
      isMobile={isMobile}
    >
      <TeacherWritingHeaderActions
        isMobile={isMobile}
        onBackToWorkbench={onBackToWorkbench}
        previousWriting={previousWriting}
        nextWriting={nextWriting}
        writingContext={writingContext}
        onOpenWriting={onOpenWriting}
        onOpenClassContext={onOpenClassContext}
      />
    </PageHeader>
  );
}
