@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo PREBUILD PROJECT SCANNER
echo ==========================================

set ROOT=%cd%
set SRC=%ROOT%\src
set LEGACY=%ROOT%\src\legacy-engine

set SAME_LIST=%ROOT%\same_name_list.txt
set SUS_LIST=%ROOT%\suspicious_files.txt

REM reset output
echo ==== SAME NAME FILES ==== > "%SAME_LIST%"
echo ==== SUSPICIOUS FILES ==== > "%SUS_LIST%"

echo.
echo [1] CHECK DUPLICATE NAMES AGAINST LEGACY-ENGINE
echo -----------------------------------------------

if not exist "%LEGACY%" (
    echo ERROR: src\legacy-engine tidak ditemukan
    pause
    exit /b
)

REM ambil semua file dari legacy-engine
for /r "%LEGACY%" %%F in (*.ts *.js *.tsx *.jsx) do (

    set "NAME=%%~nxF"

    REM cari file dengan nama sama di src
    for /r "%SRC%" %%A in (*) do (

        if /I "%%~nxA"=="!NAME!" (

            REM skip kalau masih di legacy-engine
            echo %%~dpA | find /I "\legacy-engine\" >nul

            if errorlevel 1 (

                echo FILE    : !NAME! >> "%SAME_LIST%"
                echo LEGACY  : %%~fF >> "%SAME_LIST%"
                echo FOUND   : %%~fA >> "%SAME_LIST%"
                echo. >> "%SAME_LIST%"
            )
        )
    )
)

echo DONE >> "%SAME_LIST%"

echo.
echo [2] CHECK SUSPICIOUS FILES
echo -----------------------------------------------

for /r "%SRC%" %%F in (*.ts *.js *.tsx *.jsx) do (

    set "NAME=%%~nxF"

    echo !NAME! | find /I "copy" >nul && echo %%~fF >> "%SUS_LIST%"
    echo !NAME! | find /I "backup" >nul && echo %%~fF >> "%SUS_LIST%"
    echo !NAME! | find /I "bakup" >nul && echo %%~fF >> "%SUS_LIST%"
    echo !NAME! | find /I "old" >nul && echo %%~fF >> "%SUS_LIST%"
    echo !NAME! | find /I "temp" >nul && echo %%~fF >> "%SUS_LIST%"
    echo !NAME! | find /I "legacy" >nul && echo %%~fF >> "%SUS_LIST%"
    echo !NAME! | find " " >nul && echo %%~fF >> "%SUS_LIST%"
)

echo DONE >> "%SUS_LIST%"

echo.
echo ==========================================
echo SCAN COMPLETE
echo ==========================================

pause