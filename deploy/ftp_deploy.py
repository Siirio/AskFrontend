#!/usr/bin/env python3
from __future__ import annotations

import argparse
import getpass
import mimetypes
from ftplib import FTP
from pathlib import Path


def connect(host: str, user: str) -> FTP:
    password = getpass.getpass("FTP password: ")
    ftp = FTP(host, timeout=30)
    ftp.login(user=user, passwd=password)
    ftp.encoding = "utf-8"
    return ftp


def ensure_dir(ftp: FTP, path: str) -> None:
    current = ftp.pwd()
    if path.startswith("/"):
        ftp.cwd("/")
    for part in [chunk for chunk in path.strip("/").split("/") if chunk]:
        try:
            ftp.cwd(part)
        except Exception:
            ftp.mkd(part)
            ftp.cwd(part)
    ftp.cwd(current)


def upload_dir(ftp: FTP, local_dir: Path, remote_dir: str) -> None:
    ensure_dir(ftp, remote_dir)
    for local_path in local_dir.rglob("*"):
        if local_path.is_dir():
            continue
        relative = local_path.relative_to(local_dir).as_posix()
        remote_path = f"{remote_dir.rstrip('/')}/{relative}"
        parent = remote_path.rsplit("/", 1)[0]
        ensure_dir(ftp, parent)
        with local_path.open("rb") as file:
            ftp.storbinary(f"STOR {remote_path}", file)
        guessed_type = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
        print(f"uploaded {relative} ({guessed_type})")


def list_dir(ftp: FTP, path: str) -> None:
    print(f"PWD {ftp.pwd()}")
    print(f"LIST {path}")
    ftp.retrlines(f"LIST {path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--list", default=None)
    parser.add_argument("--local", type=Path)
    parser.add_argument("--remote")
    args = parser.parse_args()

    ftp = connect(args.host, args.user)
    try:
        if args.list is not None:
            list_dir(ftp, args.list)
        if args.local and args.remote:
            upload_dir(ftp, args.local, args.remote)
    finally:
        ftp.quit()


if __name__ == "__main__":
    main()
