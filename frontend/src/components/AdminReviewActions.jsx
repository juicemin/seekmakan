import { useRef, useState } from "react";
import { API_BASE_URL } from "../config";

export default function AdminReviewActions({ submission, onReviewed }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const sending = useRef(false);

  async function review(action) {
    if (sending.current || needsRefresh) return;
    setError("");

    if (action === "reject" && !reason.trim()) {
      setError("Enter a rejection reason.");
      return;
    }

    if (!window.confirm(
      action === "approve"
        ? "Approve and publish this restaurant?"
        : "Reject this submission?"
    )) return;

    sending.current = true;
    setBusy(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/submissions/${submission.id}/review`,
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "SeekMakan",
          },
          body: JSON.stringify({ action, reason: reason.trim() }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status >= 500 || response.status === 409) {
          setNeedsRefresh(true);
        }

        setError(
          typeof result.detail === "string"
            ? result.detail
            : "Review failed. Refresh and check the submission."
        );
        return;
      }

      onReviewed(result.message);
    } catch {
      setNeedsRefresh(true);
      setError(
        "Review could not be confirmed. Refresh the list before retrying."
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  if (submission.is_own_submission) {
    return <p>Your submission — another administrator must review.</p>;
  }

  return (
    <section className="admin-review-actions">
      {!submission.restaurant.location && (
        <p>Approval unavailable: location needs confirmation.</p>
      )}

      <label>
        Review note — required when rejecting
        <textarea
          value={reason}
          maxLength={500}
          rows={2}
          disabled={busy || needsRefresh}
          onChange={event => setReason(event.target.value)}
        />
      </label>

      <div>
        <button
          type="button"
          disabled={busy || needsRefresh || !submission.restaurant.location}
          onClick={() => review("approve")}
        >
          Approve and publish
        </button>

        <button
          type="button"
          disabled={busy || needsRefresh}
          onClick={() => review("reject")}
        >
          Reject
        </button>
      </div>

      {busy && <p role="status">Saving decision…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}