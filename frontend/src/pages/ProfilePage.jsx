import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { getProfile, postAuth } from "../api/auth";
import { getRestaurantFilterOptions } from "../api/restaurants";
import CheckboxDropdown from "../components/CheckboxDropdown";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onboarding = searchParams.get("setup") === "1";

  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [preferences, setPreferences] = useState({
    cuisines: [],
    food_categories: [],
    price_ranges: [],
  });
  const [options, setOptions] = useState({
    cuisines: [],
    food_categories: [],
    price_ranges: [],
  });

  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [optionsWarning, setOptionsWarning] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getProfile();
        if (cancelled) return;

        setProfile(result.profile);
        setDisplayName(result.profile.display_name);
        setPreferences(result.profile.preferences);
        setOptions(current => ({
          ...current,
          price_ranges: result.price_options,
        }));

        try {
          const filters = await getRestaurantFilterOptions();
          if (cancelled) return;

          setOptions({
            cuisines: filters.cuisines,
            food_categories: filters.food_categories,
            price_ranges: result.price_options,
          });
        } catch {
          if (!cancelled) {
            setOptionsWarning(
              "Food options could not be loaded. Your saved choices are preserved."
            );
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setGuest(requestError.status === 401);
          setError(requestError.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  function updatePreference(field, values) {
    setPreferences(current => ({
      ...current,
      [field]: values,
    }));
  }

  function availableOptions(field) {
    // Preserve saved choices even if restaurant data changes later.
    return [...new Set([...options[field], ...preferences[field]])];
  }

  async function handleSave(event) {
    event.preventDefault();
    if (submitting.current) return;

    submitting.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await postAuth("profile", {
        display_name: displayName,
        preferences,
      });

      setProfile(result.profile);
      setDisplayName(result.profile.display_name);
      setPreferences(result.profile.preferences);
      setMessage(result.message);

      window.dispatchEvent(new Event("seekmakan:session-changed"));

      if (onboarding) navigate("/restaurants");
    } catch (requestError) {
      if (requestError.status === 401) setGuest(true);
      setError(requestError.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function handleSkip() {
    if (submitting.current) return;

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      await postAuth("skip-preferences");
      window.dispatchEvent(new Event("seekmakan:session-changed"));
      navigate("/restaurants");
    } catch (requestError) {
      if (requestError.status === 401) setGuest(true);
      setError(requestError.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="page"><p>Loading your profile…</p></main>;
  }

  if (guest) {
    return (
      <main className="page">
        <h1>Your profile</h1>
        <p>Please log in to view and edit your profile.</p>
        <Link to="/login">Log in</Link>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="page">
        <h1>Your profile</h1>
        <p role="alert">{error || "Your profile could not be loaded."}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className="page profile-page">
      <h1>{onboarding ? "Tell us what you like" : "Your profile"}</h1>

      <p>
        Preferences are optional. You can leave selections empty and change
        them later.
      </p>

      <form className="profile-form" onSubmit={handleSave}>
        <fieldset disabled={busy} className="profile-fields">
          <legend>Account details</legend>

          <label htmlFor="profile-name">Display name</label>
          <input
            id="profile-name"
            value={displayName}
            onChange={event => setDisplayName(event.target.value)}
            maxLength={80}
            required
          />

          <label htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            value={profile.email}
            readOnly
          />
          <small>Email verified. Email changes are not available here.</small>
        </fieldset>

        <fieldset disabled={busy} className="profile-fields">
          <legend>Food preferences — optional</legend>

          {optionsWarning && <p role="status">{optionsWarning}</p>}

          <CheckboxDropdown
            label="Preferred cuisines"
            options={availableOptions("cuisines")}
            selected={preferences.cuisines}
            onChange={values => updatePreference("cuisines", values)}
          />

          <CheckboxDropdown
            label="Preferred food categories"
            options={availableOptions("food_categories")}
            selected={preferences.food_categories}
            onChange={values => updatePreference("food_categories", values)}
          />

          <CheckboxDropdown
            label="Preferred price ranges"
            options={availableOptions("price_ranges")}
            selected={preferences.price_ranges}
            onChange={values => updatePreference("price_ranges", values)}
          />

          <small>No selection means no preference.</small>
        </fieldset>

        <div className="profile-actions">
          <button type="submit" disabled={busy}>
            {busy ? "Please wait…" : onboarding ? "Save and continue" : "Save changes"}
          </button>

          {onboarding && (
            <button type="button" onClick={handleSkip} disabled={busy}>
              Skip for now
            </button>
          )}

          {!onboarding && <Link to="/restaurants">Back to discovery</Link>}
        </div>
      </form>

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}