@echo off
REM ============================================================
REM MotorDealOS Project Setup Script for Windows CMD
REM Run this in Command Prompt (CMD) - NOT PowerShell
REM This creates the entire folder structure and empty files
REM Then you paste content from the spec documents into each file
REM ============================================================

echo ==========================================
echo MotorDealOS Project Setup
echo ==========================================

REM Step 1: Set project location (change this if you want a different path)
set PROJECT_DIR=%USERPROFILE%\MotorDealOS

echo.
echo [Step 1] Creating project directory at %PROJECT_DIR%
if not exist "%PROJECT_DIR%" mkdir "%PROJECT_DIR%"
cd /d "%PROJECT_DIR%"

REM Step 2: Clone your existing GitHub repo (or init if empty)
echo.
echo [Step 2] Setting up Git repository...
if not exist ".git" (
    git init
    git remote add origin https://github.com/akramahmed1/MotorDealOS.git
    echo Git initialized and remote added.
) else (
    echo Git already initialized.
)

REM Step 3: Create root level files
echo.
echo [Step 3] Creating root files...
type nul > .env.local
type nul > .env
type nul > .gitignore
type nul > README.md
type nul > next.config.js
type nul > package.json
type nul > tailwind.config.ts
type nul > tsconfig.json

REM Step 4: Create Supabase directory structure
echo.
echo [Step 4] Creating Supabase directories...
mkdir supabase\migrations 2>nul
mkdir supabase\functions\orchestrator-agent 2>nul
mkdir supabase\functions\content-generator 2>nul
mkdir supabase\functions\compliance-agent 2>nul
mkdir supabase\functions\publisher-agent 2>nul
mkdir supabase\functions\analytics-sync 2>nul
mkdir supabase\functions\lead-router 2>nul
mkdir supabase\functions\follow-up-executor 2>nul
mkdir supabase\functions\ai-chat-agent 2>nul
mkdir supabase\functions\ai-voice-agent 2>nul
mkdir supabase\functions\_shared 2>nul

REM Step 5: Create Supabase files
echo.
echo [Step 5] Creating Supabase files...
type nul > supabase\schema.sql
type nul > supabase\seed.sql
type nul > supabase\functions\orchestrator-agent\index.ts
type nul > supabase\functions\orchestrator-agent\deno.json
type nul > supabase\functions\content-generator\index.ts
type nul > supabase\functions\content-generator\deno.json
type nul > supabase\functions\compliance-agent\index.ts
type nul > supabase\functions\compliance-agent\deno.json
type nul > supabase\functions\publisher-agent\index.ts
type nul > supabase\functions\publisher-agent\deno.json
type nul > supabase\functions\analytics-sync\index.ts
type nul > supabase\functions\analytics-sync\deno.json
type nul > supabase\functions\lead-router\index.ts
type nul > supabase\functions\lead-router\deno.json
type nul > supabase\functions\follow-up-executor\index.ts
type nul > supabase\functions\follow-up-executor\deno.json
type nul > supabase\functions\ai-chat-agent\index.ts
type nul > supabase\functions\ai-chat-agent\deno.json
type nul > supabase\functions\ai-voice-agent\index.ts
type nul > supabase\functions\ai-voice-agent\deno.json
type nul > supabase\functions\_shared\nim.ts
type nul > supabase\functions\_shared\supabase.ts
type nul > supabase\functions\_shared\cloudinary.ts
type nul > supabase\functions\_shared\meta.ts
type nul > supabase\functions\_shared\twilio.ts
type nul > supabase\functions\_shared\compliance.ts
type nul > supabase\functions\_shared\types.ts

REM Step 6: Create Next.js src directory structure
echo.
echo [Step 6] Creating Next.js directories...
mkdir src\app\(admin)\approvals 2>nul
mkdir src\app\(admin)\compliance 2>nul
mkdir src\app\(admin)\leads 2>nul
mkdir src\app\(admin)\vehicles 2>nul
mkdir src\app\(admin)\chat 2>nul
mkdir src\app\(admin)\calls 2>nul
mkdir src\app\(admin)\reports 2>nul
mkdir src\app\(admin)\settings 2>nul
mkdir src\app\(public)\inventory 2>nul
mkdir src\app\(public)\inventory\[id] 2>nul
mkdir src\app\(public)\export 2>nul
mkdir src\app\(public)\sell-your-car 2>nul
mkdir src\app\(public)\financing 2>nul
mkdir src\app\(public)\about 2>nul
mkdir src\app\(public)\contact 2>nul
mkdir src\app\(public)\blog 2>nul
mkdir src\app\(public)\privacy 2>nul
mkdir src\app\(public)\terms 2>nul
mkdir src\app\api\webhooks\meta 2>nul
mkdir src\app\api\webhooks\twilio\voice 2>nul
mkdir src\app\api\webhooks\supabase 2>nul
mkdir src\app\api\chat 2>nul
mkdir src\components\ui 2>nul
mkdir src\components\chat 2>nul
mkdir src\components\inventory 2>nul
mkdir src\components\admin 2>nul
mkdir src\components\forms 2>nul
mkdir src\lib\supabase 2>nul
mkdir src\lib\utils 2>nul
mkdir src\lib\hooks 2>nul
mkdir src\types 2>nul
mkdir tests 2>nul
mkdir docs 2>nul

