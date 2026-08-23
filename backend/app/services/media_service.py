"""
Media service (Phase 2B — lightweight CMS image uploads).

Stores uploaded images on local disk (user-data ``storage`` is null → no S3),
served publicly by nginx under ``MEDIA_PUBLIC_BASE + "/media/<file>"``.

Validation is done by magic bytes + content-type + size (no Pillow dependency).
"""
import os
import uuid
from typing import Dict, List, Tuple

from app.core.config import settings


class MediaError(Exception):
    """Raised on invalid uploads (bad type, too large, empty)."""


# ext -> (content_type, list of acceptable magic-byte prefixes)
# Magic bytes are matched against the start of the file.
_MAGIC: Dict[str, Tuple[str, List[bytes]]] = {
    ".jpg": ("image/jpeg", [b"\xff\xd8\xff"]),
    ".jpeg": ("image/jpeg", [b"\xff\xd8\xff"]),
    ".png": ("image/png", [b"\x89PNG\r\n\x1a\n"]),
    ".gif": ("image/gif", [b"GIF87a", b"GIF89a"]),
    ".webp": ("image/webp", [b"RIFF"]),  # RIFF....WEBP
    ".svg": ("image/svg+xml", []),  # text-based, validated separately
}

_CONTENT_TYPE_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
}


def _detect_ext(filename: str, content_type: str, data: bytes) -> str:
    """Determine the file extension, preferring magic bytes over the client-sent name."""
    # PNG
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    # JPEG
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    # GIF
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return ".gif"
    # WEBP: RIFF....WEBP
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    # SVG: text starting with <?xml or <svg (allow small leading whitespace/BOM)
    head = data[:512].lstrip()
    if head.startswith(b"<?xml") or head.lower().startswith(b"<svg") or b"<svg" in data[:512].lower():
        return ".svg"
    # Fall back to declared content-type.
    if content_type in _CONTENT_TYPE_TO_EXT:
        return _CONTENT_TYPE_TO_EXT[content_type]
    # Fall back to the filename extension if recognised.
    _, ext = os.path.splitext(filename or "")
    if ext.lower() in _MAGIC:
        return ext.lower()
    raise MediaError("Unsupported image type. Allowed: JPEG, PNG, GIF, WEBP, SVG.")


def save_image(data: bytes, filename: str, content_type: str) -> Dict[str, object]:
    """Validate and persist an uploaded image, returning public URL + metadata."""
    if not data:
        raise MediaError("Empty file.")
    if len(data) > settings.MEDIA_MAX_BYTES:
        mb = settings.MEDIA_MAX_BYTES // (1024 * 1024)
        raise MediaError(f"File too large. Maximum size is {mb} MB.")

    ext = _detect_ext(filename or "", content_type or "", data)
    resolved_content_type = _MAGIC[ext][0]

    os.makedirs(settings.MEDIA_UPLOAD_DIR, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(settings.MEDIA_UPLOAD_DIR, name)
    with open(path, "wb") as fh:
        fh.write(data)

    url = f"{settings.MEDIA_PUBLIC_BASE.rstrip('/')}/media/{name}"
    return {
        "url": url,
        "filename": name,
        "size": len(data),
        "content_type": resolved_content_type,
    }


def list_media() -> List[Dict[str, object]]:
    """List uploaded media files (newest first)."""
    d = settings.MEDIA_UPLOAD_DIR
    if not os.path.isdir(d):
        return []
    out = []
    for name in os.listdir(d):
        p = os.path.join(d, name)
        if not os.path.isfile(p):
            continue
        st = os.stat(p)
        out.append({
            "url": f"{settings.MEDIA_PUBLIC_BASE.rstrip('/')}/media/{name}",
            "filename": name,
            "size": st.st_size,
            "content_type": _MAGIC.get(os.path.splitext(name)[1].lower(), ("application/octet-stream", []))[0],
            "mtime": st.st_mtime,
        })
    out.sort(key=lambda x: x["mtime"], reverse=True)
    for o in out:
        o.pop("mtime", None)
    return out


def delete_media(filename: str) -> None:
    """Delete an uploaded media file by its stored filename (basename only)."""
    safe = os.path.basename(filename or "")
    if not safe:
        raise MediaError("Invalid filename.")
    path = os.path.join(settings.MEDIA_UPLOAD_DIR, safe)
    if not os.path.isfile(path):
        raise MediaError("File not found.")
    os.remove(path)
