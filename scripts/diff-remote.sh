#!/bin/bash
# =============================================================================
# MEP Design Studio - Diff Against Remote
# =============================================================================
# Shows differences between local and remote branch
# Usage: ./scripts/diff-remote.sh [branch-name]
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

BRANCH="${1:-$(git branch --show-current)}"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  MEP Design Studio - Remote Diff${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Fetch latest
echo -e "${BLUE}Fetching latest from remote...${NC}"
git fetch origin "$BRANCH" 2>/dev/null || git fetch origin

echo ""
echo -e "${CYAN}Comparing:${NC} $BRANCH (local) vs origin/$BRANCH (remote)"
echo ""

# Check if there are differences
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null)

if [[ -z "$REMOTE" ]]; then
    echo -e "${YELLOW}[!] Remote branch origin/$BRANCH not found${NC}"
    exit 1
fi

if [[ "$LOCAL" == "$REMOTE" ]]; then
    echo -e "${GREEN}[✓] Local and remote are identical${NC}"
    exit 0
fi

# Show commits difference
AHEAD=$(git rev-list --count "origin/$BRANCH..HEAD")
BEHIND=$(git rev-list --count "HEAD..origin/$BRANCH")

echo -e "${CYAN}Summary:${NC}"
echo -e "  Local is ${YELLOW}$AHEAD${NC} commit(s) ahead"
echo -e "  Local is ${YELLOW}$BEHIND${NC} commit(s) behind"
echo ""

# Show commits ahead (local only)
if [[ $AHEAD -gt 0 ]]; then
    echo -e "${CYAN}Commits on local (not on remote):${NC}"
    git log --oneline "origin/$BRANCH..HEAD"
    echo ""
fi

# Show commits behind (remote only)
if [[ $BEHIND -gt 0 ]]; then
    echo -e "${CYAN}Commits on remote (not on local):${NC}"
    git log --oneline "HEAD..origin/$BRANCH"
    echo ""
fi

# Show file differences
echo -e "${CYAN}Files changed:${NC}"
git diff --stat "origin/$BRANCH..HEAD" 2>/dev/null || echo "  (none)"
echo ""

# Option to see full diff
read -p "Show full diff? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git diff "origin/$BRANCH..HEAD"
fi
