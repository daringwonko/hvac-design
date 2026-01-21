#!/bin/bash
# =============================================================================
# MEP Design Studio - Pull Request Script (GitHub CLI Version)
# =============================================================================
# Creates or views pull requests using gh cli
# Usage: ./scripts/pr.sh [create|view|list|merge|status|checks]
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
ACTION="${1:-list}"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  MEP Design Studio - Pull Requests${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}[x] GitHub CLI (gh) not installed${NC}"
    echo "Install: https://cli.github.com/"
    exit 1
fi

# Check gh is authenticated
echo -e "${CYAN}Verifying GitHub authentication...${NC}"
if ! gh auth status &> /dev/null; then
    echo -e "${RED}[x] Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi
GH_USER=$(gh api user --jq '.login' 2>/dev/null || echo "unknown")
echo -e "${GREEN}[ok] Authenticated as: $GH_USER${NC}"
echo ""

# Ensure remote uses HTTPS (not SSH)
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$CURRENT_REMOTE" == git@* ]]; then
    echo -e "${YELLOW}[!] Converting SSH remote to HTTPS...${NC}"
    REPO_PATH=$(echo "$CURRENT_REMOTE" | sed 's/git@github.com://' | sed 's/\.git$//')
    HTTPS_URL="https://github.com/${REPO_PATH}.git"
    git remote set-url origin "$HTTPS_URL"
    echo -e "${GREEN}[ok] Remote updated to HTTPS${NC}"
fi

# Get repo info
REPO_NAME=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)
echo -e "${CYAN}Repository:${NC} $REPO_NAME"
echo -e "${CYAN}Branch:${NC}     $BRANCH"
echo ""

case "$ACTION" in
    create)
        echo -e "${BLUE}Creating PR from $BRANCH...${NC}"
        echo ""

        # Ensure branch is pushed
        if ! git ls-remote --exit-code --heads origin "$BRANCH" &>/dev/null; then
            echo -e "${YELLOW}[!] Branch not on remote, pushing first...${NC}"
            git push -u origin "$BRANCH"
        fi

        # Get PR title
        read -p "PR Title: " PR_TITLE
        if [[ -z "$PR_TITLE" ]]; then
            PR_TITLE="$(git log -1 --format='%s')"
        fi

        # Get default branch for comparison
        DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || echo "main")

        # Generate body from recent commits
        echo ""
        echo -e "${CYAN}Recent commits to include:${NC}"
        git log --oneline "$DEFAULT_BRANCH..$BRANCH" 2>/dev/null || git log --oneline -5
        echo ""

        # Create PR using gh pr create
        gh pr create \
            --title "$PR_TITLE" \
            --body "## Summary
$(git log --oneline $DEFAULT_BRANCH..$BRANCH 2>/dev/null | sed 's/^/- /' || git log --oneline -5 | sed 's/^/- /')

## Test Plan
- [ ] Manual testing completed
- [ ] Integration tests pass
" \
            --head "$BRANCH" \
            --base "$DEFAULT_BRANCH"

        echo ""
        echo -e "${GREEN}[ok] PR created successfully${NC}"

        # Show PR URL
        PR_URL=$(gh pr view "$BRANCH" --json url -q '.url' 2>/dev/null)
        echo -e "${CYAN}PR URL:${NC} $PR_URL"
        ;;

    view)
        echo -e "${BLUE}Viewing PR for $BRANCH...${NC}"
        gh pr view "$BRANCH" --web 2>/dev/null || gh pr view --web
        ;;

    list)
        echo -e "${BLUE}Open Pull Requests:${NC}"
        echo ""
        gh pr list --state open
        ;;

    merge)
        echo -e "${BLUE}Merging PR for $BRANCH...${NC}"

        # Show PR info first
        gh pr view "$BRANCH" --json number,title,state,mergeable
        echo ""

        read -p "Merge method (merge/squash/rebase): " MERGE_METHOD
        MERGE_METHOD="${MERGE_METHOD:-squash}"
        gh pr merge "$BRANCH" --"$MERGE_METHOD" --delete-branch
        echo -e "${GREEN}[ok] PR merged${NC}"
        ;;

    status)
        echo -e "${BLUE}PR Status:${NC}"
        echo ""
        gh pr status
        ;;

    checks)
        echo -e "${BLUE}PR Checks for $BRANCH:${NC}"
        echo ""
        gh pr checks "$BRANCH" 2>/dev/null || echo -e "${YELLOW}No PR found for this branch${NC}"
        ;;

    close)
        echo -e "${BLUE}Closing PR for $BRANCH...${NC}"
        gh pr close "$BRANCH"
        echo -e "${GREEN}[ok] PR closed${NC}"
        ;;

    reopen)
        echo -e "${BLUE}Reopening PR for $BRANCH...${NC}"
        gh pr reopen "$BRANCH"
        echo -e "${GREEN}[ok] PR reopened${NC}"
        ;;

    diff)
        echo -e "${BLUE}PR Diff for $BRANCH:${NC}"
        gh pr diff "$BRANCH" 2>/dev/null || echo -e "${YELLOW}No PR found for this branch${NC}"
        ;;

    *)
        echo "Usage: $0 [create|view|list|merge|status|checks|close|reopen|diff]"
        echo ""
        echo "Commands:"
        echo "  create  - Create a new PR from current branch"
        echo "  view    - Open PR in browser"
        echo "  list    - List all open PRs"
        echo "  merge   - Merge PR for current branch"
        echo "  status  - Show PR status for all your PRs"
        echo "  checks  - Show CI check status for PR"
        echo "  close   - Close PR without merging"
        echo "  reopen  - Reopen a closed PR"
        echo "  diff    - Show PR diff"
        exit 1
        ;;
esac
