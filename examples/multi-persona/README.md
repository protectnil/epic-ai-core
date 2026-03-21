# Multi-Persona

Same federation, two personas — demonstrates runtime persona switching. The Praetor delivers a commanding threat briefing, then switches to an Analyst persona for conversational follow-up.

## Run

```bash
npx tsx index.ts
```

## What it does

1. Creates an agent with two registered personas (Praetor and Analyst)
2. Runs a briefing as Praetor (commanding, direct, references event IDs)
3. Switches persona to Analyst
4. Runs a follow-up question as Analyst (conversational, explains reasoning)
5. Both responses use the same federation, autonomy, and audit infrastructure
