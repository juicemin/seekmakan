from datetime import datetime, timezone

from bson import ObjectId
from fastapi.testclient import TestClient
import pytest

from app.database import get_database
from app.main import app


class Cursor:
    def __init__(self, documents):
        self.documents = documents

    def sort(self, key, direction):
        self.documents.sort(key=lambda document: document[key], reverse=direction < 0)
        return self

    def skip(self, amount):
        self.documents = self.documents[amount:]
        return self

    def limit(self, amount):
        self.documents = self.documents[:amount]
        return self

    def __iter__(self):
        return iter(self.documents)


class Collection:
    def __init__(self, documents):
        self.documents = documents

    def find(self, query):
        return Cursor([d for d in self.documents if all(d.get(k) == v for k, v in query.items())])

    def count_documents(self, query):
        return len(list(self.find(query)))


@pytest.fixture
def client():
    now = datetime.now(timezone.utc)
    documents = [{
        "_id": ObjectId(f"{index:024x}"), "name": f"Restaurant {index}",
        "address": {"full_address": "12 Test Street", "city": "Nilai", "state": "Negeri Sembilan"},
        "location": {"type": "Point", "coordinates": [101.7972, 2.8141]},
        "visibility_status": "active" if index <= 5 else "hidden",
        "created_at": now, "updated_at": now,
    } for index in range(6, 0, -1)]
    collection = Collection(documents)
    previous = app.dependency_overrides.copy()
    app.dependency_overrides[get_database] = lambda: {"restaurants": collection}
    with TestClient(app) as test_client:
        yield test_client, collection
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous)


def test_pag01_defaults(client):
    response = client[0].get("/api/restaurants")
    assert response.status_code == 200
    data = response.json()
    assert (data["page"], data["page_size"], data["total"], data["total_pages"]) == (1, 20, 5, 1)
    assert len(data["items"]) == 5


def test_pag02_pages_stable_and_exclude_hidden(client):
    pages = [client[0].get(f"/api/restaurants?page={page}&page_size=2").json() for page in (1, 2, 3)]
    assert [len(page["items"]) for page in pages] == [2, 2, 1]
    assert all(page["total"] == 5 and page["total_pages"] == 3 for page in pages)
    names = [item["name"] for page in pages for item in page["items"]]
    assert names == [f"Restaurant {i}" for i in range(1, 6)]


def test_pag03_out_of_range(client):
    response = client[0].get("/api/restaurants?page=4&page_size=2")
    assert response.status_code == 200
    assert response.json() == {"items": [], "page": 4, "page_size": 2, "total": 5, "total_pages": 3}


def test_pag04_empty(client):
    client[1].documents.clear()
    response = client[0].get("/api/restaurants")
    assert response.status_code == 200
    assert response.json() == {"items": [], "page": 1, "page_size": 20, "total": 0, "total_pages": 0}


@pytest.mark.parametrize("query", ["page=0", "page=-1", "page=abc", "page_size=0", "page_size=101", "page_size=1.5"])
def test_pag05_invalid_parameters(client, query):
    assert client[0].get(f"/api/restaurants?{query}").status_code == 422


def test_pag06_page_size_boundary(client):
    response = client[0].get("/api/restaurants?page_size=100")
    assert response.status_code == 200
    assert response.json()["page_size"] == 100
