# the-grid System Environment

Generated: 2026-04-21 10:43 CDT

## System Information

- Hostname: the-grid
- Computer Name: the-grid
- IP: 192.168.0.125
- OS: macOS 26.4 (Tahoe, build 25E246)
- Shell: /bin/zsh

## Modern CLI Tools

| Tool       | Purpose                   | Version                            |
| ---------- | ------------------------- | ---------------------------------- |
| eza        | ls replacement            | installed (version string opaque)  |
| bat        | cat replacement           | 0.26.1                             |
| fd         | find replacement          | 10.4.2                             |
| rg         | grep replacement          | ripgrep 15.1.0                     |
| sd         | sed replacement           | 1.0.0                              |
| dust       | du replacement            | 1.2.4                              |
| btm        | top replacement (bottom)  | 0.12.3                             |
| jq         | JSON processor            | 1.8.1                              |
| uv         | Python package manager    | 0.9.7 (0adb44480 2025-10-30)       |
| gh         | GitHub CLI                | 2.89.0 (2026-03-26)                |
| delta      | git diff pager            | 0.19.2                             |
| tmux       | terminal multiplexer      | 3.6a                               |
| nvim       | editor                    | 0.12.1                             |
| fzf        | fuzzy finder              | 0.71.0 (Homebrew)                  |
| oh-my-posh | shell prompt              | 29.10.0                            |
| kitty      | terminal emulator         | 0.46.2                             |
| starship   | —                         | not installed (oh-my-posh in use)  |

## Shell Configuration

### Aliases (selected)

Navigation:
- `..`, `...`, `....`, `.....` — cd up N levels
- `-` — `cd -`
- `dl`, `docs`, `dt` — jump to Downloads / Documents / Desktop

Modern-tool shims:
- `ls='eza --icons --group-directories-first'`
- `l`, `la`, `ll` — eza long variants
- `lt`, `lt2`, `lt3`, `ltm`, `lts` — eza tree / sort variants
- `cat=bat`, `find=fd`, `du=dust`, `htop=btm`

Git:
- `g=git`, `gs='git status -sb'`, `gst='git status'`
- `ga`, `gaa`, `gap` — add / add-all / add-patch
- `gc='git commit -v'`, `gca`, `gcm`, `gcb`, `gco`
- `gd='git diff'`, `gds='git diff --staged'`
- `gl` (oneline/graph -20), `gll` (all), `gb`, `gf`, `gp`, `gpl`

Claude Code:
- `cdsp='claude --dangerously-skip-permissions'`
- `cdspc` (+ `--chrome`)
- `cdspr` (+ `--resume`)

Ops:
- `flushdns`, `localip`, `myip`
- `hidefiles` (Finder toggle)

### Functions (user-defined)

Navigation / files: `mkcd`, `cdg`, `extract`, `backup`, `serve`, `fcd`
Dev helpers: `rgi`, `zi`, `fe`, `gcof`, `glog`
Utilities: `calc`, `weather`, `notify`, `dataurl`, `sizeof`, `pathshow`, `colors`
Shell hooks / completions: `compinit`, `compdef`, `fzf-*-widget`, `set_poshcontext`, `enable_poshtransientprompt`, `enable_poshtooltips`

### Homebrew

- Homebrew 5.1.7
- 236 packages installed

## Development Environment

### Python
- python3: 3.14.4
- uv: 0.9.7

### Node
- node: 25.9.0
- npm: 11.12.1
- bun: 1.3.1

### Systems languages
- rustc: 1.93.0 / cargo: 1.93.0
- go: 1.26.2 (darwin/arm64)

### Version control
- git: 2.53.0
- gh: 2.89.0
- delta: 0.19.2

## Terminal Stack

- Terminal: kitty 0.46.2
- Multiplexer: tmux 3.6a (currently active: `TERM_PROGRAM=tmux`)
- Editor: nvim 0.12.1
- Prompt: oh-my-posh 29.10.0

## Capabilities Summary

- Apple Silicon macOS 26.4 Tahoe workstation
- Full modern CLI stack (Berkeley Mono + kitty + tmux + oh-my-posh)
- Four active language toolchains (Python/Node/Rust/Go) plus Bun
- GitHub CLI + delta ready — GH Pages publishing workflow is unblocked at the tooling layer
- uv-first Python (never pip/poetry/pipenv per global CLAUDE.md)
