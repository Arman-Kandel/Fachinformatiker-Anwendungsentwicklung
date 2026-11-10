[CmdletBinding()]
param(
    [string[]]$Query = @(),

    [string[]]$CandidateUrl = @(),

    [string[]]$AllowedDomain = @(),

    [ValidateRange(1, 20)]
    [int]$MaxResultsPerQuery = 8,

    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$reviewRoot = Join-Path $repositoryRoot 'sources/url-review'
$searchHost = 'html.duckduckgo.com'
$searchBaseUrl = "https://$searchHost/html/"
$userAgent = 'IHK-Lernplattform-SourceResearch/1.0 (manual-review-required)'

if ($Query.Count -eq 0 -and $CandidateUrl.Count -eq 0) {
    throw 'Provide at least one -Query or -CandidateUrl value.'
}

function Test-AllowedDomain {
    param([Parameter(Mandatory = $true)][string]$HostName)

    if ($AllowedDomain.Count -eq 0) {
        return $true
    }

    foreach ($domain in $AllowedDomain) {
        $normalizedDomain = $domain.Trim().TrimStart('.').ToLowerInvariant()
        $normalizedHost = $HostName.ToLowerInvariant()
        if ($normalizedHost -eq $normalizedDomain -or $normalizedHost.EndsWith(".$normalizedDomain")) {
            return $true
        }
    }

    return $false
}

function ConvertTo-CandidateUrl {
    param([Parameter(Mandatory = $true)][string]$Href)

    $decodedHref = [System.Net.WebUtility]::HtmlDecode($Href)
    $candidateUri = [Uri]::new([Uri]$searchBaseUrl, $decodedHref)
    $isSearchRedirect = $candidateUri.Host -in @($searchHost, 'duckduckgo.com', 'www.duckduckgo.com')
    if ($isSearchRedirect -and $candidateUri.AbsolutePath -eq '/l/') {
        $redirectMatch = [regex]::Match($candidateUri.Query, '(?:^|[?&])uddg=([^&]+)')
        if (-not $redirectMatch.Success) {
            return $null
        }

        $destination = $redirectMatch.Groups[1].Value.Replace('+', '%20')
        $decodedDestination = [Uri]::UnescapeDataString($destination)
        $candidateUri = [Uri]$decodedDestination
    }

    if (-not $candidateUri.IsAbsoluteUri -or $candidateUri.Scheme -ne 'https' -or $candidateUri.Host -in @($searchHost, 'duckduckgo.com', 'www.duckduckgo.com')) {
        return $null
    }

    $builder = [UriBuilder]$candidateUri
    $builder.Fragment = ''
    return $builder.Uri.AbsoluteUri
}

function Get-SearchResults {
    param(
        [Parameter(Mandatory = $true)][string]$SearchQuery,
        [Parameter(Mandatory = $true)][int]$Limit
    )

    $requestUrl = $searchBaseUrl + '?q=' + [Uri]::EscapeDataString($SearchQuery)
    $response = Invoke-WebRequest -Uri $requestUrl -Method Get -UseBasicParsing -TimeoutSec 25 -Headers @{ 'User-Agent' = $userAgent }
    $anchorPattern = '(?is)<a\b(?=[^>]*class=(?:"[^"]*\bresult__a\b[^"]*"|''[^'']*\bresult__a\b[^'']*''))([^>]*)>(.*?)</a>'
    $hrefPattern = '(?is)\bhref=(?:"([^"]+)"|''([^'']+)'')'
    $candidates = @()

    foreach ($match in [regex]::Matches($response.Content, $anchorPattern)) {
        $hrefMatch = [regex]::Match($match.Groups[1].Value, $hrefPattern)
        if (-not $hrefMatch.Success) {
            continue
        }

        $href = if ($hrefMatch.Groups[1].Success) { $hrefMatch.Groups[1].Value } else { $hrefMatch.Groups[2].Value }
        $url = ConvertTo-CandidateUrl -Href $href
        if (-not $url) {
            continue
        }

        $title = [System.Net.WebUtility]::HtmlDecode(([regex]::Replace($match.Groups[2].Value, '<[^>]+>', '')).Trim())
        $candidates += [pscustomobject]@{
            Query = $SearchQuery
            Title = $title
            Url = $url
        }

        if ($candidates.Count -ge $Limit) {
            break
        }
    }

    return $candidates
}

function Test-UrlAvailability {
    param([Parameter(Mandatory = $true)][string]$Url)

    $request = [System.Net.HttpWebRequest]::Create($Url)
    $request.Method = 'HEAD'
    $request.AllowAutoRedirect = $true
    $request.MaximumAutomaticRedirections = 8
    $request.Timeout = 20000
    $request.ReadWriteTimeout = 20000
    $request.UserAgent = $userAgent

    try {
        try {
            $response = [System.Net.HttpWebResponse]$request.GetResponse()
        }
        catch [System.Net.WebException] {
            $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
            if ($statusCode -notin @(403, 405, 501)) {
                throw
            }

            if ($_.Exception.Response) {
                $_.Exception.Response.Close()
            }

            $request = [System.Net.HttpWebRequest]::Create($Url)
            $request.Method = 'GET'
            $request.AllowAutoRedirect = $true
            $request.MaximumAutomaticRedirections = 8
            $request.Timeout = 20000
            $request.ReadWriteTimeout = 20000
            $request.UserAgent = $userAgent
            $response = [System.Net.HttpWebResponse]$request.GetResponse()
        }

        try {
            $finalUrl = $response.ResponseUri.AbsoluteUri
            $finalHostAllowed = Test-AllowedDomain -HostName $response.ResponseUri.Host
            $isValid = $response.StatusCode -ge 200 -and $response.StatusCode -lt 400 -and $response.ResponseUri.Scheme -eq 'https' -and $finalHostAllowed
            return [pscustomobject]@{
                Status = [int]$response.StatusCode
                FinalUrl = $finalUrl
                Valid = $isValid
                Note = if (-not $finalHostAllowed) { 'Redirect left the allowed domain list.' } else { '' }
            }
        }
        finally {
            $response.Close()
        }
    }
    catch {
        $statusCode = 0
        $finalUrl = $Url
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            if ($_.Exception.Response.ResponseUri) {
                $finalUrl = $_.Exception.Response.ResponseUri.AbsoluteUri
            }
            $_.Exception.Response.Close()
        }

        return [pscustomobject]@{
            Status = $statusCode
            FinalUrl = $finalUrl
            Valid = $false
            Note = ($_.Exception.Message -replace '[\r\n]+', ' ').Trim()
        }
    }
}

