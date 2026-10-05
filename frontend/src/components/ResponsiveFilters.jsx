import { useEffect, useId, useRef, useState } from "react";

export default function ResponsiveFilters({
  open,
  onClose,
  children,
  title = "Filters",
  variant = "filters",
  desktopClassName = "desktop-filters",
}) {
  const titleId = useId();
  const dialogRef = useRef(null);

  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 800px)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 800px)");

    function handleChange(event) {
      setIsMobile(event.matches);
      onClose();
    }

    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, [onClose]);

  useEffect(() => {
    if (!isMobile || !open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;

      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isMobile, open]);

  if (!isMobile) {
    return <div className={desktopClassName}>{children}</div>;
  }

  return (
    <dialog
      ref={dialogRef}
      className={
        variant === "map"
        ? "filter-drawer map-sheet"
        : "filter-drawer"
    }
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="filter-drawer__header">
        <h2 id={titleId}>{title}</h2>

        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>

      {children}
    </dialog>
  );
}