param(
  [string]$SourcePath = (Join-Path $PSScriptRoot "release-sources"),
  [string]$OutputPath = (Join-Path $PSScriptRoot "rich-banks-release"),
  [int]$ExpectedCount = 200
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null

$validBanks = @("toeic", "school7000", "dailyLife")
$validPos = @("n.", "v.", "adj.", "adv.")

$tagDefaults = @{
  toeic = @("business")
  school7000 = @("academic")
  dailyLife = @("daily-life")
}

function Get-DefaultExample {
  param(
    [string]$BankKey,
    [string]$Word,
    [string]$Pos,
    [string]$Mean
  )

  switch ($BankKey) {
    "toeic" {
      switch ($Pos) {
        "v." { return "Our team needs to $Word the plan this week." }
        "adj." { return "The manager described the result as $Word during the meeting." }
        "adv." { return "The proposal was reviewed $Word before approval." }
        default { return "The meeting focused on the $Word in today's discussion." }
      }
    }
    "school7000" {
      switch ($Pos) {
        "v." { return "Students should $Word the passage carefully." }
        "adj." { return "The reading passage presents a $Word idea." }
        "adv." { return "The author explains the point $Word in the essay." }
        default { return "The article explains the $Word in detail." }
      }
    }
    default {
      switch ($Pos) {
        "v." { return "We often $Word this during daily life." }
        "adj." { return "The place felt $Word and easy to use." }
        "adv." { return "She handled the situation $Word at home." }
        default { return "I dealt with the $Word this morning." }
      }
    }
  }
}

foreach ($bankKey in $validBanks) {
  $sourceFile = Join-Path $SourcePath ("{0}.txt" -f $bankKey)
  if (-not (Test-Path $sourceFile)) {
    throw "Missing source file: $sourceFile"
  }

  $rawLines = Get-Content -Path $sourceFile
  $dataLines = $rawLines | Where-Object { $_.Trim() -and -not $_.Trim().StartsWith("#") }

  if ($dataLines.Count -ne $ExpectedCount) {
    throw "Expected $ExpectedCount entries in $sourceFile but found $($dataLines.Count)"
  }

  $entries = @()
  $lineIndex = 1

  foreach ($line in $dataLines) {
    $parts = $line.Split("|")
    if ($parts.Count -lt 3) {
      throw "Invalid line format in ${sourceFile}: $line"
    }

    $word = $parts[0].Trim()
    $pos = $parts[1].Trim()
    $mean = $parts[2].Trim()
    $tagString = if ($parts.Count -ge 4) { $parts[3].Trim() } else { "" }
    $tags = if ($tagString) { $tagString.Split(",") | ForEach-Object { $_.Trim() } } else { $tagDefaults[$bankKey] }

    if ($validPos -notcontains $pos) {
      throw "Invalid pos '$pos' for word '$word' in $sourceFile"
    }

    $entries += [ordered]@{
      id = "{0}-{1}" -f $bankKey.ToLowerInvariant(), $lineIndex.ToString("0000")
      word = $word.ToLowerInvariant()
      displayWord = $word
      phonetic = "/$($word.ToLowerInvariant())/"
      mean = $mean
      pos = $pos
      level = "core"
      tags = @($tags)
      example = Get-DefaultExample -BankKey $bankKey -Word $word.ToLowerInvariant() -Pos $pos -Mean $mean
      exampleZh = ""
      synonyms = @()
      distractors = @()
      source = "release-build"
      updatedAt = "2026-04-08"
    }

    $lineIndex += 1
  }

  $outputFile = Join-Path $OutputPath ("{0}.json" -f $bankKey)
  $entries | ConvertTo-Json -Depth 6 | Set-Content -Path $outputFile -Encoding UTF8
  Write-Host ("Built {0} with {1} entries" -f $outputFile, $entries.Count)
}
