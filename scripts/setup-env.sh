#!/bin/bash
#==============================================================================
#  MEP Design Studio - Environment Setup Script
#==============================================================================
#
#  This script sets up the complete development environment for MEP Design Studio.
#
#  Usage:
#    chmod +x scripts/setup-env.sh
#    ./scripts/setup-env.sh
#
#  Requirements:
#    - Python 3.10+
#    - Node.js 18+
#    - npm (comes with Node.js)
#    - gh CLI (optional, for GitHub integration)
#
#==============================================================================

set -e

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

#------------------------------------------------------------------------------
# Color Definitions
#------------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

#------------------------------------------------------------------------------
# Status Indicators
#------------------------------------------------------------------------------
SUCCESS="${GREEN}[SUCCESS]${NC}"
FAILURE="${RED}[FAILURE]${NC}"
WARNING="${YELLOW}[WARNING]${NC}"
INFO="${BLUE}[INFO]${NC}"
SKIP="${DIM}[SKIP]${NC}"
CHECK="${GREEN}[CHECK]${NC}"

#------------------------------------------------------------------------------
# Counters
#------------------------------------------------------------------------------
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0

#------------------------------------------------------------------------------
# Helper Functions
#------------------------------------------------------------------------------

print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}${WHITE}MEP Design Studio - Environment Setup${NC}                         ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${DIM}Comprehensive development environment configuration${NC}            ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${WHITE}  $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_step() {
    echo -e "\n${BLUE}>>>${NC} ${BOLD}$1${NC}"
}

log_success() {
    echo -e "  ${SUCCESS} $1"
    ((CHECKS_PASSED++)) || true
}

log_failure() {
    echo -e "  ${FAILURE} $1"
    ((CHECKS_FAILED++)) || true
}

log_warning() {
    echo -e "  ${WARNING} $1"
    ((CHECKS_WARNED++)) || true
}

log_info() {
    echo -e "  ${INFO} $1"
}

log_skip() {
    echo -e "  ${SKIP} $1"
}

version_compare() {
    # Compare two version strings
    # Returns: 0 if equal, 1 if $1 > $2, 2 if $1 < $2
    if [[ $1 == $2 ]]; then
        return 0
    fi
    local IFS=.
    local i ver1=($1) ver2=($2)
    # Fill empty fields with zeros
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++)); do
        ver1[i]=0
    done
    for ((i=0; i<${#ver1[@]}; i++)); do
        if [[ -z ${ver2[i]} ]]; then
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]})); then
            return 1
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]})); then
            return 2
        fi
    done
    return 0
}

check_min_version() {
    # $1 = actual version, $2 = minimum required
    version_compare "$1" "$2"
    result=$?
    if [[ $result -eq 2 ]]; then
        return 1  # actual < required
    fi
    return 0  # actual >= required
}

#------------------------------------------------------------------------------
# Main Setup Functions
#------------------------------------------------------------------------------

check_python_version() {
    print_step "Checking Python version (requires 3.10+)"

    if ! command -v python3 &> /dev/null; then
        log_failure "Python3 not found! Please install Python 3.10+"
        echo -e "         ${DIM}Install: https://www.python.org/downloads/${NC}"
        return 1
    fi

    PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")')
    PYTHON_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
    PYTHON_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')

    if [[ "$PYTHON_MAJOR" -ge 3 ]] && [[ "$PYTHON_MINOR" -ge 10 ]]; then
        log_success "Python $PYTHON_VERSION detected"
        return 0
    else
        log_failure "Python $PYTHON_VERSION found, but 3.10+ required"
        echo -e "         ${DIM}Current: $PYTHON_VERSION | Required: 3.10+${NC}"
        return 1
    fi
}

check_node_version() {
    print_step "Checking Node.js version (requires 18+)"

    if ! command -v node &> /dev/null; then
        log_failure "Node.js not found! Please install Node.js 18+"
        echo -e "         ${DIM}Install: https://nodejs.org/ or use nvm${NC}"
        return 1
    fi

    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

    if [[ "$NODE_MAJOR" -ge 18 ]]; then
        log_success "Node.js v$NODE_VERSION detected"

        # Also check npm
        if command -v npm &> /dev/null; then
            NPM_VERSION=$(npm -v)
            log_success "npm $NPM_VERSION detected"
        else
            log_warning "npm not found (should come with Node.js)"
        fi
        return 0
    else
        log_failure "Node.js v$NODE_VERSION found, but 18+ required"
        echo -e "         ${DIM}Current: v$NODE_VERSION | Required: v18+${NC}"
        return 1
    fi
}

