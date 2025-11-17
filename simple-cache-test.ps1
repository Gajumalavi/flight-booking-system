Write-Host "Testing caching for flight search..." -ForegroundColor Cyan

# First request - should be a cache miss
Write-Host "First request (should be a cache miss):" -ForegroundColor Yellow
$time1 = Measure-Command {
    Invoke-RestMethod -Uri "http://localhost:8080/api/flights/search?origin=JFK&destination=LAX&departureDate=2025-04-25" -Method Get
}
Write-Host "Request took: $($time1.TotalMilliseconds) ms" -ForegroundColor Magenta

# Wait a second
Start-Sleep -Seconds 1

# Second request - should be a cache hit
Write-Host "Second request (should be a cache hit):" -ForegroundColor Green
$time2 = Measure-Command {
    Invoke-RestMethod -Uri "http://localhost:8080/api/flights/search?origin=JFK&destination=LAX&departureDate=2025-04-25" -Method Get
}
Write-Host "Request took: $($time2.TotalMilliseconds) ms" -ForegroundColor Cyan

# Performance improvement
$improvement = (($time1.TotalMilliseconds - $time2.TotalMilliseconds) / $time1.TotalMilliseconds) * 100
Write-Host "Performance improvement: $([Math]::Round($improvement, 2))%" -ForegroundColor Green