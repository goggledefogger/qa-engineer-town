# Accessibility Checks Orchestration Pattern

## Principles

- Each accessibility check is a pure function: no side effects, no DOM mutation unless required.
- Checks are run in sequence on a single page load unless a check requires state changes.
- If a check mutates the DOM or requires user interaction, reload or reset the page/context before the next check.
- Use a registry/orchestrator to manage and run all checks, making it easy to add/remove checks.
- Document any checks that require a specific order or state.

## Sample Orchestrator Pattern (Pseudocode)

```typescript
const checks = [
  checkKeyboardFocus,
  checkAccessibleNames,
  checkAriaStates,
  // ...more checks
];

async function runAllChecks(page) {
  const results = {};
  for (const check of checks) {
    results[check.name] = await check(page);
    if (check.requiresReset) {
      await page.reload(); // or create new context if needed
    }
  }
  return results;
}
```

## When to Reset/Reload

- Only for checks that interact with the UI or change the DOM in a way that could affect subsequent checks.
- Most static checks (labels, ARIA, tab order) do not require a reset.

## Extensibility

- Add new checks by implementing a function and registering it in the orchestrator.
- Each check should return a consistent result shape for easy reporting.

---

This pattern ensures accessibility checks remain modular, maintainable, and scalable as the codebase grows.