setup_python_venv() {
    print_step "Setting up Python virtual environment"

    VENV_PATH="$PROJECT_ROOT/venv"

    if [[ -d "$VENV_PATH" ]]; then
        log_info "Virtual environment already exists at ./venv"

        # Check if it's valid
        if [[ -f "$VENV_PATH/bin/activate" ]]; then
            log_success "Virtual environment is valid"
        else
            log_warning "Virtual environment appears corrupted, recreating..."
            rm -rf "$VENV_PATH"
            python3 -m venv "$VENV_PATH"
            log_success "Virtual environment recreated"
        fi
    else
        log_info "Creating virtual environment..."
        python3 -m venv "$VENV_PATH"
        log_success "Virtual environment created at ./venv"
    fi

    # Activate for this script
    source "$VENV_PATH/bin/activate"
    log_info "Virtual environment activated"

    # Upgrade pip
    log_info "Upgrading pip..."
    pip install --upgrade pip -q
    log_success "pip upgraded to $(pip --version | awk '{print $2}')"
}

install_python_deps() {
    print_step "Installing Python dependencies"

    # Ensure venv is activated
    if [[ -z "$VIRTUAL_ENV" ]]; then
        source "$PROJECT_ROOT/venv/bin/activate"
    fi

    # Check for requirements.txt
    if [[ -f "$PROJECT_ROOT/requirements.txt" ]]; then
        log_info "Installing from requirements.txt..."
        if pip install -r "$PROJECT_ROOT/requirements.txt" -q 2>&1; then
            log_success "Python dependencies installed"
        else
            log_warning "Some dependencies may have failed to install"
            pip install -r "$PROJECT_ROOT/requirements.txt" 2>&1 | grep -i "error\|failed" || true
        fi
    elif [[ -f "$PROJECT_ROOT/engine/requirements.txt" ]]; then
        log_info "Installing from engine/requirements.txt..."
        if pip install -r "$PROJECT_ROOT/engine/requirements.txt" -q 2>&1; then
            log_success "Python dependencies installed"
        else
            log_warning "Some dependencies may have failed to install"
        fi
    else
        log_failure "No requirements.txt found"
        return 1
    fi

    # Verify key packages
    echo ""
    log_info "Verifying key packages:"

    packages=("flask" "flask_cors" "pydantic" "numpy" "pandas" "pytest")
    for pkg in "${packages[@]}"; do
        if python3 -c "import $pkg" 2>/dev/null; then
            version=$(pip show "${pkg//_/-}" 2>/dev/null | grep "Version:" | awk '{print $2}' || echo "installed")
            echo -e "         ${GREEN}+${NC} $pkg ${DIM}($version)${NC}"
        else
            echo -e "         ${RED}-${NC} $pkg ${DIM}(not installed)${NC}"
        fi
    done
}

install_node_deps() {
    print_step "Installing Node.js dependencies"

    FRONTEND_PATH="$PROJECT_ROOT/engine/frontend"

    if [[ ! -d "$FRONTEND_PATH" ]]; then
        log_warning "Frontend directory not found at engine/frontend"
        return 1
    fi

    if [[ ! -f "$FRONTEND_PATH/package.json" ]]; then
        log_failure "package.json not found in engine/frontend"
        return 1
    fi

    log_info "Installing npm packages in engine/frontend..."
    cd "$FRONTEND_PATH"

    if npm install 2>&1 | tail -5; then
        log_success "Node.js dependencies installed"
    else
        log_failure "npm install failed"
        cd "$PROJECT_ROOT"
        return 1
    fi

    cd "$PROJECT_ROOT"

    # Verify node_modules
    if [[ -d "$FRONTEND_PATH/node_modules" ]]; then
        MODULE_COUNT=$(ls -1 "$FRONTEND_PATH/node_modules" | wc -l)
        log_info "$MODULE_COUNT npm packages installed"
    fi
}

