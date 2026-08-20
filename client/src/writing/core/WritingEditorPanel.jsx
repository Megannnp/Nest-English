import AppIcon from '../../components/shared/AppIcon.jsx';

function iconButtonStyle(color) {
  return {
    fontSize: 16,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    minWidth: 44,
    minHeight: 44,
    padding: 0,
    borderRadius: 6,
    color,
    lineHeight: 1,
  };
}

function textButtonStyle() {
  return {
    fontSize: 11,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    color: '#8a7d6e',
    fontWeight: 600,
  };
}

function voiceToggleTitle(voiceSessionState) {
  if (voiceSessionState === "recording") return '暂停语音输入';
  if (voiceSessionState === "paused") return '继续语音输入';
  return '开始语音输入';
}

function VoiceControls({
  isVoiceListening,
  onFinishVoiceInput,
  onRestartVoiceInput,
  onToggleVoiceInput,
  voiceSessionState,
  voiceSupported,
}) {
  if (!voiceSupported) return null;

  return (
    <>
      <button
        onClick={onToggleVoiceInput}
        style={iconButtonStyle(isVoiceListening ? '#2d9e6b' : '#a09080')}
        title={voiceToggleTitle(voiceSessionState)}
      >
        <AppIcon name="mic" size={16} />
      </button>
      {voiceSessionState !== "idle" ? (
        <>
          <button type="button" aria-label={voiceSessionState === "paused" ? "继续语音输入" : "暂停语音输入"} onClick={onToggleVoiceInput} style={textButtonStyle()}>
            {voiceSessionState === "paused" ? "继续" : "暂停"}
          </button>
          <button onClick={onRestartVoiceInput} style={textButtonStyle()}>重录</button>
          <button onClick={onFinishVoiceInput} style={textButtonStyle()}>完成</button>
        </>
      ) : null}
    </>
  );
}

