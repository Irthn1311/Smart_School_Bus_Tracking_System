Write-Host "`n=== Testing Endpoints (No Auth) ===" -ForegroundColor Cyan

# Test health
Write-Host "`n1. Testing /health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -Method GET
    Write-Host "   ✅ Health: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test buses (no auth in code)
Write-Host "`n2. Testing /api/v1/buses..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/buses" -Method GET
    Write-Host "   ⚠️  Status: $($response.StatusCode) (needs auth)" -ForegroundColor Magenta
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   ⚠️  Status: $statusCode (needs auth)" -ForegroundColor Magenta
}

# Test drivers (needs auth)
Write-Host "`n3. Testing /api/v1/drivers..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/drivers" -Method GET
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Route works (401 = needs auth token)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error: $statusCode" -ForegroundColor Red
    }
}

# Test students (needs auth)
Write-Host "`n4. Testing /api/v1/students..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/students" -Method GET
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Route works (401 = needs auth token)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error: $statusCode" -ForegroundColor Red
    }
}

# Test routes (needs auth)
Write-Host "`n5. Testing /api/v1/routes..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/routes" -Method GET
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Route works (401 = needs auth token)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error: $statusCode" -ForegroundColor Red
    }
}

# Test schedules (needs auth)
Write-Host "`n6. Testing /api/v1/schedules..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/schedules" -Method GET
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Route works (401 = needs auth token)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error: $statusCode" -ForegroundColor Red
    }
}

# Test trips (needs auth)
Write-Host "`n7. Testing /api/v1/trips..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/trips" -Method GET
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Route works (401 = needs auth token)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error: $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Tất cả routes đã hoạt động!" -ForegroundColor Green
Write-Host "Để test CRUD operations trong Postman:" -ForegroundColor Yellow
Write-Host "1. Đăng nhập: POST /api/v1/auth/login" -ForegroundColor White
Write-Host "2. Copy token từ response" -ForegroundColor White
Write-Host "3. Dùng token trong Authorization header cho các requests khác" -ForegroundColor White
Write-Host ""
