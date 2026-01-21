#!/bin/bash
# =============================================================================
# MEP Design Studio - Repository Status Script
# =============================================================================
# Shows comprehensive repository status including remote comparison
# Usage: ./scripts/status.sh
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

BRANCH="$(git branch --show-current)"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  MEP Design Studio - Repository Status${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Basic info
echo -e "${CYAN}Repository:${NC} $(basename $(git rev-parse --show-toplevel))"
echo -e "${CYAN}Branch:${NC}     $BRANCH"
echo -e "${CYAN}Commit:${NC}     $(git rev-parse --short HEAD)"
echo -e "${CYAN}Author:${NC}     $(git log -1 --format='%an <%ae>')"
echo -e "${CYAN}Date:${NC}       $(git log -1 --format='%ar')"
echo ""

# Fetch to compare with remote
git fetch origin "$BRANCH" 2>/dev/null

# Compare with remote
LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "none")

if [[ "$REMOTE" == "none" ]]; then
    echo -e "${YELLOW}[!] Remote branch not found${NC}"
elif [[ "$LOCAL" == "$REMOTE" ]]; then
    echo -e "${GREEN}[✓] In sync with remote${NC}"
else
    AHEAD=$(git rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null || echo "0")
    BEHIND=$(git rev-list --count "HEAD..origin/$BRANCH" 2>/dev/null || echo "0")

    if [[ "$AHEAD" -gt 0 ]]; then
        echo -e "${YELLOW}[↑] $AHEAD commit(s) ahead of remote${NC}"
    fi
    if [[ "$BEHIND" -gt 0 ]]; then
        echo -e "${YELLOW}[↓] $BEHIND commit(s) behind remote${NC}"
    fi
fi
echo ""

# Working tree status
echo -e "${CYAN}Working Tree:${NC}"
if [[ -z $(git status --porcelain) ]]; then
    echo -e "  ${GREEN}Clean - no changes${NC}"
else
    git status --short | head -20
    TOTAL=$(git status --short | wc -l)
    if [[ $TOTAL -gt 20 ]]; then
        echo -e "  ${YELLOW}... and $((TOTAL - 20)) more files${NC}"
    fi
fi
echo ""

# Recent commits
echo -e "${CYAN}Recent Commits:${NC}"
git log --oneline -5
echo ""

# Stash list
STASH_COUNT=$(git stash list | wc -l)
if [[ $STASH_COUNT -gt 0 ]]; then
    echo -e "${CYAN}Stashed Changes:${NC} $STASH_COUNT item(s)"
    git stash list | head -3
    echo ""
fi

echo -e "${BLUE}===========================================${NC}"
