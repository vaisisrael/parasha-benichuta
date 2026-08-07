from __future__ import annotations

import hashlib
import html
import json
import urllib.request
from pathlib import Path

CONTENT_ROOT = Path("content")
IMAGE_ROOT = Path("assets/images/content")

OLD_BLOG_URL = (
    "https://theweekparasha.blogspot.com/2024/08/blog-post.html"
)

NEW_SITE_URL = (
    "https://www.parasha-week.co.il/2024/08/blog-post.html"
)

IMAGE_GROUPS = [
    [
        "https://blogger.googleusercontent.com/img/b/R29vZ2xl/"
        "AVvXsEgAicE3XnKG7qdF2eL1-6ObAjwwuE6Hz5jTS-OrwRxNNeIDJAWvR2yYhdND0koFl"
        "VUNI8nQnt_0hsmD2v_GOtBHWrVh6ZTlIfZ0heryMgZX7ZAu_kYMY_-wpUpoDjTZVD"
        "n1R1GeRIt231zkn98NYG86fW3zSCMn3EbSCAfIJzdh8uhexhw57r25b95OPUM/s505/"
        "A_new_square_in_Ashkelon_named_after_the_'Oz_77'_battalion_that_fought_"
        "in_the_Yom_Kippur_War_(cropped).jpg",
        "https://blogger.googleusercontent.com/img/b/R29vZ2xl/"
        "AVvXsEgAicE3XnKG7qdF2eL1-6ObAjwwuE6Hz5jTS-OrwRxNNeIDJAWvR2yYhdND0koFl"
        "VUNI8nQnt_0hsmD2v_GOtBHWrVh6ZTlIfZ0heryMgZX7ZAu_kYMY_-wpUpoDjTZVD"
        "n1R1GeRIt231zkn98NYG86fW3zSCMn3EbSCAfIJzdh8uhexhw57r25b95OPUM/s320/"
        "A_new_square_in_Ashkelon_named_after_the_'Oz_77'_battalion_that_fought_"
        "in_the_Yom_Kippur_War_(cropped).jpg",
    ],
    [
        "https://blogger.googleusercontent.com/img/b/R29vZ2xl/"
        "AVvXsEg_XJ-l5ZDbp_QdTqXJQRip1YCoqB9kR2RpCZDi2mNenjULZ2xaB5YM0298VDyJSU"
        "Rk43ixvnDqdi-lWGPr1_7ghOQ2TOg3Ir1GdNHb3MgMXjhoDe7CXdzdq_3Zt05QF6ds"
        "66c1cNXiVTEKrH0Fj9sJsk4PQkdUjDwQLHrMTOQRgKU1HPcR3zocLwWTxQQ/s1600/"
        "200px-%D7%96%D7%90%D7%91_%D7%96%D7%91%D7%95%D7%98%D7%99%D7%A0%D7%A1"
        "%D7%A7%D7%99-JNF010760.jpeg",
        "https://blogger.googleusercontent.com/img/b/R29vZ2xl/"
        "AVvXsEg_XJ-l5ZDbp_QdTqXJQRip1YCoqB9kR2RpCZDi2mNenjULZ2xaB5YM0298VDyJSU"
        "Rk43ixvnDqdi-lWGPr1_7ghOQ2TOg3Ir1GdNHb3MgMXjhoDe7CXdzdq_3Zt05QF6ds"
        "66c1cNXiVTEKrH0Fj9sJsk4PQkdUjDwQLHrMTOQRgKU1HPcR3zocLwWTxQQ/s300/"
        "200px-%D7%96%D7%90%D7%91_%D7%96%D7%91%D7%95%D7%98%D7%99%D7%A0%D7%A1"
        "%D7%A7%D7%99-JNF010760.jpeg",
    ],
]


def all_content_files() -> list[Path]:
    return sorted(
        list((CONTENT_ROOT / "posts").rglob("*.json"))
        + list((CONTENT_ROOT / "pages").rglob("*.json"))
    )


def local_name(url: str) -> str:
    suffix = ".jpg"

    lowered = url.lower()

    if lowered.endswith(".jpeg"):
        suffix = ".jpg"
    elif lowered.endswith(".png"):
        suffix = ".png"
    elif lowered.endswith(".webp"):
        suffix = ".webp"

    digest = hashlib.sha256(
        url.encode("utf-8")
    ).hexdigest()[:18]

    return f"{digest}{suffix}"


def download(url: str, destination: Path) -> None:
    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    if (
        destination.exists()
        and destination.stat().st_size > 0
    ):
        return

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 "
                "ParashaBenichutaBloggerCleanup/1.0"
            )
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=60,
    ) as response:
        data = response.read()

    if not data:
        raise RuntimeError(
            f"Empty response for {url}"
        )

    destination.write_bytes(data)


def main() -> int:
    files = all_content_files()

    if not files:
        print("ERROR: no content files found")
        return 1

    replacements: dict[str, str] = {}

    print("Downloading final Blogger images...")

    for group in IMAGE_GROUPS:
        preferred = group[0]

        filename = local_name(preferred)
        destination = IMAGE_ROOT / filename
        local_url = "/" + destination.as_posix()

        download(
            preferred,
            destination,
        )

        print(
            f"Saved: {destination.as_posix()}"
        )

        for url in group:
            replacements[url] = local_url

            replacements[
                html.escape(
                    url,
                    quote=True,
                )
            ] = local_url

    changed_files = 0
    old_blog_replacements = 0
    image_replacements = 0

    for path in files:
        data = json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )

        content = data.get(
            "content_html",
            "",
        )

        new_content = content

        count = new_content.count(
            OLD_BLOG_URL
        )

        if count:
            new_content = new_content.replace(
                OLD_BLOG_URL,
                NEW_SITE_URL,
            )

            old_blog_replacements += count

        for old_url, new_url in replacements.items():
            count = new_content.count(
                old_url
            )

            if count:
                new_content = new_content.replace(
                    old_url,
                    new_url,
                )

                image_replacements += count

        if new_content != content:
            data["content_html"] = new_content

            path.write_text(
                json.dumps(
                    data,
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

            changed_files += 1

            print(
                f"Updated: {path.as_posix()}"
            )

    remaining_blogger = []

    for path in files:
        text = path.read_text(
            encoding="utf-8"
        )

        if (
            "theweekparasha.blogspot.com"
            in text
            or
            "blogger.googleusercontent.com"
            in text
        ):
            remaining_blogger.append(
                path.as_posix()
            )

    print()
    print(
        f"Changed content files: {changed_files}"
    )
    print(
        "Old Blogger post links replaced: "
        f"{old_blog_replacements}"
    )
    print(
        "Blogger image references replaced: "
        f"{image_replacements}"
    )
    print(
        "Files still containing Blogger references: "
        f"{len(remaining_blogger)}"
    )

    if remaining_blogger:
        print()
        print("Remaining files:")

        for path in remaining_blogger:
            print(path)

        return 1

    print()
    print(
        "BLOGGER CLEANUP OK — "
        "no Blogger references remain "
        "in content JSON files."
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(
        main()
    )
