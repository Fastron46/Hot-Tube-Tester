#!/usr/bin/env python3
"""
KHT AI VISION Backend API Test Suite
Tests the full AI Vision flow: upload -> analyze (Gemini) -> persist -> retrieve -> delete
"""
import os
import sys
import time
import requests
from pathlib import Path

# Backend URL from frontend/.env
BACKEND_URL = "https://210ebc32-4ed1-43f4-95bb-8a1090284d68.preview.emergentagent.com/api"
TEST_IMAGE_PATH = "/app/backend/reference/color_scale.jpg"

# Test metadata
TEST_SAMPLE_ID = "QA-TEST-001"
TEST_OIL_TYPE = "Engine Oil SAE 15W-40"
TEST_BATCH = "LOT-QA"
TEST_OPERATOR = "QA Bot"

# Color codes for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

def log_test(name):
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST: {name}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")

def log_success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")

def log_error(msg):
    print(f"{RED}✗ {msg}{RESET}")

def log_info(msg):
    print(f"{YELLOW}ℹ {msg}{RESET}")

def log_detail(key, value):
    print(f"  {key}: {value}")

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def test_cors_actual_request_dashboard():
    """Test CORS on actual GET /api/dashboard request with Origin header"""
    log_test("1. CORS on Actual Request - GET /api/dashboard")
    test_origin = "https://example.com"
    try:
        headers = {"Origin": test_origin}
        resp = requests.get(f"{BACKEND_URL}/dashboard", headers=headers, timeout=10)
        
        if resp.status_code != 200:
            log_error(f"Expected 200, got {resp.status_code}")
            test_results["failed"].append(f"CORS GET /api/dashboard - status {resp.status_code}")
            return False
        
        # Check CORS headers
        acao = resp.headers.get("Access-Control-Allow-Origin")
        acac = resp.headers.get("Access-Control-Allow-Credentials")
        
        log_info(f"Access-Control-Allow-Origin: {acao}")
        log_info(f"Access-Control-Allow-Credentials: {acac}")
        
        # CRITICAL: ACAO must reflect the origin, NOT "*"
        if acao != test_origin:
            log_error(f"CORS BUG: Access-Control-Allow-Origin is '{acao}', expected '{test_origin}' (reflected origin)")
            test_results["failed"].append(f"CORS GET /api/dashboard - ACAO not reflected (got '{acao}')")
            return False
        
        if acac != "true":
            log_error(f"Access-Control-Allow-Credentials is '{acac}', expected 'true'")
            test_results["failed"].append(f"CORS GET /api/dashboard - ACAC not 'true'")
            return False
        
        log_success(f"CORS headers correct: Origin reflected as '{acao}', credentials='true'")
        test_results["passed"].append("CORS GET /api/dashboard - origin reflected")
        return True
        
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"CORS GET /api/dashboard - {str(e)}")
        return False

def test_cors_actual_request_tests():
    """Test CORS on actual GET /api/tests request with Origin header"""
    log_test("2. CORS on Actual Request - GET /api/tests")
    test_origin = "https://example.com"
    try:
        headers = {"Origin": test_origin}
        resp = requests.get(f"{BACKEND_URL}/tests", headers=headers, timeout=10)
        
        if resp.status_code != 200:
            log_error(f"Expected 200, got {resp.status_code}")
            test_results["failed"].append(f"CORS GET /api/tests - status {resp.status_code}")
            return False
        
        # Check CORS headers
        acao = resp.headers.get("Access-Control-Allow-Origin")
        acac = resp.headers.get("Access-Control-Allow-Credentials")
        
        log_info(f"Access-Control-Allow-Origin: {acao}")
        log_info(f"Access-Control-Allow-Credentials: {acac}")
        
        # CRITICAL: ACAO must reflect the origin, NOT "*"
        if acao != test_origin:
            log_error(f"CORS BUG: Access-Control-Allow-Origin is '{acao}', expected '{test_origin}' (reflected origin)")
            test_results["failed"].append(f"CORS GET /api/tests - ACAO not reflected (got '{acao}')")
            return False
        
        if acac != "true":
            log_error(f"Access-Control-Allow-Credentials is '{acac}', expected 'true'")
            test_results["failed"].append(f"CORS GET /api/tests - ACAC not 'true'")
            return False
        
        log_success(f"CORS headers correct: Origin reflected as '{acao}', credentials='true'")
        test_results["passed"].append("CORS GET /api/tests - origin reflected")
        return True
        
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"CORS GET /api/tests - {str(e)}")
        return False

