import os
import json
import uuid
import base64
import logging
import re
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated, Any

import requests
from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator
from dotenv import load_dotenv

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("kht")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# Bundled default Nikko COLOR SCALE reference board (0-10)
REF_FILE = ROOT_DIR / "reference" / "color_scale.jpg"


def read_bundled_reference() -> bytes:
    with open(REF_FILE, "rb") as f:
        return f.read()

# ---------------------------------------------------------------------------
# Object storage
# ---------------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "kht-ai-vision"
_storage_key: Optional[str] = None


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    global _storage_key
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 503:
        _storage_key = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------------------
# Mongo helpers
# ---------------------------------------------------------------------------
def _validate_object_id(v: Any) -> str:
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Parameters(BaseModel):
    deposit_area_pct: float = 0
    deposit_length_mm: float = 0
    deposit_coverage_pct: float = 0
    avg_intensity_l: float = 0
    avg_color_a: float = 0
    avg_color_b: float = 0
    max_intensity: float = 0
    thickness_index_mm: float = 0
    deposit_start_mm: float = 0
    deposit_end_mm: float = 0


class TestMeta(BaseModel):
    sample_id: str = ""
    oil_type: str = ""
    batch: str = ""
    operator: str = ""
    temperature_c: float = 320
    duration_hours: float = 16
    air_flow: float = 10
    oil_flow: float = 0.31
    remark: str = ""


class AnalyzeRequest(TestMeta):
    image_path: str


class TestRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_path: str
    meta: TestMeta
    rating: float = 0
    performance: str = ""
    confidence: float = 0
    status: str = "PASS"
    deposit_level_label: str = ""
    parameters: Parameters = Field(default_factory=Parameters)
    ai_summary: str = ""
    ai_model: str = "gemini-3.1-pro-preview"
    created_at: str = Field(default_factory=now_iso)
    deleted_at: Optional[str] = None


app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# AI Vision analysis
# ---------------------------------------------------------------------------
RATING_REFERENCE = """KHT (Komatsu Hot Tube Tester) standard deposit rating scale (0-10),
matching the Nikko COLOR SCALE reference board:
10 = perfectly clear / colorless glass, 0% deposit (None) -> EXCELLENT
9  = very faint pale yellow, <5% (Very Slight) -> EXCELLENT
8  = pale yellow, 5-15% (Slight) -> VERY GOOD
7  = light straw / yellow, 15-30% (Light) -> GOOD
6  = yellow-amber, 30-45% (Moderate) -> FAIR
5  = amber / light brown, 45-60% (Moderate Heavy) -> FAIR
4  = brown, 60-75% (Heavy) -> POOR
3  = dark brown, 75-90% (Very Heavy) -> POOR
2  = very dark brown, 90-100% (Extremely Heavy) -> VERY POOR
1  = near-black brown -> FAILED
0  = black, 100% (Plugged) -> FAILED
On the reference board the CLEAR tube = 10 and the BLACK tube = 0.
PASS if rating >= 7, otherwise FAIL."""

ANALYSIS_PROMPT = f"""You are the KHT-AI-V2 deposit rating engine for a Komatsu Hot Tube Tester (HTT).

You are given TWO images:
1) The FIRST image is the official Nikko COLOR SCALE reference board. It shows a row of standard
   test tubes each labelled 0 to 10. The tube that is completely CLEAR/colorless is 10 (best, no
   deposit) and the tube that is BLACK/darkest is 0 (worst, fully plugged). The tubes between them
   go clear -> pale yellow -> amber -> brown -> dark brown -> black as the number decreases.
2) The SECOND image is the SAMPLE tube (already cropped by the operator) that you must rate.

Your task: visually COMPARE the deposit color and darkness of the SAMPLE tube against the reference
tubes on the COLOR SCALE board, and assign the rating (0-10) of the reference tube whose color it most
closely matches. Base the rating ONLY on the deposit visible in the sample; ignore glass reflections,
glare and background.

{RATING_REFERENCE}

Also estimate the deposit geometry along the sample tube (assume usable length 300mm) and approximate
CIE L*a*b* (L* lightness 0-100, a* red-green, b* yellow-blue; darker/heavier deposit = lower L*, higher a*/b*).

Return ONLY a valid minified JSON object (no markdown, no explanation) with EXACTLY these keys:
{{
 "rating": <number 0-10, one decimal, matched against the COLOR SCALE board>,
 "performance": <one of "EXCELLENT","VERY GOOD","GOOD","FAIR","POOR","VERY POOR","FAILED">,
 "confidence": <number 0-100>,
 "status": <"PASS" or "FAIL">,
 "deposit_level_label": <short string like "5 - 15% (Slight)">,
 "deposit_area_pct": <number>,
 "deposit_length_mm": <number>,
 "deposit_coverage_pct": <number>,
 "avg_intensity_l": <number 0-100>,
 "avg_color_a": <number>,
 "avg_color_b": <number>,
 "max_intensity": <number 0-255>,
 "thickness_index_mm": <number>,
 "deposit_start_mm": <number 0-300>,
 "deposit_end_mm": <number 0-300>,
 "summary": <one short sentence in BAHASA INDONESIA that JUSTIFIES the rating by referring to which COLOR SCALE band it matches and where the deposit sits, e.g. "Warna endapan cokelat sedang cocok dengan skala 5 pada COLOR SCALE, terlihat di area tengah tabung.">
}}"""


