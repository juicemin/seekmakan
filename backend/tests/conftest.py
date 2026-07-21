from pathlib import Path
import sys


backend_root = Path(__file__).resolve().parent.parent
backend_path = str(backend_root)

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)