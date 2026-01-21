#!/bin/bash
# =============================================================================
# MEP Design Studio - Integration Test Suite
# =============================================================================
# Tests all API endpoints and frontend integrations
# Run: ./test_integration.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
BASE_URL="http://localhost:5000"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

check_json_key() {
    local json="$1"
    local key="$2"
    echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if '$key' in d else 1)" 2>/dev/null
}

check_json_value() {
    local json="$1"
    local key="$2"
    local expected="$3"
    local actual=$(echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$key', ''))" 2>/dev/null)
    [ "$actual" == "$expected" ]
}

# =============================================================================
# TEST: Backend Health Check
# =============================================================================

test_health_check() {
    log_test "Backend health check..."
    local response=$(curl -s "$BASE_URL/api/v1/health")

    if check_json_key "$response" "status"; then
        log_pass "Health endpoint returns status"
    else
        log_fail "Health endpoint missing status"
        return 1
    fi
}

# =============================================================================
# TEST: Floor Plan API
# =============================================================================

test_floor_plan_api() {
    log_test "Floor plan API - GET /api/floor-plan..."
    local response=$(curl -s "$BASE_URL/api/floor-plan")

    if check_json_key "$response" "rooms" || (echo "$response" | grep -q "rooms"); then
        log_pass "Floor plan returns rooms"
    else
        log_fail "Floor plan missing rooms: $response"
        return 1
    fi
}

# =============================================================================
# TEST: HVAC Auto-Design API
# =============================================================================

test_hvac_api() {
    log_test "HVAC API - POST /api/hvac/auto-design..."
    local payload='{"rooms":[{"name":"Living Room","width":5000,"height":4000,"x":0,"y":0}],"systemType":"mini_split"}'
    local response=$(curl -s -X POST "$BASE_URL/api/hvac/auto-design" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if check_json_key "$response" "equipment" || (echo "$response" | grep -q "equipment"); then
        log_pass "HVAC auto-design returns equipment"
    else
        log_fail "HVAC auto-design missing equipment: $response"
        return 1
    fi
}

test_hvac_load_calc() {
    log_test "HVAC API - POST /api/hvac/calculate-load..."
    local payload='{"rooms":[{"name":"Bedroom","width":3500,"height":3000,"x":0,"y":0}]}'
    local response=$(curl -s -X POST "$BASE_URL/api/hvac/calculate-load" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if echo "$response" | grep -qE "(total_load|cooling|heating|load)"; then
        log_pass "HVAC calculate-load returns load data"
    else
        log_fail "HVAC calculate-load missing load data: $response"
        return 1
    fi
}

# =============================================================================
# TEST: Electrical Auto-Design API
# =============================================================================

test_electrical_api() {
    log_test "Electrical API - POST /api/electrical/auto-design..."
    local payload='{"rooms":[{"name":"Kitchen","width":4000,"height":3500,"x":0,"y":0}]}'
    local response=$(curl -s -X POST "$BASE_URL/api/electrical/auto-design" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if check_json_key "$response" "equipment" || (echo "$response" | grep -q "equipment"); then
        log_pass "Electrical auto-design returns equipment"
    else
        log_fail "Electrical auto-design missing equipment: $response"
        return 1
    fi
}

test_electrical_load_calc() {
    log_test "Electrical API - POST /api/electrical/calculate-load..."
    local payload='{"rooms":[{"name":"Office","width":3000,"height":3000,"x":0,"y":0}]}'
    local response=$(curl -s -X POST "$BASE_URL/api/electrical/calculate-load" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if echo "$response" | grep -qE "(total_load|load|watts|amps)"; then
        log_pass "Electrical calculate-load returns load data"
    else
        log_fail "Electrical calculate-load missing load data: $response"
        return 1
    fi
}

# =============================================================================
# TEST: Plumbing Auto-Route API
# =============================================================================

test_plumbing_api() {
    log_test "Plumbing API - POST /api/plumbing/auto-route..."
    local payload='{"fixtures":[],"rooms":[{"name":"Bathroom","width":2500,"height":2000,"x":0,"y":0}]}'
    local response=$(curl -s -X POST "$BASE_URL/api/plumbing/auto-route" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if check_json_key "$response" "pipes" || (echo "$response" | grep -q "pipes"); then
        log_pass "Plumbing auto-route returns pipes"
    else
        log_fail "Plumbing auto-route missing pipes: $response"
        return 1
    fi
}

test_plumbing_validate() {
    log_test "Plumbing API - POST /api/plumbing/validate..."
    local payload='{"pipes":[{"type":"drain","diameter":50}],"fixtures":[]}'
    local response=$(curl -s -X POST "$BASE_URL/api/plumbing/validate" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if echo "$response" | grep -qE "(valid|issues|warnings|errors)"; then
        log_pass "Plumbing validate returns validation result"
    else
        log_fail "Plumbing validate missing validation result: $response"
        return 1
    fi
}

# =============================================================================
# TEST: Projects CRUD with SQLite Persistence
# =============================================================================

test_projects_crud() {
    log_test "Projects API - CRUD operations..."

    # Create project
    local create_payload='{"name":"Test Project","dimensions":{"length_mm":10000,"width_mm":8000}}'
    local create_response=$(curl -s -X POST "$BASE_URL/api/v1/projects" \
        -H "Content-Type: application/json" \
        -d "$create_payload")

    local project_id=$(echo "$create_response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)

    if [ -n "$project_id" ] && [ "$project_id" != "" ]; then
        log_pass "Project created with ID: $project_id"
    else
        log_fail "Failed to create project: $create_response"
        return 1
    fi

    # Get project
    local get_response=$(curl -s "$BASE_URL/api/v1/projects/$project_id")
    if echo "$get_response" | grep -q "Test Project"; then
        log_pass "Project retrieved successfully"
    else
        log_fail "Failed to retrieve project: $get_response"
    fi

    # List projects
    local list_response=$(curl -s "$BASE_URL/api/v1/projects")
    if echo "$list_response" | grep -q "$project_id"; then
        log_pass "Project appears in list"
    else
        log_fail "Project not in list: $list_response"
    fi

    # Delete project
    local delete_response=$(curl -s -X DELETE "$BASE_URL/api/v1/projects/$project_id")
    if echo "$delete_response" | grep -q "deleted"; then
        log_pass "Project deleted successfully"
    else
        log_fail "Failed to delete project: $delete_response"
    fi
}

# =============================================================================
# TEST: No 500 Errors
# =============================================================================

test_no_500_errors() {
    log_test "Checking for 500 errors on endpoints..."
    local endpoints=(
        "/api/v1/health"
        "/api/floor-plan"
        "/api/v1/projects"
        "/api/v1/materials"
    )

    local all_pass=true
    for endpoint in "${endpoints[@]}"; do
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
        if [ "$status" == "500" ]; then
            log_fail "500 error on $endpoint"
            all_pass=false
        fi
    done

    if $all_pass; then
        log_pass "No 500 errors on GET endpoints"
    fi
}

# =============================================================================
# MAIN TEST RUNNER
# =============================================================================

echo ""
echo "=============================================="
echo "  MEP Design Studio - Integration Tests"
echo "=============================================="
echo ""

# Check if backend is running
if ! curl -s "$BASE_URL/api/v1/health" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Backend not running at $BASE_URL${NC}"
    echo "Start the backend first: cd engine && python api/app.py"
    echo "Or use: ./start.sh"
    exit 1
fi

echo "Backend detected at $BASE_URL"
echo ""

# Run all tests
test_health_check
test_floor_plan_api
test_hvac_api
test_hvac_load_calc
test_electrical_api
test_electrical_load_calc
test_plumbing_api
test_plumbing_validate
test_projects_crud
test_no_500_errors

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo "=============================================="
echo "  TEST SUMMARY"
echo "=============================================="
echo -e "  ${GREEN}PASSED: $PASS_COUNT${NC}"
echo -e "  ${RED}FAILED: $FAIL_COUNT${NC}"
echo "=============================================="

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Review output above.${NC}"
    exit 1
fi
