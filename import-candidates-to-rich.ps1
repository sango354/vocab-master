param(
  [string]$CandidatesPath,
  [string]$OutputPath = (Join-Path $PSScriptRoot "candidate-drafts"),
  [string]$DefaultLevel = "core"
)

$ErrorActionPreference = "Stop"

if (-not $CandidatesPath) {
  throw "CandidatesPath is required."
}

if (-not (Test-Path $CandidatesPath)) {
  throw "Candidates file not found: $CandidatesPath"
}

New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null

$allowedBanks = @("toeic", "school7000", "dailyLife")
$allowedPos = @("n.", "v.", "adj.", "adv.")

$defaultTagMap = @{
  toeic = @("business")
  school7000 = @("academic")
  dailyLife = @("daily-life")
}

$defaultExampleMap = @{
  toeic = "This word often appears in business communication."
  school7000 = "This word often appears in academic reading passages."
  dailyLife = "This word often appears in daily conversations."
}

$candidates = Get-Content -Raw -Path $CandidatesPath | ConvertFrom-Json
$groupedByBank = @{}

foreach ($candidate in $candidates) {
  $bankKey = [string]$candidate.bankKey
  if ($allowedBanks -notcontains $bankKey) {
    throw "Unsupported bankKey: $bankKey"
  }

  if (-not $groupedByBank.ContainsKey($bankKey)) {
    $groupedByBank[$bankKey] = New-Object System.Collections.ArrayList
  }

  [void]$groupedByBank[$bankKey].Add($candidate)
}

foreach ($bankKey in $groupedByBank.Keys) {
  $entries = @()
  $index = 1

  foreach ($candidate in $groupedByBank[$bankKey]) {
    $word = [string]$candidate.word
    $displayWord = if ($candidate.displayWord) { [string]$candidate.displayWord } else { $word }
    $pos = if ($candidate.pos) { [string]$candidate.pos } else { "n." }

    if ($allowedPos -notcontains $pos) {
      throw "Invalid pos '$pos' for word '$word'"
    }

    $entryId = if ($candidate.id) {
      [string]$candidate.id
    } else {
      "{0}-{1}" -f $bankKey.ToLowerInvariant(), $index.ToString("0000")
    }

    $entries += [ordered]@{
      id = $entryId
      word = $word.ToLowerInvariant()
      displayWord = $displayWord
      phonetic = if ($candidate.phonetic) { [string]$candidate.phonetic } else { "" }
      mean = if ($candidate.mean) { [string]$candidate.mean } else { "" }
      pos = $pos
      level = if ($candidate.level) { [string]$candidate.level } else { $DefaultLevel }
      tags = if ($candidate.tags) { @($candidate.tags) } else { @($defaultTagMap[$bankKey]) }
      example = if ($candidate.example) { [string]$candidate.example } else { [string]$defaultExampleMap[$bankKey] }
      exampleZh = if ($candidate.exampleZh) { [string]$candidate.exampleZh } else { "" }
      synonyms = if ($candidate.synonyms) { @($candidate.synonyms) } else { @() }
      distractors = if ($candidate.distractors) { @($candidate.distractors) } else { @() }
      source = if ($candidate.source) { [string]$candidate.source } else { "candidate-import" }
      updatedAt = if ($candidate.updatedAt) { [string]$candidate.updatedAt } else { "2026-04-08" }
    }

    $index += 1
  }

  $outputFile = Join-Path $OutputPath ("{0}.json" -f $bankKey)
  $entries | ConvertTo-Json -Depth 6 | Set-Content -Path $outputFile -Encoding UTF8
  Write-Host ("Imported {0} candidate entries into {1}" -f $entries.Count, $outputFile)
}
