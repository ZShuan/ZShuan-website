# ============================================================
# ToWhere Online 一键部署脚本（方式 A：手动部署）
#
# 用法：进入项目目录后运行
#     .\deploy.ps1
#
# 前提：电脑上安装了 Node.js（https://nodejs.org 下载 LTS 版）
# 第一次运行会提示输入 GitHub Token；之后可以设置环境变量 GH_PAT 跳过输入
#
# 脚本会自动完成：构建 -> 提交源码到 main -> 更新 gh-pages 部署分支
# 完成后等待 1~2 分钟，GitHub Pages 自动生效
# ============================================================

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# 0. 检查是否在 main 分支
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne 'main') {
    Write-Host "请先切回 main 分支再运行部署脚本（当前分支：$branch）" -ForegroundColor Red
    exit 1
}

# 1. 获取 GitHub Token
$token = $env:GH_PAT
if (-not $token) {
    $token = Read-Host "请输入 GitHub Token"
    if (-not $token) {
        Write-Host "未输入 Token，已取消" -ForegroundColor Red
        exit 1
    }
}
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("ZShuan:$token"))
$authHeader = "AUTHORIZATION: basic $b64"

# 2. 构建项目
Write-Host "`n[1/4] 构建项目..."
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm run build
} else {
    pnpm run build
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败，请检查上面的报错" -ForegroundColor Red
    exit 1
}

# 3. 提交并推送源码到 main
Write-Host "`n[2/4] 提交并推送源码到 main..."
git config user.name "ZShuan" | Out-Null
git config user.email "zshuan@users.noreply.github.com" | Out-Null
git add -A
$staged = git diff --cached --name-only
if ($staged) {
    git commit -m "Update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-Null
    git -c http.version=HTTP/1.1 -c http.postBuffer=209715200 -c http.extraheader="$authHeader" push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "main 推送失败，请检查 Token 权限" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "（没有代码变更，跳过 main 提交）"
}

# 4. 更新 gh-pages 部署分支
Write-Host "`n[3/4] 更新部署分支 gh-pages..."
$tmp = Join-Path $env:TEMP "towhere-ghpages"
if (Test-Path $tmp) {
    Remove-Item -LiteralPath $tmp -Recurse -Force
}
git -c http.version=HTTP/1.1 -c http.extraheader="$authHeader" fetch origin gh-pages
git worktree add $tmp gh-pages | Out-Null
Push-Location $tmp
git rm -rf -q .
Copy-Item -Path "$PSScriptRoot\dist\*" -Destination $tmp -Recurse -Force
git add -A
git commit -m "Deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-Null
git -c http.version=HTTP/1.1 -c http.postBuffer=209715200 -c http.extraheader="$authHeader" push origin gh-pages
if ($LASTEXITCODE -ne 0) {
    Write-Host "gh-pages 推送失败" -ForegroundColor Red
    Pop-Location
    git worktree remove $tmp --force
    exit 1
}
Pop-Location
git worktree remove $tmp --force

Write-Host "`n[4/4] 部署完成！约 1~2 分钟后生效：" -ForegroundColor Green
Write-Host "https://zshuan.github.io/ZShuan-website/" -ForegroundColor Green
