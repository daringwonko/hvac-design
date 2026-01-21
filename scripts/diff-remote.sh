#!/bin/bash
# =============================================================================
# MEP Design Studio - Diff Against Remote (GitHub CLI Version)
# =============================================================================
# Shows differences between local and remote branch using GitHub CLI
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

# Check gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}[!] GitHub CLI (gh) not installed - using git only${NC}"
    GH_AVAILABLE=false
else
    GH_AVAILABLE=true
fi

# Check gh authentication
if [[ "$GH_AVAILABLE" == "true" ]]; then
    if ! gh auth status &> /dev/null; then
        echo -e "${YELLOW}[!] Not authenticated with GitHub CLI - using git only${NC}"
        GH_AVAILABLE=false
    else
        echo -e "${GREEN}[ok] GitHub CLI authenticated${NC}"
    fi
fi

# Ensure remote uses HTTPS (not SSH)
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$CURRENT_REMOTE" == git@* ]]; then
    echo -e "${YELLOW}[!] Converting SSH remote to HTTPS...${NC}"
    REPO_PATH=$(echo "$CURRENT_REMOTE" | sed 's/git@github.com://' | sed 's/\.git$//')
    HTTPS_URL="https://github.com/${REPO_PATH}.git"
    git remote set-url origin "$HTTPS_URL"
    echo -e "${GREEN}[ok] Remote updated to HTTPS${NC}"
fi
echo ""

# Get repo info
if [[ "$GH_AVAILABLE" == "true" ]]; then
    REPO_NAME=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)
    echo -e "${CYAN}Repository:${NC} $REPO_NAME"
fi

# Fetch latest using git (gh repo sync is for forked repos)
echo -e "${BLUE}Fetching latest from remote...${NC}"
git fetch origin "$BRANCH" 2>/dev/null || git fetch origin

echo ""
echo -e "${CYAN}Comparing:${NC} $BRANCH (local) vs origin/$BRANCH (remote)"
echo ""

# Get commit SHAs
LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=""

# Try to get remote SHA via gh api first (more reliable)
if [[ "$GH_AVAILABLE" == "true" && -n "$REPO_NAME" ]]; then
    REMOTE_SHA=$(gh api "repos/${REPO_NAME}/commits/${BRANCH}" --jq '.sha' 2>/dev/null || echo "")
fi

# Fallback to git
if [[ -z "$REMOTE_SHA" ]]; then
    REMOTE_SHA=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "")
fi

if [[ -z "$REMOTE_SHA" ]]; then
    echo -e "${YELLOW}[!] Remote branch origin/$BRANCH not found${NC}"
    exit 1
fi

if [[ "$LOCAL_SHA" == "$REMOTE_SHA" ]]; then
    echo -e "${GREEN}[ok] Local and remote are identical${NC}"
    echo -e "${CYAN}SHA:${NC} ${LOCAL_SHA:0:7}"
    exit 0
fi

# Show commits difference
AHEAD=$(git rev-list --count "origin/$BRANCH..HEAD")
BEHIND=$(git rev-list --count "HEAD..origin/$BRANCH")

echo -e "${CYAN}Summary:${NC}"
echo -e "  Local SHA:  ${BLUE}${LOCAL_SHA:0:7}${NC}"
echo -e "  Remote SHA: ${BLUE}${REMOTE_SHA:0:7}${NC}"
echo -e "  Local is ${YELLOW}$AHEAD${NC} commit(s) ahead"
echo -e "  Local is ${YELLOW}$BEHIND${NC} commit(s) behind"
echo ""

# Show commits ahead (local only)
if [[ $AHEAD -gt 0 ]]; then
    echo -e "${CYAN}Commits on local (not on remote):${NC}"
    git log --oneline "origin/$BRANCH..HEAD"
    echo ""

    # Show commit details via gh api if available
    if [[ "$GH_AVAILABLE" == "true" && -n "$REPO_NAME" ]]; then
        echo -e "${CYAN}These commits need to be pushed.${NC}"
        echo ""
    fi
fi

# Show commits behind (remote only)
if [[ $BEHIND -gt 0 ]]; then
    echo -e "${CYAN}Commits on remote (not on local):${NC}"
    git log --oneline "HEAD..origin/$BRANCH"
    echo ""

    # Get remote commit info via gh api
    if [[ "$GH_AVAILABLE" == "true" && -n "$REPO_NAME" ]]; then
        echo -e "${CYAN}Latest remote commit:${NC}"
        gh api "repos/${REPO_NAME}/commits/${BRANCH}" --jq '"  Author: \(.commit.author.name)\n  Date: \(.commit.author.date)\n  Message: \(.commit.message | split("\n")[0])"' 2>/dev/null || true
        echo ""
    fi
fi

# Show file differences (local git operation)
echo -e "${CYAN}Files changed:${NC}"
git diff --stat "origin/$BRANCH..HEAD" 2>/dev/null || echo "  (none)"
echo ""

# Option to see full diff
read -p "Show full diff? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git diff "origin/$BRANCH..HEAD"
fi
