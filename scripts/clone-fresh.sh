#!/bin/bash
# =============================================================================
# MEP Design Studio - Fresh Clone Script
# =============================================================================
# Clones a fresh copy of the repository (nuclear option for sync issues)
# Usage: ./scripts/clone-fresh.sh [target-directory]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get repo URL from current directory or use default
if git rev-parse --is-inside-work-tree &>/dev/null; then
    REPO_URL=$(git remote get-url origin)
    CURRENT_BRANCH=$(git branch --show-current)
else
    echo -e "${RED}[✗] Not in a git repository${NC}"
    echo "Run this from within the hvac-design repository"
    exit 1
fi

TARGET_DIR="${1:-hvac-design-fresh}"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  MEP Design Studio - Fresh Clone${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""
echo -e "${CYAN}Repository:${NC} $REPO_URL"
echo -e "${CYAN}Branch:${NC}     $CURRENT_BRANCH"
echo -e "${CYAN}Target:${NC}     ~/$TARGET_DIR"
echo ""

read -p "This will clone a fresh copy. Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}[!] Cancelled${NC}"
    exit 0
fi

cd ~

# Remove if exists
if [[ -d "$TARGET_DIR" ]]; then
    echo -e "${YELLOW}[!] Removing existing $TARGET_DIR...${NC}"
    rm -rf "$TARGET_DIR"
fi

# Clone
echo -e "${BLUE}[1/3]${NC} Cloning repository..."
git clone "$REPO_URL" "$TARGET_DIR"

cd "$TARGET_DIR"

# Checkout branch
echo -e "${BLUE}[2/3]${NC} Checking out $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH" 2>/dev/null || git checkout -b "$CURRENT_BRANCH" "origin/$CURRENT_BRANCH"

# Install dependencies
echo -e "${BLUE}[3/3]${NC} Installing dependencies..."
if [[ -f "engine/frontend/package.json" ]]; then
    cd engine/frontend
    npm install
    cd ../..
fi

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Fresh Clone Complete!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo "Next steps:"
echo -e "  cd ~/$TARGET_DIR"
echo -e "  ./start.sh"
