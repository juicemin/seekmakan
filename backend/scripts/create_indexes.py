from app.database import (
    close_database_connection,
    get_database,
)
from app.database_indexes import create_database_indexes


def main() -> None:
    database = get_database()

    create_database_indexes(database)

    print("SeekMakan database indexes created successfully.")


if __name__ == "__main__":
    try:
        main()
    finally:
        close_database_connection()