REM Step 7: Create Next.js files
echo.
echo [Step 7] Creating Next.js files...
type nul > src\app\layout.tsx
type nul > src\app\page.tsx
type nul > src\app\globals.css
type nul > src\app\(admin)\layout.tsx
type nul > src\app\(admin)\approvals\page.tsx
type nul > src\app\(admin)\compliance\page.tsx
type nul > src\app\(admin)\leads\page.tsx
type nul > src\app\(admin)\vehicles\page.tsx
type nul > src\app\(admin)\chat\page.tsx
type nul > src\app\(admin)\calls\page.tsx
type nul > src\app\(admin)\reports\page.tsx
type nul > src\app\(admin)\settings\page.tsx
type nul > src\app\(public)\inventory\page.tsx
type nul > src\app\(public)\inventory\[id]\page.tsx
type nul > src\app\(public)\export\page.tsx
type nul > src\app\(public)\sell-your-car\page.tsx
type nul > src\app\(public)\financing\page.tsx
type nul > src\app\(public)\about\page.tsx
type nul > src\app\(public)\contact\page.tsx
type nul > src\app\(public)\blog\page.tsx
type nul > src\app\(public)\privacy\page.tsx
type nul > src\app\(public)\terms\page.tsx
type nul > src\app\api\webhooks\meta\route.ts
type nul > src\app\api\webhooks\twilio\voice\route.ts
type nul > src\app\api\webhooks\supabase\route.ts
type nul > src\app\api\chat\route.ts

type nul > src\components\ui\.gitkeep
type nul > src\components\chat\ChatWidget.tsx
type nul > src\components\inventory\VehicleCard.tsx
type nul > src\components\inventory\VehicleGrid.tsx
type nul > src\components\inventory\VehicleSearch.tsx
type nul > src\components\admin\ApprovalTable.tsx
type nul > src\components\admin\ComplianceTable.tsx
type nul > src\components\admin\LeadInbox.tsx
type nul > src\components\admin\VehicleManager.tsx
type nul > src\components\admin\ReportDashboard.tsx
type nul > src\components\admin\Sidebar.tsx
type nul > src\components\forms\LeadForm.tsx
type nul > src\components\forms\ExportForm.tsx
type nul > src\components\forms\SellForm.tsx

type nul > src\lib\supabase\client.ts
type nul > src\lib\supabase\server.ts
type nul > src\lib\supabase\admin.ts
type nul > src\lib\utils\format.ts
type nul > src\lib\utils\validation.ts
type nul > src\lib\utils\constants.ts
type nul > src\lib\hooks\useRealtime.ts
type nul > src\lib\hooks\useAuth.ts

type nul > src\types\database.ts

REM Step 8: Create test and docs files
echo.
echo [Step 8] Creating tests and docs...
type nul > tests\orchestrator.test.ts
type nul > tests\compliance.test.ts
type nul > tests\rls.test.ts
type nul > docs\CLAUDE.md
type nul > docs\PROJECT.md
type nul > docs\STACK.md
type nul > docs\DATABASE.md
type nul > docs\AGENTS.md
type nul > docs\COMPLIANCE.md
type nul > docs\PATTERNS.md
type nul > docs\FEATURES.md
type nul > docs\HUMAN-APPROVAL.md
type nul > docs\CHARTER.md

REM Step 9: Create .gitignore with proper entries
echo.
echo [Step 9] Creating .gitignore...
(
echo # Dependencies
echo node_modules/
echo .pnpm-store/
echo 
rem echo # Environment variables
echo .env
echo .env.local
echo .env.production
echo 
echo # Next.js
echo .next/
echo out/
echo 
echo # Supabase
echo supabase/.temp/
echo 
echo # OS
echo .DS_Store
echo Thumbs.db
echo 
echo # IDE
echo .vscode/
echo .idea/
echo *.swp
echo *.swo
echo 
echo # Logs
echo *.log
echo npm-debug.log*
echo yarn-debug.log*
echo yarn-error.log*
echo 
echo # Testing
echo coverage/
) > .gitignore

REM Step 10: Verify structure
echo.
echo ==========================================
echo [DONE] Project structure created at:
echo %PROJECT_DIR%
echo ==========================================
echo.
echo Next steps:
echo 1. Paste content from the spec documents into each file
echo 2. Run: git add .
echo 3. Run: git commit -m "Initial project structure"
echo 4. Run: git push origin main
echo.
echo File mapping guide:
echo - supabase/schema.sql          ^<- Paste MotorDeals AI OS 3.1 Part 2 (Schema)
echo - supabase/seed.sql            ^<- Paste seed data from 3.1 Part 2
echo - supabase/functions/*/index.ts ^<- Paste Edge Function code from 3.1 Part 6
echo - src/app/*                    ^<- Paste Next.js pages from 3.1 Part 7
echo - docs/CHARTER.md              ^<- Paste AI Build Charter v1.1
echo.
pause
