# -*- coding: utf-8 -*-
"""一键把 One Chat Hub 单页官网发布到 GitHub Pages。

用法（推荐 token 文件，密钥不进命令行、不进环境变量、不进对话）：
    python "发布到GitHub Pages.py" --check-only          # 只预演，不写任何远端
    python "发布到GitHub Pages.py"                        # 读取 .github-token
    python "发布到GitHub Pages.py" --repo one-chat-hub --fix-canonical

Token 获取：GitHub → Settings → Developer settings → Personal access tokens →
            Fine-grained tokens → 勾选 Repository permissions → Contents: Read and write、
            Administration: Read and write（开启 Pages 需要）。
也支持环境变量 GITHUB_TOKEN 或 --token（后两者会出现在进程列表/终端记录里，尽量别用）。
"""
import argparse
import base64
import os
import re
import subprocess
import sys
from pathlib import Path

import requests

SITE = Path(__file__).resolve().parent
API = "https://api.github.com"
TOKEN_FILE = SITE / ".github-token"
DEFAULT_PROXY = ""   # 空=直连；本机直连 api.github.com 可用时无需代理


def read_token(cli_token):
    """按 --token → 环境变量 → .github-token 文件的顺序取凭据，并保证文件已被 git 忽略。"""
    if cli_token:
        return cli_token.strip(), "--token"
    env = os.environ.get("GITHUB_TOKEN", "").strip()
    if env:
        return env, "环境变量 GITHUB_TOKEN"
    if TOKEN_FILE.is_file():
        tracked = subprocess.run(
            ["git", "-C", str(SITE), "ls-files", "--error-unmatch", TOKEN_FILE.name],
            capture_output=True, text=True).returncode == 0
        if tracked:
            sys.exit(f"{TOKEN_FILE.name} 已被 git 跟踪，请先执行 git rm --cached {TOKEN_FILE.name}，"
                     "否则密钥会被推到公开仓库")
        return TOKEN_FILE.read_text(encoding="utf-8").strip(), TOKEN_FILE.name
    return "", ""



def probe_api(proxies):
    """探测 GitHub API 是否可达。proxies=None 表示强制直连（忽略本机失效的环境代理变量）"""
    try:
        s = requests.Session()
        s.trust_env = False if proxies is None else True
        if proxies:
            s.proxies.update(proxies)
        s.headers.update({"User-Agent": "sch-site-deploy"})
        r = s.get(f"{API}/rate_limit", timeout=15)
        return r.status_code == 200
    except Exception:
        return False


