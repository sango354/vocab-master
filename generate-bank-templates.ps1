param(
  [int]$Count = 1000
)

$ErrorActionPreference = "Stop"

$outputRoot = Join-Path $PSScriptRoot "data\\templates\\generated"
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$bankKeys = @("toeic", "school7000", "dailyLife")

foreach ($bankKey in $bankKeys) {
  $tag = switch ($bankKey) {
    "toeic" { "business" }
    "school7000" { "academic" }
    default { "daily-life" }
  }

  $example = switch ($bankKey) {
    "toeic" { "We need to implement the new policy next month." }
    "school7000" { "The passage conveys a clear message about teamwork." }
    default { "Please keep the receipt in case you need a refund." }
  }

  $exampleZh = switch ($bankKey) {
    "toeic" { "" }
    "school7000" { "" }
    default { "" }
  }

  $entries = @()
  for ($i = 1; $i -le $Count; $i++) {
    $entries += [ordered]@{
      id = ("{0}-{1}" -f $bankKey, $i.ToString("0000"))
      word = ""
      displayWord = ""
      phonetic = ""
      mean = ""
      pos = "n."
      level = "core"
      tags = @($tag)
      example = $example
      exampleZh = $exampleZh
      synonyms = @()
      distractors = @()
      source = "template"
      updatedAt = "2026-04-08"
    }
  }

  $outputPath = Join-Path $outputRoot ("{0}.template.json" -f $bankKey)
  $entries | ConvertTo-Json -Depth 5 | Set-Content -Path $outputPath -Encoding UTF8
  Write-Host ("Generated {0}" -f $outputPath)
}
