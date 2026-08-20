import { Suspense, lazy } from 'react';

import AppLoadingShell from '../../components/shared/AppLoadingShell.jsx';
import { SmallActionButton } from '../../components/shared/UI.jsx';

const FeedbackView = lazy(() => import('../../components/FeedbackView/index.jsx'));

export default function FeedbackResultSection({
  feedback,
  loading,
  writingTitle,
  promptText,
  originalText,
  image,
  user,
  onNavigate,
  onReset,
}) {
  if (!feedback) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!loading ? (
        <div style={{ textAlign: 'center' }}>
          <SmallActionButton
            onClick={onReset}
            style={{
              padding: '10px 22px',
              fontSize: 14,
            }}
          >
            再批改一篇
          </SmallActionButton>
        </div>
      ) : null}
      <Suspense fallback={<AppLoadingShell minHeight={240} />}>
        <FeedbackView
          feedback={feedback}
          loading={loading}
          question={{ title: writingTitle || promptText?.slice(0, 40) || '未命名写作', promptText }}
          writingImage={image ? `data:${image.mediaType};base64,${image.base64}` : null}
          studentName={user?.realName || user?.name}
          promptText={promptText}
          originalText={originalText}
          isTeacher={user?.role === 'teacher'}
          user={user}
          onNavigate={onNavigate}
        />
      </Suspense>
    </div>
  );
}
