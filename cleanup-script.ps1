# Script para eliminar archivos duplicados después de la reorganización
# Este script moverá los archivos duplicados a una carpeta de respaldo antes de eliminarlos

# Crear carpeta de respaldo si no existe
$backupFolder = "c:\Users\Usuario\Downloads\comedor-grupoavika\backup"
if (-not (Test-Path $backupFolder)) {
    New-Item -Path $backupFolder -ItemType Directory -Force
    Write-Host "Carpeta de respaldo creada: $backupFolder"
}

# Función para respaldar y eliminar un archivo
function Backup-AndRemove {
    param (
        [string]$FilePath
    )
    
    if (Test-Path $FilePath) {
        $fileName = Split-Path $FilePath -Leaf
        Copy-Item $FilePath -Destination "$backupFolder\$fileName" -Force
        Remove-Item $FilePath
        Write-Host "Archivo $fileName respaldado y eliminado" -ForegroundColor Green
    } else {
        $fileName = Split-Path $FilePath -Leaf
        Write-Host "El archivo $fileName no existe" -ForegroundColor Yellow
    }
}

# 1. Archivos de utilidades duplicados
Write-Host "`n=== Eliminando archivos de utilidades duplicados ===" -ForegroundColor Cyan
$utilsToRemove = @(
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\utils\date-utils.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\utils\data-formatter.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\utils\excel-handler.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\utils\excel-parser.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\utils\validators.js"
)

foreach ($file in $utilsToRemove) {
    Backup-AndRemove -FilePath $file
}

# 2. Archivos de vistas de administrador
Write-Host "`n=== Eliminando archivos de vistas de administrador duplicados ===" -ForegroundColor Cyan
$adminToRemove = @(
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\admin\confirmations.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\admin\create-users.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\admin\menu-fixed.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\admin\menu.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\admin\users.js"
)

foreach ($file in $adminToRemove) {
    Backup-AndRemove -FilePath $file
}

# 3. Archivos de vistas de coordinador
Write-Host "`n=== Eliminando archivos de vistas de coordinador duplicados ===" -ForegroundColor Cyan
$coordToRemove = @(
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\coordinator\confirmations.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\coordinator\dashboard.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\coordinator\employees-fixed.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\coordinator\employees.js",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\coordinator\menu-view.js"
)

foreach ($file in $coordToRemove) {
    Backup-AndRemove -FilePath $file
}

# 4. Documentación duplicada
Write-Host "`n=== Moviendo documentación duplicada ===" -ForegroundColor Cyan
$docsToMove = @(
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\services\GUIA-MIGRACION-ERRORSERVICE.md",
    "c:\Users\Usuario\Downloads\comedor-grupoavika\js\services\README-errorService.md"
)

foreach ($file in $docsToMove) {
    if (Test-Path $file) {
        $fileName = Split-Path $file -Leaf
        Copy-Item $file -Destination "c:\Users\Usuario\Downloads\comedor-grupoavika\docs\$fileName" -Force
        Write-Host "Documento $fileName copiado a la carpeta docs" -ForegroundColor Green
        Backup-AndRemove -FilePath $file
    } else {
        $fileName = Split-Path $file -Leaf
        Write-Host "El documento $fileName no existe" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Limpieza completada ===" -ForegroundColor Green
Write-Host "Se ha creado una copia de seguridad de todos los archivos eliminados en: $backupFolder"
Write-Host "Por favor, verifica que la aplicación funcione correctamente con la nueva estructura."
