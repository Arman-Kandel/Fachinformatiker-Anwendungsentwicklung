[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$toolsRoot = Join-Path $repositoryRoot '.tools'
$downloadsRoot = Join-Path $toolsRoot 'downloads'
$registryUrl = 'https://registry.npmjs.org/'
$nodeHost = 'nodejs.org'
$registryHost = 'registry.npmjs.org'
$minimumNodeVersion = [version]'20.19.0'

function Assert-OfficialHttpsUrl {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$ExpectedHost
    )

    $parsedUrl = [Uri]$Url
    if (-not $parsedUrl.IsAbsoluteUri -or $parsedUrl.Scheme -ne 'https' -or $parsedUrl.Host -ne $ExpectedHost) {
        throw "Refusing unexpected dependency URL: $Url"
    }
}

function Get-NodeRuntime {
    $systemNode = Get-Command node.exe -ErrorAction SilentlyContinue
    $systemNpm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($systemNode -and $systemNpm) {
        $systemVersionText = (& $systemNode.Source --version).Trim() -replace '^v', ''
        $systemVersion = [version]$systemVersionText
        if ($systemVersion -ge $minimumNodeVersion) {
            return [pscustomobject]@{
                Node = $systemNode.Source
                Npm = $systemNpm.Source
                Version = $systemVersionText
            }
        }
    }

    if (-not [Environment]::Is64BitOperatingSystem) {
        throw 'The Windows bootstrap currently supports 64-bit Windows only.'
    }

    New-Item -ItemType Directory -Path $downloadsRoot -Force | Out-Null
    $indexUrl = "https://$nodeHost/dist/index.json"
    Assert-OfficialHttpsUrl -Url $indexUrl -ExpectedHost $nodeHost
    $indexResponse = Invoke-WebRequest -Uri $indexUrl -UseBasicParsing
    $releases = $indexResponse.Content | ConvertFrom-Json
    $release = $releases | Where-Object { $_.lts -ne $false } | Select-Object -First 1
    if (-not $release) {
        throw 'Could not find an official Node.js LTS release.'
    }

    $nodeVersion = [string]$release.version
    $nodeHome = Join-Path $toolsRoot "node-$nodeVersion"
    $localNode = Join-Path $nodeHome 'node.exe'
    $localNpm = Join-Path $nodeHome 'npm.cmd'
    if ((Test-Path -LiteralPath $localNode) -and (Test-Path -LiteralPath $localNpm)) {
        $localVersionText = (& $localNode --version).Trim() -replace '^v', ''
        if ([version]$localVersionText -ge $minimumNodeVersion) {
            return [pscustomobject]@{
                Node = $localNode
                Npm = $localNpm
                Version = $localVersionText
            }
        }
    }

    $archiveName = "node-$nodeVersion-win-x64.zip"
    $releaseUrl = "https://$nodeHost/dist/$nodeVersion"
    $archiveUrl = "$releaseUrl/$archiveName"
    $checksumsUrl = "$releaseUrl/SHASUMS256.txt"
    Assert-OfficialHttpsUrl -Url $archiveUrl -ExpectedHost $nodeHost
    Assert-OfficialHttpsUrl -Url $checksumsUrl -ExpectedHost $nodeHost

    $archivePath = Join-Path $downloadsRoot $archiveName
    $checksumsPath = Join-Path $downloadsRoot "SHASUMS256-$nodeVersion.txt"
    Invoke-WebRequest -Uri $archiveUrl -OutFile $archivePath -UseBasicParsing
    Invoke-WebRequest -Uri $checksumsUrl -OutFile $checksumsPath -UseBasicParsing

    $checksumLine = Get-Content -LiteralPath $checksumsPath | Where-Object {
        $_ -match ('^([A-Fa-f0-9]{64})\s+\*?' + [regex]::Escape($archiveName) + '$')
    } | Select-Object -First 1
    if (-not $checksumLine) {
        throw "Official checksum was not found for $archiveName."
    }

    $expectedHash = ([regex]::Match($checksumLine, '^[A-Fa-f0-9]{64}')).Value.ToUpperInvariant()
    $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($actualHash -ne $expectedHash) {
        Remove-Item -LiteralPath $archivePath -Force
        throw "Node.js archive checksum mismatch for $archiveName."
    }

    if (-not (Test-Path -LiteralPath (Join-Path $nodeHome 'node.exe'))) {
        $extractRoot = Join-Path $toolsRoot "extract-$nodeVersion-$PID"
        try {
            Expand-Archive -LiteralPath $archivePath -DestinationPath $extractRoot -Force
            $extractedNodeHome = Join-Path $extractRoot "node-$nodeVersion-win-x64"
            if (-not (Test-Path -LiteralPath (Join-Path $extractedNodeHome 'node.exe'))) {
                throw 'The verified Node.js archive did not contain the expected executable.'
            }
            Move-Item -LiteralPath $extractedNodeHome -Destination $nodeHome
        }
        finally {
            if (Test-Path -LiteralPath $extractRoot) {
                Remove-Item -LiteralPath $extractRoot -Recurse -Force
            }
        }
    }

    return [pscustomobject]@{
        Node = Join-Path $nodeHome 'node.exe'
        Npm = Join-Path $nodeHome 'npm.cmd'
        Version = $nodeVersion.TrimStart('v')
    }
}

$runtime = Get-NodeRuntime
if (-not (Test-Path -LiteralPath $runtime.Node) -or -not (Test-Path -LiteralPath $runtime.Npm)) {
    throw 'Node.js or its bundled npm executable is missing after setup.'
}

$packageManifest = Join-Path $repositoryRoot 'package.json'
$lockFile = Join-Path $repositoryRoot 'package-lock.json'
if (-not (Test-Path -LiteralPath $packageManifest) -or -not (Test-Path -LiteralPath $lockFile)) {
    throw 'package.json and package-lock.json are required. Commit both to keep dependency versions reproducible.'
}

$lockValidator = Join-Path $PSScriptRoot 'validate-lock.mjs'
& $runtime.Node $lockValidator $lockFile $registryHost
if ($LASTEXITCODE -ne 0) {
        throw 'The dependency lockfile contains an invalid or untrusted package URL.'
}

Write-Host "Using Node.js $($runtime.Version)"
Write-Host "Restoring locked dependencies from $registryUrl"
Push-Location $repositoryRoot
try {
    & $runtime.Npm ci --registry=$registryUrl --no-fund
    if ($LASTEXITCODE -ne 0) {
        throw "npm ci failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

Write-Host 'Windows development dependencies are ready.'
