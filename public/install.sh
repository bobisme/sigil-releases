#!/bin/sh
set -eu

# Sigil bootstrap installer.
#
# This script is intentionally small and readable. It presents a nicer public
# entrypoint at https://runsigil.com/install.sh, then delegates installation to
# the latest cargo-dist installer published in bobisme/sigil-releases.

APP_NAME="sigil"
INSTALLER_URL="https://github.com/bobisme/sigil-releases/releases/latest/download/sigil-installer.sh"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD="$(printf '\033[1m')"
  DIM="$(printf '\033[2m')"
  GREEN="$(printf '\033[32m')"
  BLUE="$(printf '\033[34m')"
  RED="$(printf '\033[31m')"
  RESET="$(printf '\033[0m')"
else
  BOLD=""
  DIM=""
  GREEN=""
  BLUE=""
  RED=""
  RESET=""
fi

say() {
  printf '%s\n' "$*"
}

info() {
  say "${BLUE}==>${RESET} $*"
}

success() {
  say "${GREEN}==>${RESET} $*"
}

usage() {
  cat <<EOF
Sigil installer

Downloads and runs the latest public Sigil release installer.

USAGE:
  curl -fsSL https://runsigil.com/install.sh | sh
  curl -fsSL https://runsigil.com/install.sh | sh -s -- [OPTIONS]

OPTIONS:
  --no-modify-path   Install without editing shell profile PATH entries
  -q, --quiet        Disable progress output in the release installer
  -v, --verbose      Enable verbose release-installer output
  -h, --help         Show this help
EOF
}

fail() {
  say "${RED}error:${RESET} $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

make_temp_dir() {
  if command -v mktemp >/dev/null 2>&1; then
    mktemp -d "${TMPDIR:-/tmp}/sigil-install.XXXXXX"
  else
    dir="${TMPDIR:-/tmp}/sigil-install.$$"
    mkdir -p "$dir"
    printf '%s\n' "$dir"
  fi
}

download() {
  url="$1"
  dest="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$dest" "$url"
  else
    fail "install curl or wget, then run this installer again"
  fi
}

print_banner() {
  say "${BOLD}Sigil installer${RESET}"
  say "${DIM}Fetching the latest public release installer.${RESET}"
  say ""
}

run_installer() {
  tmp_dir="$(make_temp_dir)"
  installer="$tmp_dir/sigil-installer.sh"
  trap 'rm -rf "$tmp_dir"' EXIT INT TERM

  info "Downloading ${APP_NAME} installer"
  download "$INSTALLER_URL" "$installer"
  chmod +x "$installer"

  info "Running installer"
  sh "$installer" "$@"
}

main() {
  case "${1:-}" in
    -h|--help)
      usage
      exit 0
      ;;
  esac

  print_banner
  need_cmd sh
  run_installer "$@"
  success "Done"
}

main "$@"
