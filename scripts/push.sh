#!/bin/bash
# =============================================================================
# MEP Design Studio - Commit and Push Script (GitHub CLI Version)
# =============================================================================
# Stages all changes, commits with message, and pushes to remote via HTTPS
# Usage: ./scripts/push.sh "commit message"
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

BRANCH="$(git branch --show-current)"
COMMIT_MSG="$1"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  MEP Design Studio - Push Changes${NC}"
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

# Show repo info
echo -e "${CYAN}Repository:${NC} $(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null || basename $(git rev-parse --show-toplevel))"
echo -e "${CYAN}Branch:${NC}     $BRANCH"
echo ""

# Check for changes
if [[ -z $(git status --porcelain) ]]; then
    echo -e "${YELLOW}[!] No changes to commit${NC}"
    exit 0
fi

# Show what will be committed
echo -e "${BLUE}[1/5]${NC} Changes to be committed:"
git status --short
echo ""

# Get commit message if not provided
if [[ -z "$COMMIT_MSG" ]]; then
    read -p "Enter commit message: " COMMIT_MSG
    if [[ -z "$COMMIT_MSG" ]]; then
        echo -e "${RED}[x] Commit message required${NC}"
        exit 1
    fi
fi

# Stage all changes
echo -e "${BLUE}[2/5]${NC} Staging changes..."
git add -A

# Commit
echo -e "${BLUE}[3/5]${NC} Committing..."
git commit -m "$COMMIT_MSG"

# Push using git push (with HTTPS remote, gh auth handles credentials)
echo -e "${BLUE}[4/5]${NC} Pushing to origin/$BRANCH..."
if git push -u origin "$BRANCH"; then
    echo -e "${GREEN}[ok] Push successful${NC}"
else
    echo -e "${YELLOW}[!] Push failed, attempting pull first...${NC}"
    git pull origin "$BRANCH" --rebase
    git push -u origin "$BRANCH"
fi

# Verify push using gh api
echo -e "${BLUE}[5/5]${NC} Verifying push..."
REPO_NAME=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)
if [[ -n "$REPO_NAME" ]]; then
    REMOTE_SHA=$(gh api "repos/${REPO_NAME}/commits/${BRANCH}" --jq '.sha' 2>/dev/null | head -c 7)
    LOCAL_SHA=$(git rev-parse --short HEAD)
    if [[ "$REMOTE_SHA" == "$LOCAL_SHA" ]]; then
        echo -e "${GREEN}[ok] Verified: remote matches local${NC}"
    else
        echo -e "${YELLOW}[!] Remote SHA: $REMOTE_SHA, Local SHA: $LOCAL_SHA${NC}"
    fi
fi

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Push Complete!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo -e "Branch: ${BLUE}$BRANCH${NC}"
echo -e "Commit: ${BLUE}$(git rev-parse --short HEAD)${NC}"
echo -e "Message: ${BLUE}$COMMIT_MSG${NC}"
