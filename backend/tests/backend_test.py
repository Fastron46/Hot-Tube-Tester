"""KHT AI Vision - Backend integration tests.

Tests the public API surface documented in the review request:
- Dashboard, list/search, get by id, trend
- Upload -> Analyze -> Persist pipeline (Gemini)
- Delete (soft)
"""
import io
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://komatsu-tracker.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# --- Real (non-blank) JPEG image with visual features -----------------------
# 8x8 JPEG with a gradient + a solid streak -> non-uniform, real edges.
def _make_test_jpeg() -> bytes:
    try:
        from PIL import Image, ImageDraw
        img = Image.new("RGB", (256, 512), (30, 30, 30))
        d = ImageDraw.Draw(img)
        # simulated tube walls + a brownish deposit band in the middle
        d.rectangle([80, 20, 176, 500], outline=(180, 180, 180), width=3)
        d.rectangle([90, 200, 166, 320], fill=(120, 70, 30))  # deposit
        d.rectangle([90, 100, 166, 200], fill=(200, 180, 140))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except Exception:
        # Fallback: minimal but non-uniform base64 JPEG
        b64 = (
            "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a"
            "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy"
            "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAgACADASIA"
            "AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA"
            "AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3"
            "ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm"
            "p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEA"
            "AwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSEx"
            "BhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElK"
            "U1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3"
            "uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+ii"
            "igAooooA//9k="
        )
        return base64.b64decode(b64)


TEST_IMAGE_BYTES = _make_test_jpeg()


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    return s


@pytest.fixture(scope="session")
def seeded_tests(api_client):
    r = api_client.get(f"{API}/tests", timeout=30)
    assert r.status_code == 200, r.text
    tests = r.json()
    assert isinstance(tests, list)
    return tests