def _parse_ai_json(text: str) -> dict:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    else:
        m = re.search(r"(\{.*\})", text, re.DOTALL)
        if m:
            text = m.group(1)
    return json.loads(text)


async def run_ai_vision(image_b64: str) -> dict:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"kht-{uuid.uuid4()}",
        system_message="You are a precise industrial machine-vision inspection model that only outputs JSON.",
    ).with_model("gemini", "gemini-3.1-pro-preview")
    resp = await chat.send_message(
        UserMessage(text=ANALYSIS_PROMPT, file_contents=[ImageContent(image_base64=image_b64)])
    )
    data = _parse_ai_json(resp if isinstance(resp, str) else str(resp))
    return data


def _clamp(v, lo, hi, default=0.0):
    try:
        return max(lo, min(hi, float(v)))
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "KHT AI VISION API"}


@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    data = await file.read()
    ext = (file.filename or "photo.jpg").split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    content_type = file.content_type or f"image/{'jpeg' if ext in ('jpg', 'jpeg') else ext}"
    path = f"{APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    try:
        await run_in_threadpool(put_object, path, data, content_type)
    except Exception as e:
        logger.exception("upload failed")
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {e}")
    return {"image_path": path}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        content, content_type = await run_in_threadpool(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=content, media_type=content_type)


@api_router.post("/analyze", response_model=TestRecord)
async def analyze(req: AnalyzeRequest):
    try:
        content, _ = await run_in_threadpool(get_object, req.image_path)
    except Exception:
        raise HTTPException(status_code=404, detail="Image not found in storage")

    b64 = base64.b64encode(content).decode("utf-8")
    try:
        ai = await run_ai_vision(b64)
    except Exception as e:
        logger.exception("AI vision failed")
        raise HTTPException(status_code=502, detail=f"AI Vision analysis failed: {e}")

    rating = _clamp(ai.get("rating"), 0, 10)
    params = Parameters(
        deposit_area_pct=_clamp(ai.get("deposit_area_pct"), 0, 100),
        deposit_length_mm=_clamp(ai.get("deposit_length_mm"), 0, 300),
        deposit_coverage_pct=_clamp(ai.get("deposit_coverage_pct"), 0, 100),
        avg_intensity_l=_clamp(ai.get("avg_intensity_l"), 0, 100),
        avg_color_a=_clamp(ai.get("avg_color_a"), -128, 128),
        avg_color_b=_clamp(ai.get("avg_color_b"), -128, 128),
        max_intensity=_clamp(ai.get("max_intensity"), 0, 255),
        thickness_index_mm=_clamp(ai.get("thickness_index_mm"), 0, 50),
        deposit_start_mm=_clamp(ai.get("deposit_start_mm"), 0, 300),
        deposit_end_mm=_clamp(ai.get("deposit_end_mm"), 0, 300),
    )
    meta = TestMeta(**req.model_dump(exclude={"image_path"}))
    record = TestRecord(
        image_path=req.image_path,
        meta=meta,
        rating=rating,
        performance=str(ai.get("performance", "")).upper(),
        confidence=_clamp(ai.get("confidence"), 0, 100),
        status=str(ai.get("status", "PASS")).upper() if ai.get("status") else ("PASS" if rating >= 7 else "FAIL"),
        deposit_level_label=str(ai.get("deposit_level_label", "")),
        parameters=params,
        ai_summary=str(ai.get("summary", "")),
    )
    await db.tests.insert_one(record.model_dump())
    return record


