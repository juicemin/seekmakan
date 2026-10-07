import RestaurantPhoto from "./RestaurantPhoto";

export default function RestaurantPhotoGallery({
  photos = [],
  kind,
  title,
}) {
  const matchingPhotos = photos.filter(photo => photo.kind === kind);

  return (
    <section aria-label={title}>
      <h2>{title}</h2>

      {matchingPhotos.length === 0 ? (
        <p>No photos available yet.</p>
      ) : (
        <div className="restaurant-photo-grid">
          {matchingPhotos.map((photo, index) => (
            <RestaurantPhoto
              key={`${photo.url}-${index}`}
              photo={photo}
            />
          ))}
        </div>
      )}
    </section>
  );
}