check_config_files() {
    print_step "Checking required configuration files"

    # List of config files to check
    declare -A config_files
    config_files["engine/frontend/package.json"]="Frontend package config"
    config_files["engine/frontend/vite.config.js"]="Vite configuration"
    config_files["engine/frontend/tailwind.config.js"]="Tailwind CSS config"
    config_files[".gitignore"]="Git ignore rules"

    for file in "${!config_files[@]}"; do
        if [[ -f "$PROJECT_ROOT/$file" ]]; then
            log_success "${config_files[$file]} found"
        else
            log_warning "${config_files[$file]} missing ($file)"
        fi
    done

    # Check for data directory
    if [[ -d "$PROJECT_ROOT/data" ]]; then
        log_success "Data directory exists"
        DATA_FILES=$(ls -1 "$PROJECT_ROOT/data" 2>/dev/null | wc -l)
        log_info "$DATA_FILES files in data directory"
    else
        log_warning "Data directory not found"
        mkdir -p "$PROJECT_ROOT/data"
        log_info "Created data directory"
    fi
}

create_env_file() {
    print_step "Setting up environment configuration"

    ENV_FILE="$PROJECT_ROOT/.env"

    if [[ -f "$ENV_FILE" ]]; then
        log_info ".env file already exists"
        log_skip "Skipping .env creation (remove to regenerate)"
    else
        log_info "Creating .env file with defaults..."

        cat > "$ENV_FILE" << 'EOF'
# =============================================================================
# MEP Design Studio - Environment Configuration
# =============================================================================
# Copy this to .env and customize for your environment.
# NEVER commit .env to version control!
# =============================================================================

# -----------------------------------------------------------------------------
# Application Mode
# -----------------------------------------------------------------------------
FLASK_DEBUG=true
FLASK_ENV=development

# -----------------------------------------------------------------------------
# Server Configuration
# -----------------------------------------------------------------------------
PORT=5000
HOST=0.0.0.0

# -----------------------------------------------------------------------------
# Security (CHANGE IN PRODUCTION!)
# -----------------------------------------------------------------------------
SECRET_KEY=mep-design-studio-dev-key-change-in-production
JWT_SECRET=jwt-secret-key-change-in-production-please

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
# Comma-separated list of allowed origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000

# -----------------------------------------------------------------------------
# Database (Optional)
# -----------------------------------------------------------------------------
# DATABASE_URL=sqlite:///data/mep_studio.db
# REDIS_URL=redis://localhost:6379/0

# -----------------------------------------------------------------------------
# API Keys (Optional)
# -----------------------------------------------------------------------------
# OPENAI_API_KEY=sk-your-key-here
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
LOG_LEVEL=INFO
LOG_FORMAT=%(asctime)s - %(name)s - %(levelname)s - %(message)s

# -----------------------------------------------------------------------------
# Feature Flags
# -----------------------------------------------------------------------------
ENABLE_WEBSOCKETS=true
ENABLE_IOT=false
ENABLE_ML_FEATURES=false
EOF

        log_success ".env file created with default values"
        log_warning "Remember to customize SECRET_KEY and JWT_SECRET for production!"
    fi

    # Add .env to .gitignore if not present
    if [[ -f "$PROJECT_ROOT/.gitignore" ]]; then
        if ! grep -q "^\.env$" "$PROJECT_ROOT/.gitignore"; then
            echo -e "\n# Environment files\n.env\n.env.local\n.env.*.local" >> "$PROJECT_ROOT/.gitignore"
            log_info "Added .env to .gitignore"
        fi
    fi
}

check_gh_cli() {
    print_step "Checking GitHub CLI (gh)"

    if ! command -v gh &> /dev/null; then
        log_warning "GitHub CLI (gh) not installed"
        echo -e "         ${DIM}Install: https://cli.github.com/${NC}"
        echo -e "         ${DIM}macOS: brew install gh${NC}"
        echo -e "         ${DIM}Linux: See https://github.com/cli/cli/blob/trunk/docs/install_linux.md${NC}"
        return 1
    fi

    GH_VERSION=$(gh --version | head -1 | awk '{print $3}')
    log_success "GitHub CLI version $GH_VERSION installed"

    # Check authentication
    if gh auth status &> /dev/null; then
        GH_USER=$(gh api user --jq '.login' 2>/dev/null || echo "unknown")
        log_success "Authenticated as: $GH_USER"
    else
        log_warning "GitHub CLI not authenticated"
        echo -e "         ${DIM}Run: gh auth login${NC}"
        return 1
    fi
}