function VoiceStatus({ image, isRecognizingWriting, voiceStatus }) {
  if (isRecognizingWriting) {
    return <span style={{ fontSize: 11, color: '#c8852a', marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}><AppIcon name="clock" size={11} />识别中...</span>;
  }

  if (voiceStatus?.text) {
    return (
      <span
        style={{
          fontSize: 11,
          marginLeft: 4,
          color: voiceStatus.tone === "active" ? "#2d9e6b" : voiceStatus.tone === "error" ? "#b02020" : "#8a7d6e",
          fontWeight: voiceStatus.tone === "active" ? 600 : 500,
        }}
      >
        {voiceStatus.text}
      </span>
    );
  }

  if (image) return <span style={{ fontSize: 11, color: '#2d9e6b', marginLeft: 4 }}>✓ 识别完成</span>;
  return null;
}

function EditorHeader({
  image,
  isMobile,
  isRecognizingWriting,
  isVoiceListening,
  label,
  onFinishVoiceInput,
  onRestartVoiceInput,
  onToggleVoiceInput,
  onUploadImage,
  text,
  voiceSessionState,
  voiceStatus,
  voiceSupported,
  words,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <label className="gm-analyzer-label" style={{ margin: 0 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
        <button onClick={onUploadImage} style={iconButtonStyle('#a09080')} title={isMobile ? "拍照或从相册选取" : "上传作文图片"}><AppIcon name={isMobile ? "camera" : "folder-open"} size={16} /></button>
        <VoiceControls
          isVoiceListening={isVoiceListening}
          onFinishVoiceInput={onFinishVoiceInput}
          onRestartVoiceInput={onRestartVoiceInput}
          onToggleVoiceInput={onToggleVoiceInput}
          voiceSessionState={voiceSessionState}
          voiceSupported={voiceSupported}
        />
        <VoiceStatus image={image} isRecognizingWriting={isRecognizingWriting} voiceStatus={voiceStatus} />
      </div>
      {text.trim() && (
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#b8aea4', fontFamily: 'monospace' }}>
          {text.length}字符 · {words}词
        </span>
      )}
    </div>
  );
}

function EditorTextArea({ minHeight = 240, onPaste, onSetText, placeholder = "在此粘贴或输入英文作文...", text }) {
  return (
    <textarea
      className="gm-analyzer-input"
      aria-label="作文正文"
      value={text}
      onChange={(e) => onSetText(e.target.value)}
      onPaste={onPaste}
      placeholder={placeholder}
      style={{
        width: '100%',
        minHeight,
        color: '#2a1f14',
        fontSize: 15,
        lineHeight: 1.95,
        resize: 'vertical',
      }}
    />
  );
}

function ErrorMessage({ error, isMobile }) {
  if (!error) return null;

  return (
    <div style={{ padding: isMobile ? '0 16px 14px' : '0 20px 14px', fontSize: 13, color: '#b02020' }}>
      <AppIcon name="alert" size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{error}
    </div>
  );
}

function ImageThumb({ item, index, onRemoveImage, onSetLightboxImg }) {
  return (
    <div key={index} style={{ position: 'relative' }}>
      <img
        src={`data:${item.mediaType};base64,${item.base64}`}
        alt=""
        onClick={() => onSetLightboxImg(item)}
        style={{ height: 56, width: 56, objectFit: 'cover', borderRadius: 6, cursor: 'zoom-in', border: '1px solid #d8cfc4' }}
      />
      <button
        onClick={() => onRemoveImage(index)}
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#b02020',
          border: 'none',
          color: '#fff',
          fontSize: 10,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

function ImageThumbList({ images, onRemoveImage, onSetLightboxImg }) {
  if (!images.length) return null;

  return (
    <div style={{ margin: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {images.map((item, index) => (
        <ImageThumb
          key={index}
          item={item}
          index={index}
          onRemoveImage={onRemoveImage}
          onSetLightboxImg={onSetLightboxImg}
        />
      ))}
    </div>
  );
}

function ImageLightbox({ lightboxImg, onSetLightboxImg }) {
  if (!lightboxImg) return null;

  return (
    <button
      type="button"
      aria-label="关闭作文图片预览"
      onClick={() => onSetLightboxImg(null)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
        padding: 'calc(12px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px))',
        border: 0,
      }}
    >
      <img
        src={`data:${lightboxImg.mediaType};base64,${lightboxImg.base64}`}
        alt=""
        style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain' }}
      />
    </button>
  );
}

export default function WritingEditorPanel({
  isMobile = false,
  label = "写作",
  placeholder,
  minHeight,
  text,
  words,
  error,
  image,
  images = [],
  lightboxImg,
  isRecognizingWriting,
  onSetText,
  onPaste,
  onUploadImage,
  voiceSupported = false,
  isVoiceListening = false,
  voiceSessionState = "idle",
  voiceStatus = { text: "", tone: "" },
  onToggleVoiceInput,
  onRestartVoiceInput,
  onFinishVoiceInput,
  onRemoveImage,
  onSetLightboxImg,
}) {
  return (
    <>
      <div
        style={{
          border: 'none',
          borderRadius: 0,
          background: 'transparent',
          overflow: 'visible',
          boxShadow: 'none',
        }}
      >
        <EditorHeader
          image={image}
          isMobile={isMobile}
          isRecognizingWriting={isRecognizingWriting}
          isVoiceListening={isVoiceListening}
          label={label}
          onFinishVoiceInput={onFinishVoiceInput}
          onRestartVoiceInput={onRestartVoiceInput}
          onToggleVoiceInput={onToggleVoiceInput}
          onUploadImage={onUploadImage}
          text={text}
          voiceSessionState={voiceSessionState}
          voiceStatus={voiceStatus}
          voiceSupported={voiceSupported}
          words={words}
        />
        <EditorTextArea minHeight={minHeight} onPaste={onPaste} onSetText={onSetText} placeholder={placeholder} text={text} />
        <ErrorMessage error={error} isMobile={isMobile} />
      </div>

      <ImageThumbList images={images} onRemoveImage={onRemoveImage} onSetLightboxImg={onSetLightboxImg} />
      <ImageLightbox lightboxImg={lightboxImg} onSetLightboxImg={onSetLightboxImg} />
    </>
  );
}