def test_cors_preflight_analyze():
    """Test CORS preflight OPTIONS /api/analyze"""
    log_test("3. CORS Preflight - OPTIONS /api/analyze")
    test_origin = "https://example.com"
    try:
        headers = {
            "Origin": test_origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type"
        }
        resp = requests.options(f"{BACKEND_URL}/analyze", headers=headers, timeout=10)
        
        if resp.status_code != 200:
            log_error(f"Expected 200, got {resp.status_code}")
            test_results["failed"].append(f"CORS OPTIONS /api/analyze - status {resp.status_code}")
            return False
        
        # Check CORS headers
        acao = resp.headers.get("Access-Control-Allow-Origin")
        acac = resp.headers.get("Access-Control-Allow-Credentials")
        acam = resp.headers.get("Access-Control-Allow-Methods")
        
        log_info(f"Access-Control-Allow-Origin: {acao}")
        log_info(f"Access-Control-Allow-Credentials: {acac}")
        log_info(f"Access-Control-Allow-Methods: {acam}")
        
        # CRITICAL: ACAO must reflect the origin, NOT "*"
        if acao != test_origin:
            log_error(f"CORS BUG: Access-Control-Allow-Origin is '{acao}', expected '{test_origin}' (reflected origin)")
            test_results["failed"].append(f"CORS OPTIONS /api/analyze - ACAO not reflected (got '{acao}')")
            return False
        
        if acac != "true":
            log_error(f"Access-Control-Allow-Credentials is '{acac}', expected 'true'")
            test_results["failed"].append(f"CORS OPTIONS /api/analyze - ACAC not 'true'")
            return False
        
        log_success(f"CORS preflight correct: Origin reflected as '{acao}', credentials='true'")
        test_results["passed"].append("CORS OPTIONS /api/analyze - preflight OK")
        return True
        
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"CORS OPTIONS /api/analyze - {str(e)}")
        return False

def test_api_root():
    """Test GET /api/ returns API message"""
    log_test("4. GET /api/ - API Root")
    try:
        resp = requests.get(f"{BACKEND_URL}/", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "message" in data:
                log_success(f"API root accessible: {data['message']}")
                test_results["passed"].append("GET /api/ - API root")
                return True
            else:
                log_error("Response missing 'message' field")
                test_results["failed"].append("GET /api/ - missing message field")
                return False
        else:
            log_error(f"Expected 200, got {resp.status_code}")
            test_results["failed"].append(f"GET /api/ - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/ - {str(e)}")
        return False

def test_upload_image():
    """Test POST /api/upload with color_scale.jpg"""
    log_test("5. POST /api/upload - Upload Test Image")
    try:
        if not Path(TEST_IMAGE_PATH).exists():
            log_error(f"Test image not found: {TEST_IMAGE_PATH}")
            test_results["failed"].append("POST /api/upload - test image missing")
            return None
        
        with open(TEST_IMAGE_PATH, "rb") as f:
            files = {"file": ("color_scale.jpg", f, "image/jpeg")}
            resp = requests.post(f"{BACKEND_URL}/upload", files=files, timeout=30)
        
        if resp.status_code == 200:
            data = resp.json()
            if "image_path" in data and data["image_path"]:
                log_success(f"Image uploaded successfully")
                log_detail("image_path", data["image_path"])
                test_results["passed"].append("POST /api/upload - image upload")
                return data["image_path"]
            else:
                log_error("Response missing 'image_path' field")
                test_results["failed"].append("POST /api/upload - missing image_path")
                return None
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"POST /api/upload - status {resp.status_code}")
            return None
    except Exception as e:
        log_error(f"Upload failed: {e}")
        test_results["failed"].append(f"POST /api/upload - {str(e)}")
        return None

