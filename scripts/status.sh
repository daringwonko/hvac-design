#!/bin/bash
# =============================================================================
# MEP Design Studio - Repository Status Script (GitHub CLI Version)
# =============================================================================
# Shows comprehensive repository status using GitHub CLI
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

# Check gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}[!] GitHub CLI (gh) not installed - limited info available${NC}"
    GH_AVAILABLE=false
else
    GH_AVAILABLE=true
fi

# Check gh authentication
if [[ "$GH_AVAILABLE" == "true" ]]; then
    echo -e "${CYAN}GitHub CLI Status:${NC}"
    if gh auth status &> /dev/null; then
        GH_USER=$(gh api user --jq '.login' 2>/dev/null || echo "unknown")
        echo -e "  ${GREEN}Authenticated as: $GH_USER${NC}"
    else
        echo -e "  ${YELLOW}Not authenticated (run: gh auth login)${NC}"
        GH_AVAILABLE=false
    fi
    echo ""
fi

# Get repo info using gh repo view
if [[ "$GH_AVAILABLE" == "true" ]]; then
    REPO_INFO=$(gh repo view --json nameWithOwner,description,url,defaultBranchRef 2>/dev/null)
    if [[ -n "$REPO_INFO" ]]; then
        REPO_NAME=$(echo "$REPO_INFO" | gh api --input - --jq '.nameWithOwner' 2>/dev/null || echo "")
        REPO_URL=$(echo "$REPO_INFO" | gh api --input - --jq '.url' 2>/dev/null || echo "")
        DEFAULT_BRANCH=$(echo "$REPO_INFO" | gh api --input - --jq '.defaultBranchRef.name' 2>/dev/null || echo "main")
        echo -e "${CYAN}Repository:${NC}     $REPO_NAME"
        echo -e "${CYAN}URL:${NC}            $REPO_URL"
        echo -e "${CYAN}Default Branch:${NC} $DEFAULT_BRANCH"
    else
        echo -e "${CYAN}Repository:${NC} $(basename $(git rev-parse --show-toplevel))"
    fi
else
    echo -e "${CYAN}Repository:${NC} $(basename $(git rev-parse --show-toplevel))"
fi

# Local git info
echo -e "${CYAN}Current Branch:${NC} $BRANCH"
echo -e "${CYAN}Commit:${NC}         $(git rev-parse --short HEAD)"
echo -e "${CYAN}Author:${NC}         $(git log -1 --format='%an <%ae>')"
echo -e "${CYAN}Date:${NC}           $(git log -1 --format='%ar')"
echo ""

# Check remote URL type
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "none")
if [[ "$REMOTE_URL" == git@* ]]; then
    echo -e "${YELLOW}[!] Remote uses SSH: $REMOTE_URL${NC}"
    echo -e "${YELLOW}    Consider switching to HTTPS for gh compatibility${NC}"
elif [[ "$REMOTE_URL" == https://* ]]; then
    echo -e "${GREEN}[ok] Remote uses HTTPS${NC}"
fi
echo ""

# Fetch and compare with remote using gh api if available
if [[ "$GH_AVAILABLE" == "true" ]]; then
    echo -e "${CYAN}Remote Status (via GitHub API):${NC}"
    REPO_NAME=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)
    if [[ -n "$REPO_NAME" ]]; then
        REMOTE_SHA=$(gh api "repos/${REPO_NAME}/commits/${BRANCH}" --jq '.sha' 2>/dev/null)
        LOCAL_SHA=$(git rev-parse HEAD)

        if [[ -z "$REMOTE_SHA" ]]; then
            echo -e "  ${YELLOW}Remote branch not found${NC}"
        elif [[ "$LOCAL_SHA" == "$REMOTE_SHA" ]]; then
            echo -e "  ${GREEN}In sync with remote${NC}"
        else
            # Fetch to get accurate ahead/behind count
            git fetch origin "$BRANCH" 2>/dev/null || true
            AHEAD=$(git rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null || echo "?")
            BEHIND=$(git rev-list --count "HEAD..origin/$BRANCH" 2>/dev/null || echo "?")
            [[ "$AHEAD" != "0" && "$AHEAD" != "?" ]] && echo -e "  ${YELLOW}$AHEAD commit(s) ahead of remote${NC}"
            [[ "$BEHIND" != "0" && "$BEHIND" != "?" ]] && echo -e "  ${YELLOW}$BEHIND commit(s) behind remote${NC}"
        fi
    fi
else
    # Fallback to git fetch
    git fetch origin "$BRANCH" 2>/dev/null
    LOCAL=$(git rev-parse HEAD 2>/dev/null)
    REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "none")

    if [[ "$REMOTE" == "none" ]]; then
        echo -e "${YELLOW}[!] Remote branch not found${NC}"
    elif [[ "$LOCAL" == "$REMOTE" ]]; then
        echo -e "${GREEN}[ok] In sync with remote${NC}"
    else
        AHEAD=$(git rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null || echo "0")
        BEHIND=$(git rev-list --count "HEAD..origin/$BRANCH" 2>/dev/null || echo "0")

        if [[ "$AHEAD" -gt 0 ]]; then
            echo -e "${YELLOW}[i] $AHEAD commit(s) ahead of remote${NC}"
        fi
        if [[ "$BEHIND" -gt 0 ]]; then
            echo -e "${YELLOW}[i] $BEHIND commit(s) behind remote${NC}"
        fi
    fi
fi
echo ""

# Working tree status (local git operation)
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

# PR status using gh
if [[ "$GH_AVAILABLE" == "true" ]]; then
    echo -e "${CYAN}Pull Request Status:${NC}"
    PR_INFO=$(gh pr view "$BRANCH" --json number,title,state,url 2>/dev/null)
    if [[ -n "$PR_INFO" ]]; then
        PR_NUM=$(echo "$PR_INFO" | gh api --input - --jq '.number' 2>/dev/null)
        PR_TITLE=$(echo "$PR_INFO" | gh api --input - --jq '.title' 2>/dev/null)
        PR_STATE=$(echo "$PR_INFO" | gh api --input - --jq '.state' 2>/dev/null)
        PR_URL=$(echo "$PR_INFO" | gh api --input - --jq '.url' 2>/dev/null)
        echo -e "  #$PR_NUM: $PR_TITLE"
        echo -e "  State: $PR_STATE"
        echo -e "  URL: $PR_URL"
    else
        echo -e "  ${YELLOW}No PR found for this branch${NC}"
    fi
    echo ""
fi

# Recent commits (local git operation)
echo -e "${CYAN}Recent Commits:${NC}"
git log --oneline -5
echo ""

# Stash list (local git operation)
STASH_COUNT=$(git stash list | wc -l)
if [[ $STASH_COUNT -gt 0 ]]; then
    echo -e "${CYAN}Stashed Changes:${NC} $STASH_COUNT item(s)"
    git stash list | head -3
    echo ""
fi

echo -e "${BLUE}===========================================${NC}"
