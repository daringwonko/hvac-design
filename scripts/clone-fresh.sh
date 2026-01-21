#!/bin/bash
# =============================================================================
# MEP Design Studio - Fresh Clone Script (GitHub CLI Version)
# =============================================================================
# Clones a fresh copy of the repository using gh repo clone
# Usage: ./scripts/clone-fresh.sh [target-directory]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  MEP Design Studio - Fresh Clone${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}[x] GitHub CLI (gh) not installed${NC}"
    echo "Install: https://cli.github.com/"
    exit 1
fi

# Check gh authentication
echo -e "${CYAN}Verifying GitHub authentication...${NC}"
if ! gh auth status &> /dev/null; then
    echo -e "${RED}[x] Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi
GH_USER=$(gh api user --jq '.login' 2>/dev/null || echo "unknown")
echo -e "${GREEN}[ok] Authenticated as: $GH_USER${NC}"
echo ""

# Get repo info from current directory or use default
if git rev-parse --is-inside-work-tree &>/dev/null; then
    # Get repo name using gh repo view
    REPO_NAME=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)
    if [[ -z "$REPO_NAME" ]]; then
        # Fallback: extract from remote URL
        REPO_URL=$(git remote get-url origin 2>/dev/null)
        if [[ "$REPO_URL" == git@* ]]; then
            REPO_NAME=$(echo "$REPO_URL" | sed 's/git@github.com://' | sed 's/\.git$//')
        elif [[ "$REPO_URL" == https://* ]]; then
            REPO_NAME=$(echo "$REPO_URL" | sed 's|https://github.com/||' | sed 's/\.git$//')
        fi
    fi
    CURRENT_BRANCH=$(git branch --show-current)
else
    echo -e "${RED}[x] Not in a git repository${NC}"
    echo "Run this from within the hvac-design repository"
    exit 1
fi

if [[ -z "$REPO_NAME" ]]; then
    echo -e "${RED}[x] Could not determine repository name${NC}"
    exit 1
fi

TARGET_DIR="${1:-hvac-design-fresh}"

echo -e "${CYAN}Repository:${NC} $REPO_NAME"
echo -e "${CYAN}Branch:${NC}     $CURRENT_BRANCH"
echo -e "${CYAN}Target:${NC}     ~/$TARGET_DIR"
echo ""

# Verify repo exists on GitHub
echo -e "${BLUE}Verifying repository on GitHub...${NC}"
if ! gh repo view "$REPO_NAME" &>/dev/null; then
    echo -e "${RED}[x] Repository not found or not accessible: $REPO_NAME${NC}"
    exit 1
fi
echo -e "${GREEN}[ok] Repository verified${NC}"
echo ""

read -p "This will clone a fresh copy. Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}[!] Cancelled${NC}"
    exit 0
fi

cd ~

# Remove if exists
if [[ -d "$TARGET_DIR" ]]; then
    echo -e "${YELLOW}[!] Removing existing $TARGET_DIR...${NC}"
    rm -rf "$TARGET_DIR"
fi

# Clone using gh repo clone (uses HTTPS by default with gh auth)
echo -e "${BLUE}[1/3]${NC} Cloning repository via GitHub CLI..."
gh repo clone "$REPO_NAME" "$TARGET_DIR"

cd "$TARGET_DIR"

# Verify HTTPS remote (gh repo clone should set this by default)
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
echo -e "${CYAN}Remote URL:${NC} $REMOTE_URL"

# Checkout branch
echo -e "${BLUE}[2/3]${NC} Checking out $CURRENT_BRANCH..."
if git show-ref --verify --quiet "refs/remotes/origin/$CURRENT_BRANCH"; then
    git checkout "$CURRENT_BRANCH" 2>/dev/null || git checkout -b "$CURRENT_BRANCH" "origin/$CURRENT_BRANCH"
else
    echo -e "${YELLOW}[!] Branch $CURRENT_BRANCH not found on remote, staying on default branch${NC}"
fi

# Install dependencies
echo -e "${BLUE}[3/3]${NC} Installing dependencies..."
if [[ -f "engine/frontend/package.json" ]]; then
    cd engine/frontend
    npm install
    cd ../..
fi

# Final verification
echo ""
echo -e "${CYAN}Verifying clone...${NC}"
echo -e "  Branch: $(git branch --show-current)"
echo -e "  Commit: $(git rev-parse --short HEAD)"
echo -e "  Remote: $(git remote get-url origin)"

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Fresh Clone Complete!${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo "Next steps:"
echo -e "  cd ~/$TARGET_DIR"
echo -e "  ./start.sh"