# ---------------------------------------------------------------------------
# Health / dashboard
# ---------------------------------------------------------------------------
class TestDashboard:
    def test_dashboard_returns_latest_seed(self, api_client):
        r = api_client.get(f"{API}/dashboard", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("latest", "total", "passed", "failed", "avg_rating"):
            assert k in data
        assert data["total"] >= 4, f"expected at least 4 seeded, got {data['total']}"
        assert data["latest"] is not None
        latest = data["latest"]
        # Latest must at least be a well-formed record
        assert "meta" in latest and latest["meta"].get("sample_id")
        assert 0 <= latest["rating"] <= 10
        assert latest["status"] in ("PASS", "FAIL")
        # totals sanity
        assert data["passed"] + data["failed"] == data["total"]

    def test_seeded_sample_still_present(self, api_client):
        r = api_client.get(f"{API}/tests", params={"q": "KHT-2026-07-30-001"}, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        rec = rows[0]
        assert rec["rating"] == 8.7
        assert rec["status"] == "PASS"


# ---------------------------------------------------------------------------
# Tests listing / search / detail
# ---------------------------------------------------------------------------
class TestListingAndSearch:
    def test_list_tests_seeded_count(self, seeded_tests):
        assert len(seeded_tests) >= 4
        sample_ids = {t["meta"]["sample_id"] for t in seeded_tests}
        assert "KHT-2026-07-30-001" in sample_ids

    def test_search_by_sample_id(self, api_client):
        r = api_client.get(f"{API}/tests", params={"q": "KHT-2026-07-25"}, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        assert all("KHT-2026-07-25" in row["meta"]["sample_id"] for row in rows)

    def test_search_by_operator(self, api_client):
        r = api_client.get(f"{API}/tests", params={"q": "Dwi"}, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 1
        assert all("Dwi" in row["meta"]["operator"] for row in rows)

    def test_search_no_match(self, api_client):
        r = api_client.get(f"{API}/tests", params={"q": "ZZZ_NOTFOUND_XYZ"}, timeout=30)
        assert r.status_code == 200
        assert r.json() == []

    def test_get_test_by_id(self, api_client, seeded_tests):
        tid = seeded_tests[0]["id"]
        r = api_client.get(f"{API}/tests/{tid}", timeout=30)
        assert r.status_code == 200
        rec = r.json()
        assert rec["id"] == tid
        assert "parameters" in rec
        assert "meta" in rec

    def test_get_test_invalid_id(self, api_client):
        r = api_client.get(f"{API}/tests/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Trend
# ---------------------------------------------------------------------------
class TestTrend:
    def test_trend_endpoint(self, api_client):
        r = api_client.get(f"{API}/trend", timeout=30)
        assert r.status_code == 200
        points = r.json()
        assert isinstance(points, list)
        assert len(points) >= 4
        for p in points:
            for k in ("id", "rating", "status", "sample_id", "created_at"):
                assert k in p
        # ordered ascending by created_at
        stamps = [p["created_at"] for p in points]
        assert stamps == sorted(stamps)


# ---------------------------------------------------------------------------
# Native multipart shape verification (mimics expo FileSystem.uploadAsync)
# ---------------------------------------------------------------------------
class TestNativeStyleMultipartUpload:
    """expo-file-system FileSystem.uploadAsync sends a bare multipart/form-data
    body with a single part whose name is exactly the configured `fieldName`
    ('file' per api.ts). This class exercises that exact shape without letting
    `requests` add any extra parts, then verifies /api/files/{path} serves the
    same bytes back with an image content-type.
    """

    def test_upload_accepts_expo_native_multipart(self, api_client):
        # Bare, hand-crafted multipart body exactly like FileSystem.uploadAsync
        boundary = "----ExpoFileSystemBoundary" + base64.b32encode(os.urandom(6)).decode().rstrip("=")
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="photo.jpg"\r\n'
            f"Content-Type: image/jpeg\r\n\r\n"
        ).encode("utf-8") + TEST_IMAGE_BYTES + f"\r\n--{boundary}--\r\n".encode("utf-8")

        r = requests.post(
            f"{API}/upload",
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "image_path" in data and data["image_path"], data
        pytest.native_image_path = data["image_path"]

    def test_files_endpoint_returns_image_bytes(self, api_client):
        path = getattr(pytest, "native_image_path", None)
        if not path:
            pytest.skip("upload didn't run")
        r = api_client.get(f"{API}/files/{path}", timeout=30)
        assert r.status_code == 200, r.text
        ct = r.headers.get("Content-Type", "")
        assert ct.startswith("image/"), f"expected image/*, got {ct}"
        assert len(r.content) > 200, "file body too small"
        # JPEG SOI header
        assert r.content[:3] == b"\xff\xd8\xff", "not a JPEG"


# ---------------------------------------------------------------------------
# Upload -> Analyze pipeline (real AI)
# ---------------------------------------------------------------------------
class TestAnalyzePipeline:
    def test_upload_image_returns_path(self, api_client):
        files = {"file": ("TEST_tube.jpg", TEST_IMAGE_BYTES, "image/jpeg")}
        r = api_client.post(f"{API}/upload", files=files, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "image_path" in data and data["image_path"]
        pytest.image_path = data["image_path"]

    def test_analyze_returns_test_record(self, api_client):
        image_path = getattr(pytest, "image_path", None)
        if not image_path:
            pytest.skip("upload step didn't succeed")
        payload = {
            "image_path": image_path,
            "sample_id": "TEST_AI_INTEGRATION_001",
            "oil_type": "Test Oil",
            "batch": "TEST_LOT",
            "operator": "Automated Test",
            "temperature_c": 320,
            "duration_hours": 16,
            "air_flow": 10,
            "oil_flow": 0.31,
            "remark": "automated pytest",
        }
        r = api_client.post(f"{API}/analyze", json=payload, timeout=180)
        assert r.status_code == 200, r.text
        rec = r.json()
        assert 0 <= rec["rating"] <= 10
        assert rec["status"] in ("PASS", "FAIL")
        assert rec["performance"]
        assert "parameters" in rec
        params = rec["parameters"]
        for k in (
            "deposit_area_pct",
            "deposit_length_mm",
            "deposit_coverage_pct",
            "avg_intensity_l",
            "avg_color_a",
            "avg_color_b",
            "max_intensity",
            "thickness_index_mm",
        ):
            assert k in params
        assert rec["meta"]["sample_id"] == "TEST_AI_INTEGRATION_001"
        # New: AI justification (Bahasa Indonesia) must be non-empty sentence
        assert "ai_summary" in rec, rec
        summary = (rec.get("ai_summary") or "").strip()
        assert len(summary) >= 10, f"ai_summary too short/empty: {summary!r}"
        pytest.analyzed_id = rec["id"]
        pytest.analyzed_summary = summary

    def test_analyzed_record_persisted(self, api_client):
        tid = getattr(pytest, "analyzed_id", None)
        if not tid:
            pytest.skip("analyze step didn't succeed")
        r = api_client.get(f"{API}/tests/{tid}", timeout=30)
        assert r.status_code == 200
        # also check it appears in list
        r2 = api_client.get(f"{API}/tests", params={"q": "TEST_AI_INTEGRATION_001"}, timeout=30)
        assert r2.status_code == 200
        assert any(x["id"] == tid for x in r2.json())

    def test_zz_soft_delete_analyzed_record(self, api_client):
        """Kept inside this class so it runs on the same xdist worker as the
        upload/analyze steps that populate pytest.analyzed_id."""
        tid = getattr(pytest, "analyzed_id", None)
        if not tid:
            pytest.skip("no analyzed_id from analyze test")
        r = api_client.delete(f"{API}/tests/{tid}", timeout=30)
        assert r.status_code == 200
        r2 = api_client.get(f"{API}/tests/{tid}", timeout=30)
        assert r2.status_code == 404
        r3 = api_client.get(f"{API}/tests", params={"q": "TEST_AI_INTEGRATION_001"}, timeout=30)
        assert r3.status_code == 200
        assert not any(x["id"] == tid for x in r3.json())


# ---------------------------------------------------------------------------
# Delete (soft) - invalid id only; the main analyze->delete flow is now
# inside TestAnalyzePipeline so it shares a pytest-xdist worker.
# ---------------------------------------------------------------------------
class TestDelete:
    def test_delete_invalid_id_returns_404(self, api_client):
        r = api_client.delete(f"{API}/tests/does-not-exist-xyz", timeout=30)
        assert r.status_code == 404
