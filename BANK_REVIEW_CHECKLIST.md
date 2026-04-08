# Bank Review Checklist

Use this checklist whenever a new batch of words is added to any bank.

## 1. Bank Fit

- Does the word clearly belong to the target bank?
- Would a learner expect to see this word in this theme or level?
- Is the word duplicated in another bank where it fits better?

## 2. Word Quality

- Is `word` normalized and stable for matching?
- Is `displayWord` the correct display form?
- Is `pos` accurate for the intended meaning?
- Is the meaning concise and usable as a quiz option?

## 3. Example Quality

- Is the example sentence natural English?
- Is the example sentence short enough for learners?
- Does the sentence clearly show the target meaning?
- Does `exampleZh` match the English sentence faithfully?

## 4. Option Quality

- Are distractors plausible rather than random?
- Are distractors ideally the same part of speech?
- Does any distractor accidentally equal the correct answer?

## 5. Consistency

- Do tags match the bank theme?
- Does level assignment match nearby entries?
- Are synonyms actually close in meaning?
- Is `source` filled in so the entry can be traced later?

## 6. Release Gate

- Run `validate-banks.ps1 -StrictRichSchema`
- Spot-check 20 to 30 entries from the batch
- Review at least 5 entries with example sentences
- Review at least 5 entries with distractors
- Only publish after both validation and spot checks pass
