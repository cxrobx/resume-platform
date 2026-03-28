"""
Migration: resume/ -> resumes/default/
Run once. Idempotent — skips if resumes/default/ already exists.
Also creates resumes/_template/ with a minimal skeleton resume.
"""
import shutil
from pathlib import Path

TEMPLATE_RESUME = """\
#import "sections.typ": *
#import "theme.typ": *

#resume-header(
  name: "Your Name",
  address: "City, State",
  contact: [your\\@email.com],
)

#section("Experience", [
  #role(company: "Company", date: "20XX -- Present", title: "Title")[
    #bullets(
      [Description of work],
    )
  ]
])
"""


def migrate_to_multi_resume(old_root, new_base):
    # type: (str, str) -> bool
    """
    If old_root (resume/) exists and new_base/default/ does not,
    copy old_root contents to new_base/default/.
    Also creates _template/ if missing.
    Returns True if migration was performed.
    """
    old = Path(old_root).resolve()
    base = Path(new_base).resolve()
    default = base / "default"

    migrated = False

    if not default.is_dir():
        base.mkdir(parents=True, exist_ok=True)
        if old.is_dir():
            shutil.copytree(str(old), str(default))
            migrated = True
        else:
            # No old data — create minimal scaffold
            default.mkdir()
            (default / "src").mkdir()
            (default / "build").mkdir()
            (default / "assets" / "fonts").mkdir(parents=True)
            (default / "src" / "resume.typ").write_text(TEMPLATE_RESUME)
            migrated = True

    # Create _template if missing
    template = base / "_template"
    if not template.is_dir():
        template.mkdir(parents=True, exist_ok=True)
        (template / "src").mkdir(exist_ok=True)
        (template / "build").mkdir(exist_ok=True)
        (template / "assets" / "fonts").mkdir(parents=True, exist_ok=True)

        # Copy theme.typ and sections.typ from default if available
        for name in ("theme.typ", "sections.typ"):
            src = default / "src" / name
            if src.exists():
                shutil.copy2(str(src), str(template / "src" / name))

        # Write skeleton resume.typ
        (template / "src" / "resume.typ").write_text(TEMPLATE_RESUME)

    return migrated


if __name__ == "__main__":
    import sys
    old = sys.argv[1] if len(sys.argv) > 1 else "../resume"
    new = sys.argv[2] if len(sys.argv) > 2 else "../resumes"
    if migrate_to_multi_resume(old, new):
        print("Migration complete: %s -> %s/default/" % (old, new))
    else:
        print("Already migrated (resumes/default/ exists). No changes.")
