import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import AdminReviewActions from "../components/AdminReviewActions";
import AdminLocationConfirmation from "../components/AdminLocationConfirmation";

export default function AdminSubmissionsPage() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    function sessionChanged() {
      setData(null);
      setStatus("loading");
      setRevision(value => value + 1);
    }

    window.addEventListener("seekmakan:session-changed", sessionChanged);
    return () =>
      window.removeEventListener("seekmakan:session-changed", sessionChanged);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setStatus("loading");
    setError("");

    async function load() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/admin/submissions?page=${page}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof result.detail === "string"
              ? result.detail
              : "Unable to load submissions."
          );
        }

        if (controller.signal.aborted) return;

        const lastPage = Math.max(1, result.total_pages);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setData(result);
        setStatus("ready");
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(failure.message);
        setStatus("error");
      }
    }

    load();
    return () => controller.abort();
  }, [page, revision]);

  return (
    <main className="page admin-submissions">
      <h1>Restaurant submission review</h1>

      {message && <p role="status">{message}</p>}

      <button
        type="button"
        onClick={() => setRevision(value => value + 1)}
      >
        Refresh
      </button>

      {status === "loading" && <p role="status">Loading submissions…</p>}
      {status === "error" && <p role="alert">{error}</p>}

      {status === "ready" && (
        <>
          <p>{data.total} pending submissions</p>

          {data.items.map(item => {
            const restaurant = item.restaurant;

            return (
              <article className="submission-item" key={item.id}>
                <h2>{restaurant.name}</h2>
                <p>{restaurant.address.full_address}</p>
                <p>Status: Pending review</p>

                <dl>
                  <dt>Cuisines</dt>
                  <dd>{restaurant.cuisines.join(", ") || "Not provided"}</dd>

                  <dt>Foods served</dt>
                  <dd>
                    {restaurant.food_categories.join(", ") || "Not provided"}
                  </dd>

                  <dt>Price</dt>
                  <dd>{restaurant.price_range || "Not provided"}</dd>

                  <dt>Description</dt>
                  <dd>{restaurant.description || "Not provided"}</dd>

                  <dt>Map location</dt>
                  <dd>
                    {restaurant.location
                      ? `Longitude: ${restaurant.location.coordinates[0]}, latitude: ${restaurant.location.coordinates[1]}`
                      : "Location needs confirmation before approval"}
                  </dd>
                </dl>

                <details>
                  <summary>Opening hours</summary>
                  {Object.keys(restaurant.operating_hours ?? {}).length === 0
                    ? <p>Not provided</p>
                    : Object.entries(restaurant.operating_hours).map(
                        ([day, hours]) => (
                          <p key={day}>
                            {day}:{" "}
                            {hours.status === "closed"
                              ? "Closed"
                              : hours.status === "open_24_hours"
                                ? "Open 24 hours"
                                : `${hours.open}–${hours.close}`}
                          </p>
                        )
                      )}
                </details>

                {!item.restaurant.location && !item.is_own_submission && (
                    <AdminLocationConfirmation
                        submission={item}
                        onSaved={successMessage => {
                            setMessage(successMessage);
                            setRevision(value => value + 1);
                        }}
                    />
                )}

                <AdminReviewActions
                    submission={item}
                    onReviewed={successMessage => {
                        setMessage(successMessage);
                        setRevision(value => value + 1);
                    }}
                />

              </article>
            );
          })}

          {data.total_pages > 1 && (
            <nav className="pagination" aria-label="Submission pages">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(value => value - 1)}
              >
                Previous
              </button>
              <span>Page {page} of {data.total_pages}</span>
              <button
                type="button"
                disabled={page >= data.total_pages}
                onClick={() => setPage(value => value + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}