#!/bin/bash
# =============================================================================
# MEP Design Studio - Pull Request Script (uses GitHub CLI)
# =============================================================================
# Creates or views pull requests using gh cli
# Usage: ./scripts/pr.sh [create|view|list|merge]
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
ACTION="${1:-list}"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  MEP Design Studio - Pull Requests${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}[✗] GitHub CLI (gh) not installed${NC}"
    echo "Install: https://cli.github.com/"
    exit 1
fi

# Check gh is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}[!] Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

case "$ACTION" in
    create)
        echo -e "${BLUE}Creating PR from $BRANCH...${NC}"
        echo ""

        # Get PR title
        read -p "PR Title: " PR_TITLE
        if [[ -z "$PR_TITLE" ]]; then
            PR_TITLE="$(git log -1 --format='%s')"
        fi

        # Generate body from recent commits
        echo ""
        echo -e "${CYAN}Recent commits to include:${NC}"
        git log --oneline main.."$BRANCH" 2>/dev/null || git log --oneline -5
        echo ""

        # Create PR
        gh pr create \
            --title "$PR_TITLE" \
            --body "## Summary
$(git log --oneline main..$BRANCH 2>/dev/null | sed 's/^/- /' || git log --oneline -5 | sed 's/^/- /')

## Test Plan
- [ ] Manual testing completed
- [ ] Integration tests pass
" \
            --head "$BRANCH"

        echo ""
        echo -e "${GREEN}[✓] PR created successfully${NC}"
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
        read -p "Merge method (merge/squash/rebase): " MERGE_METHOD
        MERGE_METHOD="${MERGE_METHOD:-squash}"
        gh pr merge "$BRANCH" --"$MERGE_METHOD" --delete-branch
        echo -e "${GREEN}[✓] PR merged${NC}"
        ;;

    status)
        echo -e "${BLUE}PR Status for $BRANCH:${NC}"
        gh pr status
        ;;

    *)
        echo "Usage: $0 [create|view|list|merge|status]"
        echo ""
        echo "Commands:"
        echo "  create  - Create a new PR from current branch"
        echo "  view    - Open PR in browser"
        echo "  list    - List all open PRs"
        echo "  merge   - Merge PR for current branch"
        echo "  status  - Show PR status"
        exit 1
        ;;
esac
