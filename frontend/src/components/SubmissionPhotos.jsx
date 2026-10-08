import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config";
import { uploadSubmissionPhoto } from "../api/submissions";

export default function SubmissionPhotos({
  submission,
  onUploaded,
  onSessionExpired,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [kind, setKind] = useState("restaurant");
  const [permission, setPermission] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const uploading = useRef(false);
  const fileInput = useRef(null);

  const photos = submission.photos ?? [];
  const editable = ["pending", "changes_requested"].includes(
    submission.status
  );

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clearSelection() {
    setFile(null);
    setPermission(false);

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  function chooseFile(event) {
    const selected = event.target.files?.[0];
    setError("");
    setPermission(false);

    if (!selected) {
      setFile(null);
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(selected.type)
    ) {
      clearSelection();
      setError("Choose a JPEG, PNG or WebP photo.");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      clearSelection();
      setError("Choose a photo no larger than 5 MB.");
      return;
    }

    setFile(selected);
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!file || !permission || uploading.current || needsRefresh) {
      return;
    }

    uploading.current = true;
    setBusy(true);
    setError("");

    try {
      await uploadSubmissionPhoto(submission.id, file, kind);
      clearSelection();
      onUploaded("Photo uploaded successfully.");
    } catch (requestError) {
      if (requestError.status === 401) {
        onSessionExpired();
        return;
      }

      const uncertain =
        !requestError.status || requestError.status >= 500;

      setNeedsRefresh(uncertain);
      setError(
        uncertain
          ? "Upload could not be confirmed. Use Refresh submissions above and check the saved photos before uploading again."
          : requestError.message
      );
    } finally {
      uploading.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="submission-photos">
      <h4>Photos ({photos.length}/5)</h4>

      {photos.length > 0 ? (
        <div className="submission-photo-grid">
          {photos.map(photo => (
            <figure key={photo.id}>
              <img
                src={`${API_BASE_URL}${photo.url}`}
                alt={`${photo.kind === "food" ? "Food" : "Restaurant"} photo for ${submission.restaurant.name}`}
                loading="lazy"
              />
              <figcaption>
                {photo.kind === "food" ? "Food" : "Restaurant"}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p>No photos added yet.</p>
      )}

      {editable && photos.length < 5 && (
        <details>
          <summary>Add a photo (optional)</summary>

          <form onSubmit={handleUpload}>
            <fieldset disabled={busy || needsRefresh}>
              <label>
                Photo type
                <select
                  value={kind}
                  onChange={event => setKind(event.target.value)}
                >
                  <option value="restaurant">Restaurant</option>
                  <option value="food">Food</option>
                </select>
              </label>

              <label>
                Choose photo — JPEG, PNG or WebP, up to 5 MB
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={chooseFile}
                  required
                />
              </label>

              {preview && (
                <div>
                  <img
                    className="submission-photo-preview"
                    src={preview}
                    alt="Selected photo preview"
                  />
                  <button type="button" onClick={clearSelection}>
                    Remove selection
                  </button>
                </div>
              )}

              <label className="submission-photo-permission">
                <input
                  type="checkbox"
                  checked={permission}
                  onChange={event => setPermission(event.target.checked)}
                  required
                />
                <span>
                  I took this photo or have permission to upload it.
                </span>
              </label>

              <button
                type="submit"
                disabled={!file || !permission || busy}
              >
                {busy ? "Uploading…" : "Upload photo"}
              </button>
            </fieldset>

            {error && <p role="alert">{error}</p>}
          </form>
        </details>
      )}
    </section>
  );
}