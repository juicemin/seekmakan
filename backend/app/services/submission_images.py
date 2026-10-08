from io import BytesIO
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError

UPLOAD_DIRECTORY = (
    Path(__file__).resolve().parents[2]
    / "uploads"
    / "submissions"
)

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_SAVED_BYTES = 2 * 1024 * 1024
MAX_PIXELS = 20_000_000

class InvalidSubmissionImage(Exception):
    pass

def prepare_image(raw: bytes) -> bytes:
    if not raw or len(raw) > MAX_UPLOAD_BYTES:
        raise InvalidSubmissionImage(
            "Choose an image no larger than 5 MB."
        )

    try:
        with Image.open(BytesIO(raw)) as image:
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                raise InvalidSubmissionImage(
                    "Use a JPEG, PNG or WebP image."
                )

            if getattr(image, "n_frames", 1) != 1:
                raise InvalidSubmissionImage(
                    "Animated images are not supported."
                )

            if image.width * image.height > MAX_PIXELS:
                raise InvalidSubmissionImage(
                    "This image is too large. Use an image below 20 megapixels."
                )

            image.load()
            corrected = ImageOps.exif_transpose(image)
            corrected.thumbnail((1600, 1600))

            # Flatten transparency onto white and create a fresh image.
            rgba = corrected.convert("RGBA")
            clean = Image.new("RGB", rgba.size, "white")
            clean.paste(rgba, mask=rgba.getchannel("A"))

            output = BytesIO()
            clean.save(output, format="JPEG", quality=85, optimize=True)
            result = output.getvalue()

    except InvalidSubmissionImage:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
    ):
        raise InvalidSubmissionImage(
            "The file could not be read as a supported image."
        ) from None

    if len(result) > MAX_SAVED_BYTES:
        raise InvalidSubmissionImage(
            "The processed image is still too large. Choose a smaller photo."
        )

    return result