run_health_check() {
    print_step "Running quick health check"

    # Ensure venv is activated
    if [[ -d "$PROJECT_ROOT/venv" ]]; then
        source "$PROJECT_ROOT/venv/bin/activate"
    fi

    # Check Python imports
    log_info "Testing Python imports..."

    IMPORT_TEST=$(python3 << 'EOF'
import sys
errors = []
try:
    import flask
    print(f"  + flask {flask.__version__}")
except ImportError as e:
    errors.append(f"flask: {e}")

try:
    from flask_cors import CORS
    print(f"  + flask-cors OK")
except ImportError as e:
    errors.append(f"flask-cors: {e}")

try:
    import numpy as np
    print(f"  + numpy {np.__version__}")
except ImportError as e:
    errors.append(f"numpy: {e}")

try:
    import pandas as pd
    print(f"  + pandas {pd.__version__}")
except ImportError as e:
    errors.append(f"pandas: {e}")

try:
    import pydantic
    print(f"  + pydantic {pydantic.__version__}")
except ImportError as e:
    errors.append(f"pydantic: {e}")

if errors:
    print("\nImport errors:")
    for err in errors:
        print(f"  - {err}")
    sys.exit(1)
EOF
)

    if [[ $? -eq 0 ]]; then
        echo -e "${DIM}$IMPORT_TEST${NC}"
        log_success "Python imports successful"
    else
        echo -e "${DIM}$IMPORT_TEST${NC}"
        log_warning "Some Python imports failed"
    fi

    # Check if Flask app can be imported
    log_info "Testing Flask application..."
    cd "$PROJECT_ROOT/engine"

    if python3 -c "from api.app import create_app; app = create_app(); print('Flask app created successfully')" 2>/dev/null; then
        log_success "Flask application loads correctly"
    else
        log_warning "Flask application failed to load (may need additional setup)"
    fi

    cd "$PROJECT_ROOT"

    # Check frontend build ability
    if [[ -f "$PROJECT_ROOT/engine/frontend/package.json" ]]; then
        log_info "Frontend is configured and ready"
    fi
}

print_summary() {
    print_section "Setup Summary"

    echo ""
    echo -e "  ${GREEN}Passed:${NC}  $CHECKS_PASSED checks"
    echo -e "  ${RED}Failed:${NC}  $CHECKS_FAILED checks"
    echo -e "  ${YELLOW}Warnings:${NC} $CHECKS_WARNED checks"
    echo ""

    if [[ $CHECKS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}  ${BOLD}Environment setup completed successfully!${NC}                      ${GREEN}║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    else
        echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║${NC}  ${BOLD}Setup completed with some issues. Review warnings above.${NC}       ${YELLOW}║${NC}"
        echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════╝${NC}"
    fi

    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo -e "  ${DIM}1.${NC} Activate the virtual environment:"
    echo -e "     ${BOLD}source venv/bin/activate${NC}"
    echo ""
    echo -e "  ${DIM}2.${NC} Start the development server:"
    echo -e "     ${BOLD}./start.sh${NC}"
    echo ""
    echo -e "  ${DIM}3.${NC} Or run backend and frontend separately:"
    echo -e "     ${BOLD}cd engine && python -m api.app${NC}"
    echo -e "     ${BOLD}cd engine/frontend && npm run dev${NC}"
    echo ""
    echo -e "${DIM}Project Root: $PROJECT_ROOT${NC}"
    echo -e "${DIM}Python Venv:  $PROJECT_ROOT/venv${NC}"
    echo ""
}

#------------------------------------------------------------------------------
# Main Execution
#------------------------------------------------------------------------------

main() {
    print_header

    # Check core requirements
    print_section "1. Checking System Requirements"
    check_python_version
    check_node_version

    # Set up Python environment
    print_section "2. Python Environment Setup"
    setup_python_venv
    install_python_deps

    # Set up Node.js environment
    print_section "3. Node.js Environment Setup"
    install_node_deps

    # Configuration files
    print_section "4. Configuration"
    check_config_files
    create_env_file

    # GitHub CLI
    print_section "5. GitHub Integration"
    check_gh_cli || true  # Don't fail on gh issues

    # Health check
    print_section "6. Health Check"
    run_health_check

    # Summary
    print_summary
}

# Run main function
main "$@"
