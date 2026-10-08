import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getMySubmissions } from "../api/submissions";
import RestaurantContribution from "../components/RestaurantContribution";
import WithdrawSubmissionButton from "../components/WithdrawSubmissionButton";
import SubmissionPhotos from "../components/SubmissionPhotos";

function CommunityContent() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");

    getMySubmissions(page)
      .then(result => {
        if (cancelled) return;

        const lastPage = Math.max(1, result.total_pages);

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setData(result);
        setStatus("ready");
      })
      .catch(requestError => {
        if (cancelled) return;

        setStatus(requestError.status === 401 ? "guest" : "error");
        setError(requestError.message);
      });

    return () => {
      cancelled = true;
    };
  }, [page, revision]);

  function handleSubmitted(successMessage) {
    setMessage(successMessage);
    setShowForm(false);
    setPage(1);
    setRevision(value => value + 1);
  }

  function handleSessionExpired() {
    setShowForm(false);
    setData(null);
    setStatus("guest");
    window.dispatchEvent(new Event("seekmakan:session-changed"));
  }

  return (
    <main className="page community-page">
      <h1>Community</h1>
      <p>
        Help others discover local places by submitting a missing restaurant.
      </p>

      {message && <p role="status">{message}</p>}

      {status === "guest" ? (
        <p>
          <Link to="/community?auth=login">Log in</Link>
          {" "}to submit a restaurant and track your submissions.
        </p>
      ) : status === "loading" ? (
        <p role="status">Loading your submissions…</p>
      ) : status === "error" ? (
        <div>
          <p role="alert">{error}</p>
          <button
            type="button"
            onClick={() => setRevision(value => value + 1)}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {!showForm ? (
            <button type="button" onClick={() => setShowForm(true)}>
              Submit a restaurant
            </button>
          ) : (
            <section>
              <h2>Submit a restaurant</h2>
              <p>
                Your submission will remain pending and will not appear
                in Discovery yet. Check Discovery first to avoid duplicates.
              </p>

              <RestaurantContribution
                onSubmitted={handleSubmitted}
                onSessionExpired={handleSessionExpired}
                />
            </section>
          )}

          <section className="my-submissions">
            <h2>My submissions</h2>

            <button
              type="button"
              onClick={() => {
                if (
                  showForm &&
                  !window.confirm(
                    "Refreshing will close the form and discard unsent changes. Continue?"
                  )
                ) {
                  return;
                }

                setShowForm(false);
                setRevision(value => value + 1);
              }}
            >
              Refresh submissions
            </button>

            {data?.total === 0 ? (
              <p>You haven’t submitted any restaurants yet.</p>
            ) : (
              <div className="submission-list">
                {data?.items.map(item => (
                  <article className="submission-item" key={item.id}>
                    <h3>{item.restaurant.name}</h3>
                    <p>{item.restaurant.address.full_address}</p>

                    {!item.restaurant.location && (
                        <p>Location awaiting confirmation</p>
                    )}
                    <p>
                      Status:{" "}
                      <strong>
                        {item.status === "pending"
                          ? "Pending — not published"
                          : item.status}
                      </strong>
                    </p>

                    {!showForm &&
                        ["pending", "changes_requested"].includes(item.status) && (
                            <WithdrawSubmissionButton
                                submissionId={item.id}
                                onWithdrawn={handleSubmitted}
                                onSessionExpired={handleSessionExpired}
                            />
                        )}

                    <details>
                      <summary>View submitted information</summary>
                      <p>
                        Description:{" "}
                        {item.restaurant.description || "Not provided"}
                      </p>
                      <p>
                        Cuisines:{" "}
                        {item.restaurant.cuisines.join(", ") || "Not provided"}
                      </p>
                      <p>
                        Foods:{" "}
                        {item.restaurant.food_categories.join(", ") ||
                          "Not provided"}
                      </p>
                      <p>
                        Price: {item.restaurant.price_range || "Not provided"}
                      </p>
                    </details>
                    {!showForm && (
                        <SubmissionPhotos
                            submission={item}
                            onUploaded={handleSubmitted}
                            onSessionExpired={handleSessionExpired}
                        />
                    )}
                  </article>
                ))}
              </div>
            )}

            {data?.total_pages > 1 && !showForm && (
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
          </section>
        </>
      )}
    </main>
  );
}

export default function CommunityPage() {
  const [sessionRevision, setSessionRevision] = useState(0);

  useEffect(() => {
    function handleSessionChange() {
      setSessionRevision(value => value + 1);
    }

    window.addEventListener(
      "seekmakan:session-changed",
      handleSessionChange
    );

    return () => {
      window.removeEventListener(
        "seekmakan:session-changed",
        handleSessionChange
      );
    };
  }, []);

  return <CommunityContent key={sessionRevision} />;
}