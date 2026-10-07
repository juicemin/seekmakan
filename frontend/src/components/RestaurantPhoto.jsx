import { useState } from "react";

export default function RestaurantPhoto({
  photo,
  className = "",
}) {
  const [failedUrl, setFailedUrl] = useState(null);

  if (!photo?.url || failedUrl === photo.url) {
    return (
      <div className={`restaurant-photo-placeholder ${className}`}>
        Photo unavailable
      </div>
    );
  }

  return (
    <figure className={`restaurant-photo ${className}`}>
      <img
        src={photo.url}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(photo.url)}
      />

      {photo.credit && (
        <figcaption>{photo.credit}</figcaption>
      )}
    </figure>
  );
}