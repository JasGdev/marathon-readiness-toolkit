# Pace Gap Reality Check

**Pace Gap Reality Check** is the third module in the **Marathon Readiness Toolkit**.  
It helps runners objectively understand the gap between their **current capability** and their **goal pace**, without judgment, pressure, or training prescriptions.

This tool focuses on **orientation, expectation-setting, and anxiety reduction** — not coaching.

---

## What problem this solves

Many runners struggle with questions like:

- “My goal pace feels hard — is that normal?”
- “Am I too far off my target?”
- “Is this gap realistic for this training cycle?”

This module answers those questions by **quantifying the pace gap** and placing it in a **neutral, contextual frame**.

---

## What this module does

**Inputs**
- Current sustainable pace (derived from a recent race effort or estimator)
- Goal pace (from Goal Pace Converter)
- Time remaining until race day (weeks)

**Outputs**
- Pace gap in seconds per kilometer
- Gap classification (small / medium / large)
- Calm, non-judgmental explanation of what that gap typically means

---

## What this module does NOT do

- ❌ Does not provide training plans  
- ❌ Does not tell users what workouts to do  
- ❌ Does not label goals as “good” or “bad”  

The intent is clarity, not pressure.

---

## Example interpretations

### Small gap (≤ ~10–15 sec / km)
> A common and manageable difference. Many runners naturally close this gap through consistent training and race-day conditions.

### Medium gap (~20–30 sec / km)
> Requires deliberate training progression. Not unusual, but unlikely to disappear without time and structure.

### Large gap (40+ sec / km)
> More aspirational for the current cycle. Better framed as a longer-term direction rather than immediate expectation.

Tone is intentionally neutral and reassuring.

---

## How it fits in the toolkit

| Module | Role |
|------|-----|
| Race Time Estimator | Establishes current capability |
| Goal Pace Converter | Defines goal demand |
| **Pace Gap Reality Check** | Interprets the difference |
| Timeline Context | Adds race-date perspective |
| Progress Trendline | Tracks change over time |

This module acts as the **bridge between aspiration and reality**.

---

## Technical design principles

- Fully standalone (HTML / CSS / JS)
- Single root container for WordPress safety
- No external dependencies
- Read-only logic (no heavy user input)
- Can accept values via:
  - manual input
  - shared state (future integration)
  - query parameters (optional)

---

## Intended use cases

- First-time marathoners unsure if their goal is realistic
- Experienced runners recalibrating expectations mid-cycle
- Users feeling anxious late in training
- Quick reality check before adjusting goals

---

## Philosophy

This tool is built on the idea that:

> Most runners don’t need more intensity —  
> they need **better context**.

Pace Gap Reality Check exists to provide that context.

---

## Status

- [ ] UI scaffold
- [ ] Pace gap calculation
- [ ] Interpretation logic
- [ ] Demo integration
- [ ] Shared-state support (future)

---

## License

MIT (same as the Marathon Readiness Toolkit)