def test_analyze_image(image_path):
    """Test POST /api/analyze with Gemini vision (can take ~60s)"""
    log_test("6. POST /api/analyze - AI Vision Analysis (Gemini gemini-3.1-pro-preview)")
    log_info("This may take up to 60 seconds for live Gemini API call...")
    
    try:
        payload = {
            "image_path": image_path,
            "sample_id": TEST_SAMPLE_ID,
            "oil_type": TEST_OIL_TYPE,
            "batch": TEST_BATCH,
            "operator": TEST_OPERATOR
        }
        
        start_time = time.time()
        resp = requests.post(f"{BACKEND_URL}/analyze", json=payload, timeout=120)
        elapsed = time.time() - start_time
        
        log_info(f"Analysis completed in {elapsed:.1f}s")
        
        if resp.status_code == 200:
            data = resp.json()
            
            # Validate required fields
            required_fields = ["id", "rating", "performance", "status", "parameters", "ai_summary", "ai_model"]
            missing = [f for f in required_fields if f not in data]
            if missing:
                log_error(f"Missing required fields: {missing}")
                test_results["failed"].append(f"POST /api/analyze - missing fields: {missing}")
                return None
            
            # Validate rating is numeric 0-10
            rating = data.get("rating")
            if not isinstance(rating, (int, float)) or rating < 0 or rating > 10:
                log_error(f"Invalid rating: {rating} (expected 0-10)")
                test_results["failed"].append(f"POST /api/analyze - invalid rating {rating}")
                return None
            
            # Validate status is PASS or FAIL
            status = data.get("status")
            if status not in ["PASS", "FAIL"]:
                log_error(f"Invalid status: {status} (expected PASS or FAIL)")
                test_results["failed"].append(f"POST /api/analyze - invalid status {status}")
                return None
            
            # Validate ai_model
            ai_model = data.get("ai_model")
            if ai_model != "gemini-3.1-pro-preview":
                log_error(f"Unexpected ai_model: {ai_model}")
                test_results["failed"].append(f"POST /api/analyze - wrong ai_model {ai_model}")
                return None
            
            # Validate ai_summary is non-empty
            ai_summary = data.get("ai_summary", "")
            if not ai_summary or len(ai_summary.strip()) == 0:
                log_error("ai_summary is empty")
                test_results["failed"].append("POST /api/analyze - empty ai_summary")
                return None
            
            # Validate parameters object has expected numeric keys
            params = data.get("parameters", {})
            expected_param_keys = [
                "deposit_area_pct", "deposit_length_mm", "deposit_coverage_pct",
                "avg_intensity_l", "avg_color_a", "avg_color_b", "max_intensity",
                "thickness_index_mm", "deposit_start_mm", "deposit_end_mm"
            ]
            missing_params = [k for k in expected_param_keys if k not in params]
            if missing_params:
                log_error(f"Missing parameter keys: {missing_params}")
                test_results["failed"].append(f"POST /api/analyze - missing params: {missing_params}")
                return None
            
            # All validations passed
            log_success("AI Vision analysis successful")
            log_detail("Test ID", data["id"])
            log_detail("Rating", f"{rating}/10")
            log_detail("Performance", data.get("performance"))
            log_detail("Status", status)
            log_detail("AI Model", ai_model)
            log_detail("AI Summary", ai_summary[:100] + "..." if len(ai_summary) > 100 else ai_summary)
            log_detail("Confidence", data.get("confidence"))
            log_detail("Deposit Level", data.get("deposit_level_label"))
            
            test_results["passed"].append("POST /api/analyze - Gemini vision analysis")
            return data["id"]
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"POST /api/analyze - status {resp.status_code}")
            return None
    except requests.Timeout:
        log_error("Request timed out after 120s")
        test_results["failed"].append("POST /api/analyze - timeout")
        return None
    except Exception as e:
        log_error(f"Analysis failed: {e}")
        test_results["failed"].append(f"POST /api/analyze - {str(e)}")
        return None