@api_router.get("/tests", response_model=List[TestRecord])
async def list_tests(q: Optional[str] = None):
    query: dict = {"deleted_at": None}
    if q:
        query["$or"] = [
            {"meta.sample_id": {"$regex": q, "$options": "i"}},
            {"meta.oil_type": {"$regex": q, "$options": "i"}},
            {"meta.batch": {"$regex": q, "$options": "i"}},
            {"meta.operator": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.tests.find(query).sort("created_at", -1).to_list(500)
    return [TestRecord(**d) for d in docs]


@api_router.get("/tests/{test_id}", response_model=TestRecord)
async def get_test(test_id: str):
    doc = await db.tests.find_one({"id": test_id, "deleted_at": None})
    if not doc:
        raise HTTPException(status_code=404, detail="Test not found")
    return TestRecord(**doc)


@api_router.delete("/tests/{test_id}")
async def delete_test(test_id: str):
    res = await db.tests.update_one({"id": test_id}, {"$set": {"deleted_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    return {"ok": True}


@api_router.get("/dashboard")
async def dashboard():
    docs = await db.tests.find({"deleted_at": None}).sort("created_at", -1).to_list(500)
    tests = [TestRecord(**d) for d in docs]
    total = len(tests)
    passed = sum(1 for t in tests if t.status == "PASS")
    avg_rating = round(sum(t.rating for t in tests) / total, 1) if total else 0
    latest = tests[0].model_dump() if tests else None
    return {
        "latest": latest,
        "total": total,
        "passed": passed,
        "failed": total - passed,
        "avg_rating": avg_rating,
    }


@api_router.get("/trend")
async def trend():
    docs = await db.tests.find({"deleted_at": None}).sort("created_at", 1).to_list(500)
    tests = [TestRecord(**d) for d in docs]
    return [
        {
            "id": t.id,
            "rating": t.rating,
            "status": t.status,
            "sample_id": t.meta.sample_id,
            "created_at": t.created_at,
        }
        for t in tests
    ]


# ---------------------------------------------------------------------------
# Seed demo data
# ---------------------------------------------------------------------------
SEED = [
    {
        "sample_id": "KHT-2026-07-30-001", "oil_type": "Engine Oil SAE 15W-40", "batch": "LOT-20260730-A",
        "operator": "Karis Setia", "rating": 8.7, "performance": "VERY GOOD", "confidence": 98.2, "status": "PASS",
        "deposit_level_label": "5 - 15% (Slight)",
        "p": [8.9, 125, 44.6, 54.2, 9.6, 19.8, 132, 0.42, 90, 215],
        "img": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "summary": "Thin uniform light-brown deposit concentrated near the tube center, minimal coverage.",
    },
    {
        "sample_id": "KHT-2026-07-28-004", "oil_type": "Hydraulic Oil HO-46", "batch": "LOT-20260728-C",
        "operator": "Karis Setia", "rating": 6.2, "performance": "FAIR", "confidence": 95.1, "status": "FAIL",
        "deposit_level_label": "30 - 45% (Moderate)",
        "p": [32.4, 190, 61.3, 41.0, 14.2, 26.4, 178, 0.71, 55, 245],
        "img": "https://images.unsplash.com/photo-1581093458791-9d09a5c0a5b9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "summary": "Moderate dark deposit spread across most of the tube with heavier build-up mid-section.",
    },
    {
        "sample_id": "KHT-2026-07-25-002", "oil_type": "Engine Oil SAE 10W-30", "batch": "LOT-20260725-B",
        "operator": "Dwi Agus", "rating": 9.4, "performance": "EXCELLENT", "confidence": 97.6, "status": "PASS",
        "deposit_level_label": "< 5% (Very Slight)",
        "p": [3.1, 60, 18.2, 68.5, 4.1, 11.2, 96, 0.18, 120, 180],
        "img": "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "summary": "Very clean tube with only faint traces of light deposit, excellent oxidation stability.",
    },
    {
        "sample_id": "KHT-2026-07-22-007", "oil_type": "Gear Oil GL-5 85W-140", "batch": "LOT-20260722-D",
        "operator": "Dwi Agus", "rating": 4.1, "performance": "POOR", "confidence": 92.8, "status": "FAIL",
        "deposit_level_label": "60 - 75% (Heavy)",
        "p": [63.7, 250, 82.5, 28.3, 19.8, 31.6, 212, 1.12, 30, 285],
        "img": "https://images.unsplash.com/photo-1614308457932-e16d85c5d053?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "summary": "Heavy dark carbon deposit covering nearly the full tube length, poor thermal stability.",
    },
]


async def seed():
    if await db.tests.count_documents({}) > 0:
        return
    logger.info("Seeding demo KHT tests...")
    base = datetime.now(timezone.utc)
    n = len(SEED)
    for i, s in enumerate(SEED):
        p = s["p"]
        rec = TestRecord(
            image_path=s["img"],
            meta=TestMeta(
                sample_id=s["sample_id"], oil_type=s["oil_type"], batch=s["batch"], operator=s["operator"],
                temperature_c=320, duration_hours=16, air_flow=10, oil_flow=0.31,
            ),
            rating=s["rating"], performance=s["performance"], confidence=s["confidence"], status=s["status"],
            deposit_level_label=s["deposit_level_label"], ai_summary=s["summary"],
            parameters=Parameters(
                deposit_area_pct=p[0], deposit_length_mm=p[1], deposit_coverage_pct=p[2], avg_intensity_l=p[3],
                avg_color_a=p[4], avg_color_b=p[5], max_intensity=p[6], thickness_index_mm=p[7],
                deposit_start_mm=p[8], deposit_end_mm=p[9],
            ),
        )
        rec_dict = rec.model_dump()
        rec_dict["created_at"] = (base - timedelta(days=i * 3)).isoformat()
        await db.tests.insert_one(rec_dict)


@app.on_event("startup")
async def on_startup():
    try:
        await run_in_threadpool(init_storage)
    except Exception as e:
        logger.warning("Storage init deferred: %s", e)
    try:
        await seed()
    except Exception as e:
        logger.warning("Seed failed: %s", e)


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
