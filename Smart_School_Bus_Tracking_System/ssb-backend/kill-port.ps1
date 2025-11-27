# Kill process on port 4000 before starting dev server
$port = 4000
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process -and $process -ne 0) {
    Write-Host "Killing process $process on port $port..."
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "Process killed. Starting dev server..."
} else {
    Write-Host "Port $port is free. Starting dev server..."
}

# Start dev server
npm run dev