def run_git(proxy, *args, check=True):
    """执行 git 命令；proxy 为空时显式禁用本机失效的环境代理变量"""
    opts = ["git", "-C", str(SITE)]
    if proxy:
        opts += [f"-c", f"http.proxy={proxy}", f"-c", f"https.proxy={proxy}"]
    else:
        opts += ["-c", "http.proxy=", "-c", "https.proxy="]
    opts += list(args)
    p = subprocess.run(opts, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if check and p.returncode != 0:
        print((p.stderr or p.stdout).strip())
        sys.exit(f"git {' '.join(args)} 执行失败")
    return (p.stdout or "").strip()


def main():
    ap = argparse.ArgumentParser(description="发布 One Chat Hub 官网到 GitHub Pages")
    ap.add_argument("--token", default="", help="GitHub PAT（不建议，会出现在进程列表里）")
    ap.add_argument("--owner", default="thinkjunior", help="GitHub 账号（决定 Pages 域名前缀）")
    ap.add_argument("--repo", default="one-chat-hub", help="仓库名（同时决定 Pages 子路径）")
    ap.add_argument("--branch", default="main", help="发布分支")
    ap.add_argument("--proxy", default=DEFAULT_PROXY, help="本机代理地址，留空则直连")
    ap.add_argument("--check-only", action="store_true", help="只做本地预演，不联网写入、不推送")
    ap.add_argument("--fix-canonical", action="store_true", help="把 canonical 同步成本次实际发布地址")
    args = ap.parse_args()

    pages_url = f"https://{args.owner}.github.io/{args.repo}/"
    index = SITE / "index.html"

    # 0) 站内自引用 URL 与本次 Pages 地址一致性
    #    （canonical 写错 → 搜索引擎收录 404 页；og:image 相对路径 → 社交卡片无图）
    if index.is_file():
        html = index.read_text(encoding="utf-8")
        stale = sorted({u for u in re.findall(r'https://[\w.-]+\.github\.io/[\w.-]+', html)
                        if u != pages_url.rstrip('/')})
        relative_social = re.findall(r'(?:og:image|twitter:image)" content="(?!https?:)[^"]+"', html)
        if stale or relative_social:
            if stale:
                print(f"! 站内 GitHub Pages 自引用与本次地址不一致：{stale} → {pages_url.rstrip('/')}")
            if relative_social:
                print("! og:image / twitter:image 是相对路径，社交抓取器取不到图，应为绝对 URL")
            if args.fix_canonical:
                for u in stale:
                    html = html.replace(u, pages_url.rstrip("/"))
                for tag in ("og:image", "twitter:image"):
                    html = re.sub(
                        rf'({tag}" content=")(?!https?:)([^"]+")',
                        rf'\g<1>{pages_url}\g<2>', html)
                index.write_text(html, encoding="utf-8")
                print("  ✓ 已同步站内自引用 URL")
            else:
                print("  （加 --fix-canonical 可自动同步；仓库名换了就必须同步）")
        else:
            print(f"  ✓ canonical / og:url / 社交图片均指向 {pages_url}")

    if args.check_only:
        print("\n预演完成（未联网写入、未推送）。")
        print(f"  将发布到：{pages_url}")
        print(f"  本地文件：{sum(1 for p in SITE.rglob('*') if p.is_file() and '.git' not in p.parts)} 个")
        return

    token, token_from = read_token(args.token)
    if not token:
        sys.exit(f"缺少 Token：请把 PAT 写入 {TOKEN_FILE.name}（该文件已被 .gitignore 忽略），"
                 "或设置环境变量 GITHUB_TOKEN")
    print(f"凭据来源：{token_from}（长度 {len(token)}，不回显）")

    proxies = {"http": args.proxy, "https": args.proxy} if args.proxy else None
    if proxies and not probe_api(proxies):
        print(f"代理 {args.proxy} 不可用，自动改为直连")
        proxies = None
    elif not proxies and not probe_api(None):
        sys.exit("无法直连 GitHub API：请检查网络，或用 --proxy 指定可用代理")
    git_proxy = args.proxy if proxies else ""

    s = requests.Session()
    s.trust_env = False          # 一律忽略本机失效的环境代理变量（HTTP_PROXY=7897）
    if proxies:
        s.proxies.update(proxies)
    s.headers.update({
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "sch-site-deploy",
    })

    # 1) 仓库是否存在，不存在就建
    r = s.get(f"{API}/repos/{args.owner}/{args.repo}", timeout=30)
    if r.status_code == 404:
        print(f"创建仓库 {args.owner}/{args.repo} …")
        r = s.post(f"{API}/user/repos", json={
            "name": args.repo, "private": False, "auto_init": False,
            "description": "One Chat Hub 单页官网 · 一次提问，AI并排作答",
        }, timeout=40)
        if r.status_code not in (200, 201):
            print(f"创建仓库返回 {r.status_code}: {r.text[:300]}")
            sys.exit(
                "无法用该 token 创建仓库。fine-grained token 常因缺少仓库创建能力而失败，"
                f"请在浏览器手动新建空仓库 {args.owner}/{args.repo}（Public、不初始化 README），"
                "再重跑本脚本——后续推送与开启 Pages 只需 Contents 与 Pages 权限。"
            )
        print("  ✓ 仓库已创建")
    elif r.status_code == 200:
        print(f"仓库 {args.owner}/{args.repo} 已存在，直接使用")
    else:
        sys.exit(f"检查仓库失败 {r.status_code}: {r.text[:300]}")

    # 2) 提交并推送
    if not (SITE / ".git").exists():
        run_git(git_proxy, "init", "-b", args.branch)
    run_git(git_proxy, "add", "-A")
    st = run_git(git_proxy, "status", "--porcelain")
    if st:
        run_git(git_proxy, "commit", "-m", "docs: 更新官网内容")
    # 凭据只在这一次推送的 URL 里出现，推完立刻换回干净地址，并在结束时校验无残留
    remote = f"https://x-access-token:{token}@github.com/{args.owner}/{args.repo}.git"
    run_git(git_proxy, "remote", "remove", "origin", check=False)
    run_git(git_proxy, "remote", "add", "origin", remote)
    run_git(git_proxy, "push", "-u", "origin", args.branch)
    run_git(git_proxy, "remote", "set-url", "origin",
            f"https://github.com/{args.owner}/{args.repo}.git")
    leftover = run_git(git_proxy, "config", "--get", "remote.origin.url")
    if token in leftover:
        print("  ! 警告：remote.origin.url 仍含凭据，请手工检查 .git/config")
    else:
        print("  ✓ 已推送，remote 已换成不含凭据的地址")

    # 3) 开启 Pages
    r = s.post(f"{API}/repos/{args.owner}/{args.repo}/pages",
               json={"source": {"branch": args.branch, "path": "/"}}, timeout=40)
    if r.status_code in (201, 204):
        print("  ✓ Pages 已开启")
    elif r.status_code == 422 and "already" in r.text.lower():
        print("  · Pages 已处于开启状态")
    else:
        print(f"  ! 开启 Pages 返回 {r.status_code}: {r.text[:200]}")
        print("    若是 403/404，请给 token 补上 Repository permissions → Pages: Read and write；")
        print("    或手动在仓库 Settings → Pages 选择 Deploy from a branch →",
              args.branch, "/ (root)。")

    print(f"\n完成。站点地址：{pages_url}")
    print("首次构建通常需要 1-2 分钟，稍后访问即可。")



if __name__ == "__main__":
    main()
