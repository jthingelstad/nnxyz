#!/usr/bin/env python3
"""Compatibility entry point; use tools/export-svg.py for new exports."""
from pathlib import Path
import runpy
if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).resolve().parents[1] / 'tools/export-svg.py'), run_name='__main__')
