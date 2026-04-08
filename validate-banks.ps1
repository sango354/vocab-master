param(
  [string]$DataPath = (Join-Path $PSScriptRoot "rich-banks"),
  [switch]$IncludeTemplates,
  [switch]$StrictRichSchema
)

$ErrorActionPreference = "Stop"

$allowedPos = @("n.", "v.", "adj.", "adv.")
$legacyFields = @("word", "phonetic", "mean", "pos")
$richFields = @(
  "id", "word", "displayWord", "phonetic", "mean", "pos",
  "level", "tags", "example", "exampleZh", "synonyms",
  "distractors", "source", "updatedAt"
)

$jsonFiles = Get-ChildItem -Path $DataPath -Recurse -Filter *.json -File
if ($IncludeTemplates) {
  $templateFiles = Get-ChildItem -Path (Join-Path $PSScriptRoot "data\\templates") -Recurse -Filter *.json -File
  $jsonFiles = @($jsonFiles) + @($templateFiles)
}

$errors = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$globalWordMap = @{}

foreach ($file in $jsonFiles) {
  try {
    $content = Get-Content -Raw -Path $file.FullName | ConvertFrom-Json
  } catch {
    $errors.Add("ERROR $($file.Name): invalid JSON format")
    continue
  }

  if ($null -eq $content) {
    $errors.Add("ERROR $($file.Name): file is empty")
    continue
  }

  $entries = @($content)
  $seenWords = @{}
  $seenIds = @{}

  for ($index = 0; $index -lt $entries.Count; $index++) {
    $entry = $entries[$index]
    $itemNo = $index + 1
    $fieldSet = if ($StrictRichSchema -or ($entry.PSObject.Properties.Name -contains "id")) { $richFields } else { $legacyFields }

    foreach ($field in $fieldSet) {
      if (-not ($entry.PSObject.Properties.Name -contains $field)) {
        $errors.Add("ERROR $($file.Name)#$itemNo missing field: $field")
      }
    }

    if (($fieldSet -contains "id") -and [string]::IsNullOrWhiteSpace($entry.id)) {
      $errors.Add("ERROR $($file.Name)#$itemNo missing id value")
    } elseif (($fieldSet -contains "id") -and $seenIds.ContainsKey($entry.id)) {
      $errors.Add("ERROR $($file.Name)#$itemNo duplicate id: $($entry.id)")
    } elseif ($fieldSet -contains "id") {
      $seenIds[$entry.id] = $true
    }

    if ([string]::IsNullOrWhiteSpace($entry.word)) {
      $errors.Add("ERROR $($file.Name)#$itemNo missing word")
    } else {
      $normalizedWord = $entry.word.Trim().ToLowerInvariant()
      if ($seenWords.ContainsKey($normalizedWord)) {
        $errors.Add("ERROR $($file.Name)#$itemNo duplicate word in bank: $($entry.word)")
      } else {
        $seenWords[$normalizedWord] = $true
      }

      if ($globalWordMap.ContainsKey($normalizedWord)) {
        $warnings.Add("WARN duplicate word across banks: $($entry.word) ($($file.Name) and $($globalWordMap[$normalizedWord]))")
      } else {
        $globalWordMap[$normalizedWord] = $file.Name
      }
    }

    if ([string]::IsNullOrWhiteSpace($entry.mean)) {
      $errors.Add("ERROR $($file.Name)#$itemNo missing mean")
    }

    if ($allowedPos -notcontains $entry.pos) {
      $errors.Add("ERROR $($file.Name)#$itemNo invalid pos: $($entry.pos)")
    }

    if ($fieldSet -contains "tags") {
      if ($entry.tags -isnot [System.Collections.IEnumerable] -or $entry.tags -is [string]) {
        $errors.Add("ERROR $($file.Name)#$itemNo tags must be an array")
      }
    } else {
      $warnings.Add("WARN $($file.Name)#$itemNo using legacy bank format; rich fields are recommended for large banks")
    }

    if (($fieldSet -contains "synonyms") -and ($entry.synonyms -isnot [System.Collections.IEnumerable] -or $entry.synonyms -is [string])) {
      $errors.Add("ERROR $($file.Name)#$itemNo synonyms must be an array")
    }

    if ($fieldSet -contains "distractors") {
      if ($entry.distractors -isnot [System.Collections.IEnumerable] -or $entry.distractors -is [string]) {
        $errors.Add("ERROR $($file.Name)#$itemNo distractors must be an array")
      } elseif ($entry.distractors -contains $entry.mean) {
        $warnings.Add("WARN $($file.Name)#$itemNo distractors contains the correct meaning")
      }
    }

    if (($fieldSet -contains "id") -and $entry.id -and $entry.id -notmatch '^[a-z0-9]+-[0-9]{4}$') {
      $warnings.Add("WARN $($file.Name)#$itemNo id does not match expected pattern: $($entry.id)")
    }

    if (($fieldSet -contains "updatedAt") -and $entry.updatedAt -and $entry.updatedAt -notmatch '^\d{4}-\d{2}-\d{2}$') {
      $warnings.Add("WARN $($file.Name)#$itemNo updatedAt should use YYYY-MM-DD: $($entry.updatedAt)")
    }
  }
}

foreach ($warning in $warnings) {
  Write-Host $warning -ForegroundColor Yellow
}

foreach ($validationError in $errors) {
  Write-Host $validationError -ForegroundColor Red
}

if ($errors.Count -gt 0) {
  Write-Host ("Validation failed with {0} error(s) and {1} warning(s)." -f $errors.Count, $warnings.Count) -ForegroundColor Red
  exit 1
}

Write-Host ("Validation passed with {0} warning(s)." -f $warnings.Count) -ForegroundColor Green
