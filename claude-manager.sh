#!/bin/bash
# Claude Code Session Manager

BLUE="\033[1;34m"
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
CYAN="\033[1;36m"
RED="\033[1;31m"
DIM="\033[2m"
RESET="\033[0m"

show_menu() {
    clear
    echo -e "${CYAN}╔══════════════════════════════════════╗${RESET}"
    echo -e "${CYAN}║   Claude Code Session Manager        ║${RESET}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${RESET}"
    echo ""

    sessions=$(tmux list-sessions -F "#{session_name}:#{session_windows}:#{session_attached}" 2>/dev/null)

    if [ -z "$sessions" ]; then
        echo -e "  ${DIM}No active sessions${RESET}"
    else
        echo -e "  ${BLUE}Active Sessions:${RESET}"
        echo ""
        i=1
        while IFS=: read -r name windows attached; do
            if [ "$attached" = "1" ]; then
                status="${GREEN}● attached${RESET}"
            else
                status="${DIM}○ detached${RESET}"
            fi
            echo -e "  ${YELLOW}[$i]${RESET} $name  ${DIM}(${windows} window)${RESET}  $status"
            i=$((i + 1))
        done <<< "$sessions"
    fi

    echo ""
    echo -e "  ${GREEN}[n]${RESET} New session"
    echo -e "  ${RED}[q]${RESET} Quit"
    echo ""
    echo -ne "  ${CYAN}Select: ${RESET}"
}

create_session() {
    echo ""
    echo -ne "  ${CYAN}Session name ${DIM}(enter=auto)${RESET}: "
    read -r name

    if [ -z "$name" ]; then
        num=1
        while tmux has-session -t "session-$num" 2>/dev/null; do
            num=$((num + 1))
        done
        name="session-$num"
    fi

    echo -ne "  ${CYAN}Working dir ${DIM}(enter=/home)${RESET}: "
    read -r workdir
    workdir=${workdir:-/home}

    cd "$workdir" 2>/dev/null || cd /home
    tmux new-session -d -s "$name" "claude"
    echo -e "  ${GREEN}Created: $name${RESET}"
    sleep 0.5
    tmux attach -t "$name"
}

while true; do
    show_menu
    read -r choice

    case "$choice" in
        n|N)
            create_session
            ;;
        q|Q)
            echo -e "  ${DIM}Bye!${RESET}"
            exit 0
            ;;
        [0-9]*)
            name=$(tmux list-sessions -F "#{session_name}" 2>/dev/null | sed -n "${choice}p")
            if [ -n "$name" ]; then
                tmux attach -t "$name"
            else
                echo -e "  ${RED}Invalid selection${RESET}"
                sleep 1
            fi
            ;;
        *)
            echo -e "  ${RED}Invalid selection${RESET}"
            sleep 1
            ;;
    esac
done