if (-not $OutputPath) {
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $OutputPath = Join-Path $reviewRoot "source-url-review-$timestamp.md"
}
elseif (-not [IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath = Join-Path $repositoryRoot $OutputPath
}

$reviewDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Path $reviewDirectory -Force | Out-Null

$report = [System.Collections.Generic.List[string]]::new()
$report.Add('# Source URL Candidate Review')
$report.Add('')
$report.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
$report.Add('')
$report.Add('This report contains unapproved candidates only. It does not update `sources/reference-index.md` or authorize use in learning content.')
$report.Add('')
$report.Add('Review each result for publisher authority, document relevance, publication/version date, and whether the page actually supports the intended claim. A successful HTTP response alone does not establish source quality.')
$report.Add('')

$seenUrls = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$candidateCount = 0
foreach ($searchQuery in $Query) {
    $report.Add("## Search: $searchQuery")
    $report.Add('')

    try {
        $searchCandidates = @(Get-SearchResults -SearchQuery $searchQuery -Limit $MaxResultsPerQuery)
        if ($searchCandidates.Count -eq 0) {
            $report.Add('No candidate URLs were parsed. The search provider may have changed its page format or blocked this request.')
            $report.Add('')
            continue
        }

        foreach ($candidate in $searchCandidates) {
            if (-not $seenUrls.Add($candidate.Url)) {
                continue
            }

            $candidateCount++
            $domainAllowed = Test-AllowedDomain -HostName ([Uri]$candidate.Url).Host
            $check = if ($domainAllowed) {
                Test-UrlAvailability -Url $candidate.Url
            }
            else {
                [pscustomobject]@{
                    Status = 0
                    FinalUrl = $candidate.Url
                    Valid = $false
                    Note = 'Candidate host is outside the allowed domain list.'
                }
            }

            $reviewStatus = if ($check.Valid) { 'Reachable; requires human review' } else { 'Check failed; do not use' }
            $report.Add("### $candidateCount. $($candidate.Title)")
            $report.Add('')
            $report.Add("- Search query: $searchQuery")
            $report.Add("- Candidate URL: <$($candidate.Url)>")
            $report.Add("- HTTP status: $($check.Status)")
            $report.Add("- Final URL: <$($check.FinalUrl)>")
            $report.Add("- Result: $reviewStatus")
            if ($check.Note) {
                $report.Add("- Note: $($check.Note)")
            }
            $report.Add('- Human decision: [ ] approve  [ ] reject')
            $report.Add('- Source ID / intended claim: _fill in after review_')
            $report.Add('')
        }
    }
    catch {
        $message = ($_.Exception.Message -replace '[\r\n]+', ' ').Trim()
        $report.Add("Search failed: $message")
        $report.Add('')
    }
}

if ($CandidateUrl.Count -gt 0) {
    $report.Add('## Manually supplied candidates')
    $report.Add('')

    foreach ($rawUrl in $CandidateUrl) {
        try {
            $candidateUri = [Uri]$rawUrl
            if (-not $candidateUri.IsAbsoluteUri -or $candidateUri.Scheme -ne 'https' -or $candidateUri.UserInfo) {
                throw 'Candidate must be an absolute HTTPS URL without embedded credentials.'
            }

            $builder = [UriBuilder]$candidateUri
            $builder.Fragment = ''
            $url = $builder.Uri.AbsoluteUri
            if (-not $seenUrls.Add($url)) {
                continue
            }

            $candidateCount++
            $domainAllowed = Test-AllowedDomain -HostName ([Uri]$url).Host
            $check = if ($domainAllowed) {
                Test-UrlAvailability -Url $url
            }
            else {
                [pscustomobject]@{
                    Status = 0
                    FinalUrl = $url
                    Valid = $false
                    Note = 'Candidate host is outside the allowed domain list.'
                }
            }

            $reviewStatus = if ($check.Valid) { 'Reachable; requires human review' } else { 'Check failed; do not use' }
            $report.Add("### $candidateCount. Manually supplied candidate")
            $report.Add('')
            $report.Add("- Candidate URL: <$url>")
            $report.Add("- HTTP status: $($check.Status)")
            $report.Add("- Final URL: <$($check.FinalUrl)>")
            $report.Add("- Result: $reviewStatus")
            if ($check.Note) {
                $report.Add("- Note: $($check.Note)")
            }
            $report.Add('- Human decision: [ ] approve  [ ] reject')
            $report.Add('- Source ID / intended claim: _fill in after review_')
            $report.Add('')
        }
        catch {
            $candidateCount++
            $message = ($_.Exception.Message -replace '[\r\n]+', ' ').Trim()
            $report.Add("### $candidateCount. Invalid candidate input")
            $report.Add('')
            $report.Add("- Provided value: $rawUrl")
            $report.Add('- Result: Check failed; do not use')
            $report.Add("- Note: $message")
            $report.Add('- Human decision: [ ] reject')
            $report.Add('')
        }
    }
}

if ($candidateCount -eq 0) {
    $report.Add('No candidate URLs passed extraction. Check network access or retry with a narrower query.')
    $report.Add('')
}

$report | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Host "Review report written to: $OutputPath"
Write-Host "Candidate URLs checked: $candidateCount"
Write-Host 'No source index or learning content was modified.'
