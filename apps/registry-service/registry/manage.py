#!/usr/bin/env python
import os
import sys
from pathlib import Path


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    sys.path.append(str(base_dir))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "registry.settings.dev")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
