# Bank Templates

These templates are designed for large vocabulary banks such as 1,000 entries per bank.

## Recommended workflow

1. Use `scripts/generate-bank-templates.ps1` to create fresh 1,000-entry template files.
2. Fill in real vocabulary content while keeping the same field structure.
3. Run `scripts/validate-banks.ps1` before shipping changes.

## Entry shape

Each entry should follow the schema in `bank-entry.schema.json`:

```json
{
  "id": "toeic-0001",
  "word": "implement",
  "displayWord": "Implement",
  "phonetic": "/ˈɪmplɪment/",
  "mean": "實施; 執行",
  "pos": "v.",
  "level": "core",
  "tags": ["business"],
  "example": "We need to implement the new policy next month.",
  "exampleZh": "我們需要在下個月實施新政策。",
  "synonyms": ["execute", "carry out"],
  "distractors": ["延後", "維持", "協商"],
  "source": "internal",
  "updatedAt": "2026-04-08"
}
```

## Notes

- `word` should be normalized for stable matching, usually lowercase.
- `displayWord` is what the UI shows.
- `pos` should stay within `n.`, `v.`, `adj.`, `adv.`.
- `distractors` is optional in practice, but keep the field present so validation stays predictable.
