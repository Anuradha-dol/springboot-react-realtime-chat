import { useRef, useState } from "react";

function CameraIcon() {
  return (
    <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.8 7h3.4l1.2-2h5.2l1.2 2h3.4a2.4 2.4 0 0 1 2.4 2.4v7a2.4 2.4 0 0 1-2.4 2.4H4.8a2.4 2.4 0 0 1-2.4-2.4v-7A2.4 2.4 0 0 1 4.8 7Z" />
      <circle cx="12" cy="12.6" r="3.2" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="6.3" width="12.5" height="11.4" rx="2.2" />
      <path d="m16 10 4.7-2.6v9.2L16 14z" />
    </svg>
  );
}

export default function MediaUpload({ onUpload }) {
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [previewType, setPreviewType] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const handleFile = (event, type) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewType(type);
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const cancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewType("");
    setPreviewFile(null);
    setPreviewUrl("");
  };

  const sendPreview = async () => {
    if (!previewFile || !previewType) return;
    setProgress(0);
    await onUpload(previewFile, previewType, (value) => setProgress(value));
    setProgress(0);
    cancelPreview();
  };

  return (
    <>
      <div className="media-upload">
        <input ref={imageRef} type="file" accept=".jpg,.jpeg,.png,.webp" hidden onChange={(e) => handleFile(e, "image")} />
        <input ref={videoRef} type="file" accept=".mp4,.webm,.mov" hidden onChange={(e) => handleFile(e, "video")} />

        <button
          type="button"
          className="icon-btn compose-action-btn"
          title="Upload photo"
          aria-label="Upload photo"
          onClick={() => imageRef.current?.click()}
        >
          <CameraIcon />
        </button>

        <button
          type="button"
          className="icon-btn compose-action-btn"
          title="Upload video"
          aria-label="Upload video"
          onClick={() => videoRef.current?.click()}
        >
          <VideoIcon />
        </button>

        {progress > 0 ? <div className="upload-progress">{progress}%</div> : null}
      </div>

      {previewUrl ? (
        <div className="media-preview-panel">
          {previewType === "image" ? (
            <img src={previewUrl} alt="preview" className="media-preview-image" />
          ) : (
            <video className="media-preview-video" controls>
              <source src={previewUrl} />
            </video>
          )}
          <div className="media-preview-actions">
            <button type="button" className="ghost-btn small" onClick={cancelPreview}>
              Cancel
            </button>
            <button type="button" className="primary-btn small" onClick={sendPreview}>
              Send media
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
