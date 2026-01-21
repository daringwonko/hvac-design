#!/bin/bash
# =============================================================================
# MEP Design Studio - Repository Sync Script
# =============================================================================
# Syncs local repository with remote, handles conflicts gracefully
# Usage: ./scripts/sync.sh [branch-name]
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default branch
BRANCH="${1:-$(git branch --show-current)}"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  MEP Design Studio - Repository Sync${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${YELLOW}[!] Uncommitted changes detected${NC}"
    git status --short
    echo ""
    read -p "Stash changes and continue? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git stash push -m "auto-stash before sync $(date +%Y%m%d-%H%M%S)"
        STASHED=true
        echo -e "${GREEN}[✓] Changes stashed${NC}"
    else
        echo -e "${RED}[✗] Sync cancelled${NC}"
        exit 1
    fi
fi

# Fetch latest from remote
echo -e "${BLUE}[1/4]${NC} Fetching from origin..."
git fetch origin "$BRANCH" 2>/dev/null || git fetch origin

# Check if branch exists locally
if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    echo -e "${YELLOW}[!] Branch '$BRANCH' doesn't exist locally${NC}"
    echo -e "${BLUE}[2/4]${NC} Creating and checking out branch..."
    git checkout -b "$BRANCH" "origin/$BRANCH" 2>/dev/null || git checkout "$BRANCH"
else
    echo -e "${BLUE}[2/4]${NC} Checking out $BRANCH..."
    git checkout "$BRANCH"
fi

# Pull latest changes
echo -e "${BLUE}[3/4]${NC} Pulling latest changes..."
if git pull origin "$BRANCH" --rebase; then
    echo -e "${GREEN}[✓] Pull successful${NC}"
else
    echo -e "${RED}[✗] Pull failed - attempting merge strategy${NC}"
    git pull origin "$BRANCH" --no-rebase || {
        echo -e "${RED}[✗] Merge conflicts detected. Resolve manually.${NC}"
        exit 1
    }
fi

# Restore stashed changes if any
if [[ "$STASHED" == "true" ]]; then
    echo -e "${BLUE}[4/4]${NC} Restoring stashed changes..."
    git stash pop || {
        echo -e "${YELLOW}[!] Stash pop had conflicts. Check 'git stash list'${NC}"
    }
else
    echo -e "${BLUE}[4/4]${NC} No stashed changes to restore"
fi

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Sync Complete!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo -e "Branch: ${BLUE}$BRANCH${NC}"
echo -e "Commit: ${BLUE}$(git rev-parse --short HEAD)${NC}"
echo -e "Status: ${GREEN}$(git status --short | wc -l) files changed${NC}"
