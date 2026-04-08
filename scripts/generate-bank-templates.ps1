param(
  [int]$Count = 1000
)

$ErrorActionPreference = "Stop"

$templateRoot = Join-Path $PSScriptRoot "..\\data\\templates"
$outputRoot = Join-Path $templateRoot "generated"

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$banks = @(
  @{
    Key = "toeic"
    Label = "business"
    Example = "We need to implement the new policy next month."
    ExampleZh = "我們需要在下個月實施新政策。"
  },
  @{
    Key = "school7000"
    Label = "academic"
    Example = "The passage conveys a clear message about teamwork."
    ExampleZh = "這段文章清楚傳達了關於團隊合作的訊息。"
  },
  @{
    Key = "dailyLife"
    Label = "daily-life"
    Example = "Please keep the receipt in case you need a refund."
    ExampleZh = "請保留收據，以防你需要退款。"
  }
)

foreach ($bank in $banks) {
  $entries = for ($i = 1; $i -le $Count; $i++) {
    $id = "{0}-{1}" -f $bank.Key, $i.ToString("0000")
    [ordered]@{
      id = $id
      word = ""
      displayWord = ""
      phonetic = ""
      mean = ""
      pos = "n."
      level = "core"
      tags = @($bank.Label)
      example = $bank.Example
      exampleZh = $bank.ExampleZh
      synonyms = @()
      distractors = @()
      source = "template"
      updatedAt = "2026-04-08"
    }
  }

  $outputPath = Join-Path $outputRoot ("{0}.template.json" -f $bank.Key)
  $entries | ConvertTo-Json -Depth 5 | Set-Content -Path $outputPath -Encoding UTF8
  Write-Host ("Generated {0}" -f $outputPath)
}
