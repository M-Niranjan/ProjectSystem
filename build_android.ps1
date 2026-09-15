# ==============================================================================
# Project System - Android APK Build & Packaging Script
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  PROJECT SYSTEM - ANDROID MOBILE APK BUILD & SYNC       " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$FrontendDir = Join-Path $CurrentDir "frontend"
$AndroidDir = Join-Path $FrontendDir "android"
$ApkOutputDir = Join-Path $CurrentDir "apk"
$TargetApk = Join-Path $ApkOutputDir "ProjectSystem-debug.apk"

# 1. Setup Android SDK Environment
$AndroidSdk = "C:\Android\sdk"
if (Test-Path $AndroidSdk) {
    $env:ANDROID_HOME = $AndroidSdk
    $env:ANDROID_SDK_ROOT = $AndroidSdk
    Write-Host "[1/5] Using Android SDK at: $AndroidSdk" -ForegroundColor Green
} else {
    Write-Host "[!] Warning: Android SDK directory not found at $AndroidSdk" -ForegroundColor Yellow
}

# Ensure local.properties exists in android folder
$LocalPropsFile = Join-Path $AndroidDir "local.properties"
if (!(Test-Path $LocalPropsFile)) {
    Set-Content -Path $LocalPropsFile -Value "sdk.dir=C:\\Android\\sdk`n"
    Write-Host "Created local.properties with sdk.dir" -ForegroundColor Gray
}

# 2. Compile React Frontend
Write-Host "`n[2/5] Building React Frontend with Vite..." -ForegroundColor Cyan
Push-Location $FrontendDir
try {
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Frontend compilation failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} finally {
    Pop-Location
}

# 3. Synchronize Capacitor Android Assets
Write-Host "`n[3/5] Synchronizing Capacitor Android Assets..." -ForegroundColor Cyan
Push-Location $FrontendDir
try {
    & npx cap sync android
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Capacitor sync failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} finally {
    Pop-Location
}

# 4. Compile Android APK with Gradle
Write-Host "`n[4/5] Compiling Android APK with Gradle (assembleDebug)..." -ForegroundColor Cyan
Push-Location $AndroidDir
try {
    & .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Gradle assembleDebug failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} finally {
    Pop-Location
}

# 5. Package & Copy APK to output directory
Write-Host "`n[5/5] Packaging APK..." -ForegroundColor Cyan
$BuiltApk = Join-Path $AndroidDir "app\build\outputs\apk\debug\app-debug.apk"

if (Test-Path $BuiltApk) {
    if (!(Test-Path $ApkOutputDir)) {
        New-Item -ItemType Directory -Path $ApkOutputDir -Force | Out-Null
    }
    Copy-Item -Path $BuiltApk -Destination $TargetApk -Force
    $ApkItem = Get-Item $TargetApk
    $SizeMB = [math]::Round($ApkItem.Length / 1MB, 2)

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host "  SUCCESS: ANDROID APK READY FOR MOBILE PHONE!           " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "APK Location: $TargetApk" -ForegroundColor White
    Write-Host "APK File Size: $SizeMB MB" -ForegroundColor White
    Write-Host "`nHow to install on your Android phone:" -ForegroundColor Yellow
    Write-Host "1. Connect your Android phone to your PC or send the APK via WhatsApp/Google Drive/Bluetooth."
    Write-Host "2. Tap on ProjectSystem-debug.apk on your Android phone."
    Write-Host "3. Tap 'Install' (Enable 'Install from unknown sources' if prompted)."
    Write-Host "4. Open Project System directly from your Android phone's App Drawer!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not find generated APK at $BuiltApk" -ForegroundColor Red
    exit 1
}
