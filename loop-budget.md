# Loop Budget — Lumiera

> Primary loop: **Changelog Drafter** · UI: Studio Agents → Loops

## Daily limits

| Loop | Max runs/day | Max tokens/day | Max sub-agent spawns/run |
|------|--------------|----------------|--------------------------|
| Changelog Drafter | 1 | 100k | 0 (L1) / 2 (L2) |

## On budget exceed

1. Pause schedulers (`scheduler_delete` or disable automations)
2. Append event to `loop-run-log.md`
3. Notify human (Slack / issue / STATE.md High Priority)

## Kill switch

- Command or issue label: `loop-pause-all`
- Resume only after human clears the flag in STATE.md

## Estimate spend

```bash
npx @cobusgreyling/loop-cost --pattern changelog-drafter
```
