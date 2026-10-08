import { useState } from "react";

function getFieldError(input, form) {
  const value = input.value;

  if (input.name === "confirmation") {
    const password = form.elements.namedItem("password");

    return value === password?.value
      ? ""
      : "Confirm password: the passwords do not match.";
  }

  if (input.required && !value.trim()) {
    return input.name === "display_name"
      ? "Enter your display name."
      : input.type === "email"
        ? "Enter your email address."
        : "Enter your password.";
  }

  if (input.type === "email" && input.validity.typeMismatch) {
    return "Enter a valid email address.";
  }

  if (
    input.name === "password" &&
    input.autocomplete === "new-password"
  ) {
    const length = Array.from(value).length;

    if (length < 10 || length > 128) {
      return "Password must contain 10–128 characters.";
    }

    if (/\s/u.test(value)) {
      return "Password must not contain spaces or other whitespace.";
    }
  }

  if (input.maxLength >= 0 && value.length > input.maxLength) {
    return `This field allows at most ${input.maxLength} characters.`;
  }

  return "";
}

export default function AuthForm({
  children,
  onSubmit,
  className = "auth-form",
}) {
  const [errors, setErrors] = useState({});

  function checkField(event, leavingField) {
    const input = event.target;
    const form = event.currentTarget;

    if (!(input instanceof HTMLInputElement) || !input.name) {
      return;
    }

    setErrors(current => {
      const next = { ...current };

      if (leavingField || Object.hasOwn(current, input.name)) {
        next[input.name] = getFieldError(input, form);
      }

      // Recheck confirmation if the original password changes.
      if (
        input.name === "password" &&
        Object.hasOwn(current, "confirmation")
      ) {
        const confirmation = form.elements.namedItem("confirmation");

        if (confirmation instanceof HTMLInputElement) {
          next.confirmation = getFieldError(confirmation, form);
        }
      }

      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const nextErrors = {};
    let firstInvalid = null;

    for (const input of Array.from(form.elements)) {
      if (!(input instanceof HTMLInputElement) || !input.name) {
        continue;
      }

      const message = getFieldError(input, form);
      nextErrors[input.name] = message;

      if (message && !firstInvalid) firstInvalid = input;
    }

    setErrors(nextErrors);

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    onSubmit(event);
  }

  const messages = Object.values(errors).filter(Boolean);

  return (
    <form
      className={className}
      noValidate
      onBlurCapture={event => checkField(event, true)}
      onInputCapture={event => checkField(event, false)}
      onSubmit={handleSubmit}
    >
      {children}

      <div aria-live="polite" aria-atomic="true">
        {messages.map(message => (
          <p className="field-error" key={message}>
            {message}
          </p>
        ))}
      </div>
    </form>
  );
}