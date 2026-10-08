import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { Star } from "lucide-react";
import StarRatingInput from "./StarRatingInput";
import {
  getReviews,
  getOwnReview,
  saveReview,
  deleteReview,
} from "../api/reviews";

function ReviewEditor({ restaurantId, onChanged }) {
  const location = useLocation();
  const commentId = useId();
  const [status, setStatus] = useState("loading");
  const [existing, setExisting] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const active = useRef(true);
  const submitting = useRef(false);

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");

    getOwnReview(restaurantId)
      .then(result => {
        if (cancelled) return;

        setExisting(result.review);
        setRating(result.review?.rating ?? 0);
        setComment(result.review?.comment ?? "");
        setStatus("ready");
      })
      .catch(requestError => {
        if (cancelled) return;

        if (requestError.status === 401) {
          setStatus("guest");
        } else {
          setStatus("error");
          setError(requestError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId, retry]);

  async function changeReview(remove = false) {
    if (submitting.current) return;

    if (!remove && (rating < 1 || !comment.trim())) {
      setError("Choose a star rating and write your review.");
      return;
    }

    if (
      remove &&
      !window.confirm("Delete your review and its rating?")
    ) {
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (remove) {
        await deleteReview(restaurantId);
      } else {
        await saveReview(restaurantId, {
          rating,
          comment: comment.trim(),
        });
      }

      if (!active.current) return;

      setExisting(remove ? null : { visibility_status: "visible" });

      if (remove) {
        setRating(0);
        setComment("");
      }

      setMessage(remove ? "Review deleted." : "Review saved.");

      try {
        await onChanged();
      } catch {
        if (active.current) {
          setError(
            "Your change was saved, but restaurant details could not refresh. Reload the page."
          );
        }
      }
    } catch (requestError) {
      if (!active.current) return;

      if (requestError.status === 401) {
        setStatus("guest");
        setRating(0);
        setComment("");
        setExisting(null);
        window.dispatchEvent(
          new Event("seekmakan:session-changed")
        );
      } else {
        setError(requestError.message);
      }
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  if (status === "loading") {
    return <p>Checking your review…</p>;
  }

  if (status === "guest") {
    const parameters = new URLSearchParams(location.search);
    parameters.set("auth", "login");

    return (
      <p>
        <Link
          to={`${location.pathname}?${parameters}${location.hash}`}
          state={location.state}
        >
          Log in
        </Link>
        {" "}to write a review and give a rating.
      </p>
    );
  }

  if (status === "error") {
    return (
      <div>
        <p role="alert">{error}</p>
        <button
          type="button"
          onClick={() => setRetry(value => value + 1)}
        >
          Retry loading your review
        </button>
      </div>
    );
  }

  const restricted =
    existing && existing.visibility_status !== "visible";

  return (
    <form
      className="review-form"
      onSubmit={event => {
        event.preventDefault();
        changeReview();
      }}
    >
      <h3>{existing ? "Your review" : "Write a review"}</h3>

      {restricted ? (
        <p>This review is hidden and cannot be edited.</p>
      ) : (
        <>
          <StarRatingInput
            value={rating}
            onChange={setRating}
            disabled={busy}
          />

          <label htmlFor={commentId}>Your experience</label>
          <textarea
            id={commentId}
            value={comment}
            onChange={event => setComment(event.target.value)}
            rows={4}
            maxLength={1000}
            required
            disabled={busy}
            placeholder="What did you think of the food and your visit?"
          />

          <small>{comment.length}/1000 characters</small>
        </>
      )}

      <div className="restaurant-actions__buttons">
        {!restricted && (
          <button type="submit" disabled={busy}>
            {busy
              ? "Saving…"
              : existing
                ? "Update review"
                : "Submit review"}
          </button>
        )}

        {existing && (
          <button
            type="button"
            disabled={busy}
            onClick={() => changeReview(true)}
          >
            Delete review
          </button>
        )}
      </div>

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

function ReviewsContent({ restaurantId, onRestaurantRefresh }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    getReviews(restaurantId, page)
      .then(result => {
        if (cancelled) return;

        const lastPage = Math.max(1, result.total_pages);

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setData(result);
      })
      .catch(requestError => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId, page, revision]);

  async function handleChanged() {
    setPage(1);
    setRevision(value => value + 1);
    await onRestaurantRefresh();
  }

  return (
    <section className="restaurant-reviews">
      <h2>Reviews</h2>

      <ReviewEditor
        restaurantId={restaurantId}
        onChanged={handleChanged}
      />

      {loading ? (
        <p role="status">Loading reviews…</p>
      ) : error ? (
        <div>
          <p role="alert">{error}</p>
          <button
            type="button"
            onClick={() => setRevision(value => value + 1)}
          >
            Retry loading reviews
          </button>
        </div>
      ) : data?.total === 0 ? (
        <p>No reviews yet. Be the first to share your experience.</p>
      ) : (
        <>
          <p>{data?.total} reviews</p>

          <div className="review-list">
            {data?.items.map(review => (
              <article className="review-item" key={review.id}>
                <h3>{review.display_name}</h3>

                <div
                  className="review-stars"
                  role="img"
                  aria-label={`${review.rating} out of 5 stars`}
                >
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={18}
                      fill={
                        star <= review.rating
                          ? "currentColor"
                          : "none"
                      }
                      aria-hidden="true"
                    />
                  ))}
                </div>

                <p className="review-comment">{review.comment}</p>

                <small>
                  <time dateTime={review.created_at}>
                    {new Date(review.created_at).toLocaleDateString(
                      "en-MY",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </time>
                  {review.updated_at !== review.created_at
                    ? " · Edited"
                    : ""}
                </small>
              </article>
            ))}
          </div>

          {data?.total_pages > 1 && (
            <nav className="pagination" aria-label="Review pages">
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
    </section>
  );
}

export default function RestaurantReviews(props) {
  const [sessionRevision, setSessionRevision] = useState(0);

  useEffect(() => {
    function resetForSessionChange() {
      setSessionRevision(value => value + 1);
    }

    window.addEventListener(
      "seekmakan:session-changed",
      resetForSessionChange
    );

    return () => {
      window.removeEventListener(
        "seekmakan:session-changed",
        resetForSessionChange
      );
    };
  }, []);

  return (
    <ReviewsContent
      key={`${props.restaurantId}-${sessionRevision}`}
      {...props}
    />
  );
}