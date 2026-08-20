import QuestionAnalysis from './QuestionAnalysis';

export default function ContinuationAnalysis({ feedback, originalText }) {
  return (
    <div style={{ padding: 0 }}>
      <QuestionAnalysis feedback={feedback} originalText={originalText} />
    </div>
  );
}
