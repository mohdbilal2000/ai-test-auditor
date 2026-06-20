# assets

The root README embeds `assets/demo.gif`. Generate it with one of the methods below.

## Option A — VHS (recommended, scripted & reproducible)

[`vhs`](https://github.com/charmbracelet/vhs) turns a text "tape" into a GIF, so
the demo is identical every time.

```bash
brew install vhs            # macOS  (Linux: go install github.com/charmbracelet/vhs@latest)
npm run build && npm link   # make the `ai-test-auditor` command available
vhs assets/demo.tape        # writes assets/demo.gif
```

Edit `assets/demo.tape` to tweak the script, theme, size, or timing.

## Option B — asciinema + agg (real terminal capture → GIF)

```bash
brew install asciinema agg
asciinema rec demo.cast      # run your commands, then Ctrl-D to stop
agg demo.cast assets/demo.gif
```

## Option C — plain screen recorder (no extra CLI tools)

- **macOS:** `Cmd+Shift+5` → record a region of your terminal. Convert the `.mov`
  to GIF with `ffmpeg -i demo.mov -vf "fps=12,scale=1000:-1" assets/demo.gif`.
- **Windows:** `Win+G` (Game Bar) or [ScreenToGif](https://www.screentogif.com/).
- **Linux:** [Peek](https://github.com/phw/peek) records straight to GIF.

## The 8-second script

1. `ai-test-auditor examples/` — show the grouped STRONG / WEAK / FAKE table.
2. `ai-test-auditor examples/ --fail-on weak; echo $?` — show the non-zero exit.
3. `ai-test-auditor examples/ --json | head -20` — show machine-readable output.
