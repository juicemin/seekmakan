from enum import Enum

class VerificationStatus(str, Enum):
    SEEDED = "seeded"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"

class VisibilityStatus(str, Enum):
    ACTIVE = "active"
    HIDDEN = "hidden"
    REMOVED = "removed"

class SourceType(str, Enum):
    MANUAL = "manual"
    OSM = "osm"
    GOOGLE_PLACES = "google_places"

class PriceRange(str, Enum):
    BUDGET = "RM1-RM20"
    MODERATE = "RM21-RM50"
    EXPENSIVE = "RM51+"