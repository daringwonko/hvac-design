#!/bin/bash
# =============================================================================
# MEP Design Studio - Commit and Push Script
# =============================================================================
# Stages all changes, commits with message, and pushes to remote
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
NC='\033[0m'

BRANCH="$(git branch --show-current)"
COMMIT_MSG="$1"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  MEP Design Studio - Push Changes${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check for changes
if [[ -z $(git status --porcelain) ]]; then
    echo -e "${YELLOW}[!] No changes to commit${NC}"
    exit 0
fi

# Show what will be committed
echo -e "${BLUE}[1/4]${NC} Changes to be committed:"
git status --short
echo ""

# Get commit message if not provided
if [[ -z "$COMMIT_MSG" ]]; then
    read -p "Enter commit message: " COMMIT_MSG
    if [[ -z "$COMMIT_MSG" ]]; then
        echo -e "${RED}[✗] Commit message required${NC}"
        exit 1
    fi
fi

# Stage all changes
echo -e "${BLUE}[2/4]${NC} Staging changes..."
git add -A

# Commit
echo -e "${BLUE}[3/4]${NC} Committing..."
git commit -m "$COMMIT_MSG"

# Push
echo -e "${BLUE}[4/4]${NC} Pushing to origin/$BRANCH..."
if git push -u origin "$BRANCH"; then
    echo -e "${GREEN}[✓] Push successful${NC}"
else
    echo -e "${YELLOW}[!] Push failed, attempting pull first...${NC}"
    git pull origin "$BRANCH" --rebase
    git push -u origin "$BRANCH"
fi

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Push Complete!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo -e "Branch: ${BLUE}$BRANCH${NC}"
echo -e "Commit: ${BLUE}$(git rev-parse --short HEAD)${NC}"
echo -e "Message: ${BLUE}$COMMIT_MSG${NC}"
