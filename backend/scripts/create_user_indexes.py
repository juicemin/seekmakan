from app.database import get_database, close_database_connection
from app.repositories.users import create_user_indexes
from app.repositories.favourites import create_favourite_indexes
from app.repositories.reviews import create_review_indexes
from app.repositories.submissions import create_submission_indexes

def main() -> None:
    try:
        database = get_database()
        create_user_indexes(database)
        create_favourite_indexes(database)
        create_review_indexes(database)
        create_submission_indexes(database)
        print("User indexes created successfully.")
    finally:
        close_database_connection()

if __name__ == "__main__":
    main()