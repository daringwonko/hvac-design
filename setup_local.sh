#!/bin/bash
# MEP Design Studio - Local Setup Script
# Run this from your local hvac directory: bash setup_local.sh

set -e  # Exit on error

echo "=========================================="
echo "MEP Design Studio - Local Setup"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Stash any local changes
echo -e "\n${YELLOW}[1/6] Stashing local changes...${NC}"
git stash 2>/dev/null || echo "No changes to stash"

# 2. Fetch all branches
echo -e "\n${YELLOW}[2/6] Fetching all branches...${NC}"
git fetch origin --all

# 3. Checkout main and pull latest
echo -e "\n${YELLOW}[3/6] Updating main branch...${NC}"
git checkout main
git pull origin main

# 4. Check if feature branch has unique commits, merge if needed
echo -e "\n${YELLOW}[4/6] Checking feature branch...${NC}"
FEATURE_BRANCH="claude/hvac-design-images-aXBTX"

# Count commits unique to feature branch
UNIQUE_COMMITS=$(git rev-list --count main..$FEATURE_BRANCH 2>/dev/null || echo "0")

if [ "$UNIQUE_COMMITS" -gt 0 ]; then
    echo "Found $UNIQUE_COMMITS commits to merge from $FEATURE_BRANCH"
    git merge $FEATURE_BRANCH --no-edit
    echo "Merged feature branch into main"
else
    echo "Main is already up to date with feature branch"
fi

# 5. Show what we have
echo -e "\n${YELLOW}[5/6] Current state:${NC}"
echo "Branch: $(git branch --show-current)"
echo "Latest commits:"
git log --oneline -5

# 6. Verify key files exist
echo -e "\n${YELLOW}[6/6] Verifying MEP Studio files...${NC}"

FILES_TO_CHECK=(
    "engine/frontend/src/components/FloorPlanEditor/FloorPlanEditor.jsx"
    "engine/frontend/src/components/HVACRouter/HVACRouter.jsx"
    "engine/frontend/src/components/ElectricalRouter/ElectricalRouter.jsx"
    "engine/frontend/src/components/PlumbingRouter/PlumbingRouter.jsx"
    "engine/core/project_database.py"
    "data/goldilocks_3b3b_floorplan.json"
)

ALL_FOUND=true
for FILE in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$FILE" ]; then
        echo -e "  ${GREEN}✓${NC} $FILE"
    else
        echo "  ✗ $FILE (MISSING)"
        ALL_FOUND=false
    fi
done

# Summary
echo -e "\n=========================================="
if [ "$ALL_FOUND" = true ]; then
    echo -e "${GREEN}SUCCESS: MEP Design Studio is ready!${NC}"
    echo ""
    echo "Available routes:"
    echo "  /floor-plan  - Floor Plan Editor"
    echo "  /hvac        - HVAC Router"
    echo "  /electrical  - Electrical Router"
    echo "  /plumbing    - Plumbing Router"
    echo ""
    echo "To start the frontend:"
    echo "  cd engine/frontend && npm install && npm run dev"
else
    echo "WARNING: Some files are missing. Check the output above."
fi
echo "=========================================="
