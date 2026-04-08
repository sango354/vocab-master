param(
  [string]$OutputPath = (Join-Path $PSScriptRoot "mean-zh.js"),
  [int]$RetryMax = 8,
  [int]$DelayMs = 250
)

$ErrorActionPreference = "Stop"

function Convert-ToJsAsciiString {
  param([string]$Value)
  $sb = New-Object System.Text.StringBuilder
  foreach ($char in $Value.ToCharArray()) {
    $code = [int][char]$char
    switch ($char) {
      '"' { [void]$sb.Append('\"') }
      '\' { [void]$sb.Append('\\') }
      "`n" { [void]$sb.Append('\n') }
      "`r" { [void]$sb.Append('\r') }
      "`t" { [void]$sb.Append('\t') }
      default {
        if ($code -lt 32 -or $code -gt 126) {
          [void]$sb.AppendFormat('\u{0:x4}', $code)
        } else {
          [void]$sb.Append($char)
        }
      }
    }
  }
  $sb.ToString()
}

function Convert-FromJsEscapes {
  param([string]$Value)
  if ($null -eq $Value) { return "" }
  $text = $Value
  $text = [regex]::Replace($text, '\\u([0-9a-fA-F]{4})', {
    param($m)
    [char][Convert]::ToInt32($m.Groups[1].Value, 16)
  })
  $text = $text.Replace('\"', '"').Replace('\\', '\').Replace('\n', "`n").Replace('\r', "`r").Replace('\t', "`t")
  return $text
}

function Load-ExistingMap {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path $Path)) {
    return $map
  }

  $content = Get-Content -Raw -Path $Path
  $matches = [regex]::Matches($content, '"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"')
  foreach ($m in $matches) {
    $key = Convert-FromJsEscapes $m.Groups[1].Value
    $value = Convert-FromJsEscapes $m.Groups[2].Value
    if ($key -and $value) {
      $map[$key] = $value
    }
  }
  return $map
}

function Get-UniqueMeans {
  param([string[]]$SourceFiles)
  $means = @()
  foreach ($file in $SourceFiles) {
    $lines = Get-Content -Path $file | Where-Object { $_.Trim() -and -not $_.Trim().StartsWith("#") }
    foreach ($line in $lines) {
      $parts = $line.Split("|")
      if ($parts.Count -ge 3) {
        $means += $parts[2].Trim()
      }
    }
  }
  return $means | Sort-Object -Unique
}

function Translate-Mean {
  param(
    [string]$Text,
    [int]$RetryMax,
    [int]$DelayMs
  )

  $uri = "http://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=$([uri]::EscapeDataString($Text))"

  for ($attempt = 1; $attempt -le $RetryMax; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -TimeoutSec 20
      $payload = $response.Content | ConvertFrom-Json
      $translated = ($payload[0] | ForEach-Object { $_[0] }) -join ""
      if (-not [string]::IsNullOrWhiteSpace($translated)) {
        return $translated.Trim()
      }
    } catch {
      if ($attempt -eq $RetryMax) {
        throw
      }
      Start-Sleep -Milliseconds ($DelayMs * $attempt)
    }
    Start-Sleep -Milliseconds $DelayMs
  }

  return $Text
}

$sources = @(
  (Join-Path $PSScriptRoot "release-sources\\toeic.txt"),
  (Join-Path $PSScriptRoot "release-sources\\school7000.txt"),
  (Join-Path $PSScriptRoot "release-sources\\dailyLife.txt")
)

$means = Get-UniqueMeans -SourceFiles $sources
$existingMap = Load-ExistingMap -Path $OutputPath
$resultMap = @{}
$failed = New-Object System.Collections.Generic.List[string]

for ($i = 0; $i -lt $means.Count; $i++) {
  $mean = $means[$i]
  if ($existingMap.ContainsKey($mean) -and -not [string]::IsNullOrWhiteSpace($existingMap[$mean]) -and $existingMap[$mean] -ne $mean) {
    $resultMap[$mean] = $existingMap[$mean]
    continue
  }

  try {
    $translated = Translate-Mean -Text $mean -RetryMax $RetryMax -DelayMs $DelayMs
    $resultMap[$mean] = $translated
  } catch {
    $failed.Add($mean)
    $resultMap[$mean] = $mean
  }

  if ((($i + 1) % 25) -eq 0) {
    Write-Host ("Progress: {0}/{1}" -f ($i + 1), $means.Count)
  }
}

$lines = @("const meanZhMap = {")
for ($idx = 0; $idx -lt $means.Count; $idx++) {
  $key = $means[$idx]
  $value = $resultMap[$key]
  $keyEscaped = Convert-ToJsAsciiString -Value $key
  $valueEscaped = Convert-ToJsAsciiString -Value $value
  $suffix = if ($idx -lt $means.Count - 1) { "," } else { "" }
  $lines += ('  "{0}": "{1}"{2}' -f $keyEscaped, $valueEscaped, $suffix)
}
$lines += "};"

Set-Content -Path $OutputPath -Value $lines -Encoding UTF8

Write-Host ("Generated: {0}" -f $OutputPath)
Write-Host ("Total means: {0}" -f $means.Count)
Write-Host ("Failed translations: {0}" -f $failed.Count)
if ($failed.Count -gt 0) {
  Write-Host "Failed items:"
  $failed | ForEach-Object { Write-Host ("- {0}" -f $_) }
}
