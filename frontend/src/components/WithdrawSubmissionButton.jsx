import { useEffect, useRef, useState } from "react";
import { withdrawSubmission } from "../api/submissions";

export default function WithdrawSubmissionButton({
  submissionId,
  onWithdrawn,
  onSessionExpired,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function handleWithdraw() {
    if (submitting.current) return;

    if (!window.confirm("Withdraw this restaurant submission?")) {
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      const result = await withdrawSubmission(submissionId);

      if (active.current) onWithdrawn(result.message);
    } catch (requestError) {
      if (!active.current) return;

      if (requestError.status === 401) {
        onSessionExpired();
      } else {
        setError(requestError.message);
      }
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={handleWithdraw}>
        {busy ? "Withdrawing…" : "Withdraw submission"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}