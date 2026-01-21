#!/bin/bash
# =============================================================================
# MEP Design Studio - Repository Sync Script (GitHub CLI Version)
# =============================================================================
# Syncs local repository with remote using GitHub CLI
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
CYAN='\033[0;36m'
NC='\033[0m'

# Default branch
BRANCH="${1:-$(git branch --show-current)}"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  MEP Design Studio - Repository Sync${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}[x] GitHub CLI (gh) not installed${NC}"
    echo "Install: https://cli.github.com/"
    exit 1
fi

# Check gh authentication
echo -e "${BLUE}[0/5]${NC} Verifying GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo -e "${RED}[x] Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi
echo -e "${GREEN}[ok] GitHub CLI authenticated${NC}"
echo ""

# Ensure remote uses HTTPS (not SSH)
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$CURRENT_REMOTE" == git@* ]]; then
    echo -e "${YELLOW}[!] Converting SSH remote to HTTPS...${NC}"
    # Extract owner/repo from SSH URL (git@github.com:owner/repo.git)
    REPO_PATH=$(echo "$CURRENT_REMOTE" | sed 's/git@github.com://' | sed 's/\.git$//')
    HTTPS_URL="https://github.com/${REPO_PATH}.git"
    git remote set-url origin "$HTTPS_URL"
    echo -e "${GREEN}[ok] Remote updated to HTTPS${NC}"
fi

# Get repo info using gh
echo -e "${CYAN}Repository:${NC} $(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || basename $(git rev-parse --show-toplevel))"
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
        echo -e "${GREEN}[ok] Changes stashed${NC}"
    else
        echo -e "${RED}[x] Sync cancelled${NC}"
        exit 1
    fi
fi

# Sync with remote using gh repo sync
echo -e "${BLUE}[1/5]${NC} Syncing with remote via GitHub CLI..."
if gh repo sync --branch "$BRANCH" 2>/dev/null; then
    echo -e "${GREEN}[ok] gh repo sync successful${NC}"
else
    # Fallback: gh repo sync may not work for all scenarios, use git fetch
    echo -e "${YELLOW}[!] gh repo sync not available for this operation, using git fetch...${NC}"
    git fetch origin "$BRANCH" 2>/dev/null || git fetch origin
fi

# Check if branch exists locally
if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    echo -e "${YELLOW}[!] Branch '$BRANCH' doesn't exist locally${NC}"
    echo -e "${BLUE}[2/5]${NC} Creating and checking out branch..."
    git checkout -b "$BRANCH" "origin/$BRANCH" 2>/dev/null || git checkout "$BRANCH"
else
    echo -e "${BLUE}[2/5]${NC} Checking out $BRANCH..."
    git checkout "$BRANCH"
fi

# Pull latest changes
echo -e "${BLUE}[3/5]${NC} Pulling latest changes..."
if git pull origin "$BRANCH" --rebase; then
    echo -e "${GREEN}[ok] Pull successful${NC}"
else
    echo -e "${RED}[x] Pull failed - attempting merge strategy${NC}"
    git pull origin "$BRANCH" --no-rebase || {
        echo -e "${RED}[x] Merge conflicts detected. Resolve manually.${NC}"
        exit 1
    }
fi

# Restore stashed changes if any
if [[ "$STASHED" == "true" ]]; then
    echo -e "${BLUE}[4/5]${NC} Restoring stashed changes..."
    git stash pop || {
        echo -e "${YELLOW}[!] Stash pop had conflicts. Check 'git stash list'${NC}"
    }
else
    echo -e "${BLUE}[4/5]${NC} No stashed changes to restore"
fi

# Verify sync status
echo -e "${BLUE}[5/5]${NC} Verifying sync status..."
LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "none")
if [[ "$LOCAL" == "$REMOTE" ]]; then
    echo -e "${GREEN}[ok] In sync with remote${NC}"
else
    AHEAD=$(git rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null || echo "0")
    BEHIND=$(git rev-list --count "HEAD..origin/$BRANCH" 2>/dev/null || echo "0")
    [[ "$AHEAD" -gt 0 ]] && echo -e "${YELLOW}[i] $AHEAD commit(s) ahead of remote${NC}"
    [[ "$BEHIND" -gt 0 ]] && echo -e "${YELLOW}[i] $BEHIND commit(s) behind remote${NC}"
fi

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Sync Complete!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo -e "Branch: ${BLUE}$BRANCH${NC}"
echo -e "Commit: ${BLUE}$(git rev-parse --short HEAD)${NC}"
echo -e "Status: ${GREEN}$(git status --short | wc -l) files changed${NC}"
