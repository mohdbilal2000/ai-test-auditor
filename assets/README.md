# assets

Place the demo recording here as `demo.gif` (referenced from the root README).

Record it with your favourite terminal recorder, e.g.:

```bash
# using vhs (https://github.com/charmbracelet/vhs) or asciinema + agg
ai-test-auditor examples/
```

Suggested 8-second script:

1. `ai-test-auditor examples/` — show the grouped STRONG/WEAK/FAKE table.
2. `ai-test-auditor examples/ --fail-on weak; echo $?` — show the non-zero exit.
