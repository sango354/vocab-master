param(
  [string]$SourcePath = (Join-Path $PSScriptRoot "banks"),
  [string]$OutputPath = (Join-Path $PSScriptRoot "rich-banks-generated"),
  [string]$TranslationsPath = ""
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null

$tagMap = @{
  toeic = @("business")
  school7000 = @("academic")
  dailyLife = @("daily-life")
}

$exampleMap = @{
  toeic = "This word often appears in business communication."
  school7000 = "This word often appears in academic reading passages."
  dailyLife = "This word often appears in daily conversations."
}

$files = Get-ChildItem -Path $SourcePath -Filter *.json -File
$translationMap = @{}

if ($TranslationsPath -and (Test-Path $TranslationsPath)) {
  $translationRows = Get-Content -Raw -Path $TranslationsPath | ConvertFrom-Json
  foreach ($row in $translationRows) {
    if ($row.id) {
      $translationMap[$row.id] = $row
    }
  }
}

foreach ($file in $files) {
  $bankKey = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
  $defaultTags = if ($tagMap.ContainsKey($bankKey)) { $tagMap[$bankKey] } else { @("general") }
  $defaultExample = if ($exampleMap.ContainsKey($bankKey)) { $exampleMap[$bankKey] } else { "This word appears in common English usage." }

  $entries = Get-Content -Raw -Path $file.FullName | ConvertFrom-Json
  $converted = @()

  for ($i = 0; $i -lt $entries.Count; $i++) {
    $entry = $entries[$i]
    $id = "{0}-{1}" -f $bankKey.ToLowerInvariant(), ($i + 1).ToString("0000")
    $normalizedWord = [string]$entry.word
    $displayWord = $normalizedWord

    $converted += [ordered]@{
      id = $id
      word = $normalizedWord.ToLowerInvariant()
      displayWord = $displayWord
      phonetic = [string]$entry.phonetic
      mean = [string]$entry.mean
      pos = if ($entry.pos) { [string]$entry.pos } else { "n." }
      level = "core"
      tags = @($defaultTags)
      example = $defaultExample
      exampleZh = if ($translationMap.ContainsKey($id)) { [string]$translationMap[$id].exampleZh } else { "" }
      synonyms = @()
      distractors = @()
      source = "legacy-conversion"
      updatedAt = "2026-04-08"
    }
  }

  $outputFile = Join-Path $OutputPath $file.Name
  $converted | ConvertTo-Json -Depth 5 | Set-Content -Path $outputFile -Encoding UTF8
  Write-Host ("Converted {0} -> {1}" -f $file.Name, $outputFile)
}
