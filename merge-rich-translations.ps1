param(
  [string]$SourcePath = (Join-Path $PSScriptRoot "rich-banks"),
  [string]$TranslationsPath,
  [string]$OutputPath = (Join-Path $PSScriptRoot "rich-banks-merged")
)

$ErrorActionPreference = "Stop"

if (-not $TranslationsPath) {
  throw "TranslationsPath is required."
}

if (-not (Test-Path $TranslationsPath)) {
  throw "Translations file not found: $TranslationsPath"
}

New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null

$translationRows = Get-Content -Raw -Path $TranslationsPath | ConvertFrom-Json
$translationMap = @{}

foreach ($row in $translationRows) {
  if ($row.id) {
    $translationMap[[string]$row.id] = $row
  }
}

$sourceFiles = Get-ChildItem -Path $SourcePath -Filter *.json -File

foreach ($file in $sourceFiles) {
  $entries = Get-Content -Raw -Path $file.FullName | ConvertFrom-Json
  $mergedEntries = @()

  foreach ($entry in $entries) {
    $id = [string]$entry.id
    $translation = $null

    if ($translationMap.ContainsKey($id)) {
      $translation = $translationMap[$id]
    }

    $mergedEntries += [ordered]@{
      id = [string]$entry.id
      word = [string]$entry.word
      displayWord = [string]$entry.displayWord
      phonetic = [string]$entry.phonetic
      mean = [string]$entry.mean
      pos = [string]$entry.pos
      level = [string]$entry.level
      tags = @($entry.tags)
      example = [string]$entry.example
      exampleZh = if ($translation -and $translation.exampleZh) { [string]$translation.exampleZh } else { [string]$entry.exampleZh }
      synonyms = @($entry.synonyms)
      distractors = @($entry.distractors)
      source = [string]$entry.source
      updatedAt = if ($translation -and $translation.updatedAt) { [string]$translation.updatedAt } else { [string]$entry.updatedAt }
    }
  }

  $outputFile = Join-Path $OutputPath $file.Name
  $mergedEntries | ConvertTo-Json -Depth 6 | Set-Content -Path $outputFile -Encoding UTF8
  Write-Host ("Merged translations into {0}" -f $outputFile)
}