def test_get_test_by_id(test_id):
    """Test GET /api/tests/{id} retrieves the record"""
    log_test(f"7. GET /api/tests/{test_id} - Retrieve Test Record")
    try:
        resp = requests.get(f"{BACKEND_URL}/tests/{test_id}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("id") == test_id:
                log_success(f"Test record retrieved successfully")
                log_detail("Sample ID", data.get("meta", {}).get("sample_id"))
                log_detail("Rating", data.get("rating"))
                log_detail("Status", data.get("status"))
                test_results["passed"].append(f"GET /api/tests/{test_id} - retrieve record")
                return True
            else:
                log_error(f"ID mismatch: expected {test_id}, got {data.get('id')}")
                test_results["failed"].append(f"GET /api/tests/{test_id} - ID mismatch")
                return False
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/tests/{test_id} - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/tests/{test_id} - {str(e)}")
        return False

def test_list_tests_with_search(test_id):
    """Test GET /api/tests with search query"""
    log_test("8. GET /api/tests?q=QA-TEST - Search Tests")
    try:
        resp = requests.get(f"{BACKEND_URL}/tests", params={"q": "QA-TEST"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if not isinstance(data, list):
                log_error(f"Expected list, got {type(data)}")
                test_results["failed"].append("GET /api/tests?q= - not a list")
                return False
            
            # Check if our test record is in the list
            found = any(t.get("id") == test_id for t in data)
            if found:
                log_success(f"Test record found in search results ({len(data)} total)")
                test_results["passed"].append("GET /api/tests?q= - search query")
                return True
            else:
                log_error(f"Test record not found in search results")
                test_results["failed"].append("GET /api/tests?q= - record not found")
                return False
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/tests?q= - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/tests?q= - {str(e)}")
        return False

def test_dashboard(initial_count=None):
    """Test GET /api/dashboard"""
    log_test("9. GET /api/dashboard - Dashboard Stats")
    try:
        resp = requests.get(f"{BACKEND_URL}/dashboard", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            required = ["total", "passed", "failed", "avg_rating"]
            missing = [f for f in required if f not in data]
            if missing:
                log_error(f"Missing fields: {missing}")
                test_results["failed"].append(f"GET /api/dashboard - missing fields: {missing}")
                return None
            
            total = data.get("total")
            if initial_count is not None and total <= initial_count:
                log_error(f"Total count did not increase (was {initial_count}, now {total})")
                test_results["failed"].append("GET /api/dashboard - count not increased")
                return None
            
            log_success("Dashboard data retrieved")
            log_detail("Total Tests", total)
            log_detail("Passed", data.get("passed"))
            log_detail("Failed", data.get("failed"))
            log_detail("Avg Rating", data.get("avg_rating"))
            test_results["passed"].append("GET /api/dashboard - stats")
            return total
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/dashboard - status {resp.status_code}")
            return None
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/dashboard - {str(e)}")
        return None

def test_trend(test_id):
    """Test GET /api/trend"""
    log_test("10. GET /api/trend - Trend Data")
    try:
        resp = requests.get(f"{BACKEND_URL}/trend", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if not isinstance(data, list):
                log_error(f"Expected list, got {type(data)}")
                test_results["failed"].append("GET /api/trend - not a list")
                return False
            
            # Check if our test record is in the trend
            found = any(t.get("id") == test_id for t in data)
            if found:
                log_success(f"Test record found in trend data ({len(data)} total)")
                test_results["passed"].append("GET /api/trend - record in trend")
                return True
            else:
                log_error(f"Test record not found in trend data")
                test_results["failed"].append("GET /api/trend - record not found")
                return False
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/trend - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/trend - {str(e)}")
        return False

def test_delete_test(test_id):
    """Test DELETE /api/tests/{id} soft delete"""
    log_test(f"11. DELETE /api/tests/{test_id} - Soft Delete")
    try:
        resp = requests.delete(f"{BACKEND_URL}/tests/{test_id}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") == True:
                log_success("Test record soft deleted")
                test_results["passed"].append(f"DELETE /api/tests/{test_id} - soft delete")
                return True
            else:
                log_error(f"Expected {{ok: true}}, got {data}")
                test_results["failed"].append(f"DELETE /api/tests/{test_id} - unexpected response")
                return False
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"DELETE /api/tests/{test_id} - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"DELETE /api/tests/{test_id} - {str(e)}")
        return False

def test_get_deleted_test(test_id):
    """Test GET /api/tests/{id} returns 404 after delete"""
    log_test(f"12. GET /api/tests/{test_id} - Verify 404 After Delete")
    try:
        resp = requests.get(f"{BACKEND_URL}/tests/{test_id}", timeout=10)
        if resp.status_code == 404:
            log_success("Deleted test returns 404 as expected")
            test_results["passed"].append(f"GET /api/tests/{test_id} - 404 after delete")
            return True
        else:
            log_error(f"Expected 404, got {resp.status_code}")
            test_results["failed"].append(f"GET /api/tests/{test_id} - not 404 after delete")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/tests/{test_id} - {str(e)}")
        return False

def test_deleted_not_in_list(test_id):
    """Test deleted record no longer appears in GET /api/tests"""
    log_test("13. GET /api/tests - Verify Deleted Record Not in List")
    try:
        resp = requests.get(f"{BACKEND_URL}/tests", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            found = any(t.get("id") == test_id for t in data)
            if not found:
                log_success("Deleted record not in list")
                test_results["passed"].append("GET /api/tests - deleted not in list")
                return True
            else:
                log_error("Deleted record still appears in list")
                test_results["failed"].append("GET /api/tests - deleted still in list")
                return False
        else:
            log_error(f"Expected 200, got {resp.status_code}: {resp.text}")
            test_results["failed"].append(f"GET /api/tests - status {resp.status_code}")
            return False
    except Exception as e:
        log_error(f"Request failed: {e}")
        test_results["failed"].append(f"GET /api/tests - {str(e)}")
        return False

def print_summary():
    """Print test summary"""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    total = len(test_results["passed"]) + len(test_results["failed"])
    print(f"\nTotal Tests: {total}")
    print(f"{GREEN}Passed: {len(test_results['passed'])}{RESET}")
    print(f"{RED}Failed: {len(test_results['failed'])}{RESET}")
    
    if test_results["passed"]:
        print(f"\n{GREEN}✓ Passed Tests:{RESET}")
        for test in test_results["passed"]:
            print(f"  {GREEN}✓{RESET} {test}")
    
    if test_results["failed"]:
        print(f"\n{RED}✗ Failed Tests:{RESET}")
        for test in test_results["failed"]:
            print(f"  {RED}✗{RESET} {test}")
    
    if test_results["warnings"]:
        print(f"\n{YELLOW}⚠ Warnings:{RESET}")
        for warning in test_results["warnings"]:
            print(f"  {YELLOW}⚠{RESET} {warning}")
    
    print(f"\n{BLUE}{'='*80}{RESET}\n")
    
    return len(test_results["failed"]) == 0

def main():
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}KHT AI VISION Backend API Test Suite{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Image: {TEST_IMAGE_PATH}")
    print(f"{BLUE}{'='*80}{RESET}\n")
    
    # CORS TESTS (Critical for Safari bug fix)
    log_info("=== CORS VERIFICATION TESTS (Safari bug fix) ===")
    test_cors_actual_request_dashboard()
    test_cors_actual_request_tests()
    test_cors_preflight_analyze()
    
    # 4. Test API root
    test_api_root()
    
    # 5. Get initial dashboard count
    log_test("Pre-test: Get Initial Dashboard Count")
    initial_count = test_dashboard()
    if initial_count is not None:
        log_info(f"Initial test count: {initial_count}")
    
    # 6. Upload image
    image_path = test_upload_image()
    if not image_path:
        log_error("Cannot proceed without uploaded image")
        print_summary()
        return 1
    
    # 7. Analyze image (Gemini vision - can take ~60s)
    test_id = test_analyze_image(image_path)
    if not test_id:
        log_error("Cannot proceed without analysis result")
        print_summary()
        return 1
    
    # 8. Retrieve test by ID
    test_get_test_by_id(test_id)
    
    # 9. Search tests
    test_list_tests_with_search(test_id)
    
    # 10. Check dashboard (should show increased count)
    test_dashboard(initial_count)
    
    # 11. Check trend
    test_trend(test_id)
    
    # 12. Delete test
    test_delete_test(test_id)
    
    # 13. Verify 404 after delete
    test_get_deleted_test(test_id)
    
    # 14. Verify not in list
    test_deleted_not_in_list(test_id)
    
    # Print summary
    success = print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
