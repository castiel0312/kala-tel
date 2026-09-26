"""Extract FORGE 16B(78)-32 raw ZIPs into data/interim/, leaving raw/ untouched."""
import zipfile
from pathlib import Path

RAW_DIR = Path("data/raw/utah_forge/forge16b_78_32")
INTERIM_DIR = Path("data/interim/forge16b_78_32")

def main():
    zips = sorted(RAW_DIR.glob("*.zip"))
    if not zips:
        print(f"No .zip files found in {RAW_DIR.resolve()}")
        return
    for zpath in zips:
        target = INTERIM_DIR / zpath.stem
        target.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zpath) as zf:
            zf.extractall(target)
        n_files = sum(1 for _ in target.rglob("*") if _.is_file())
        print(f"[OK] {zpath.name} -> {target} ({n_files} files)")

if __name__ == "__main__":
    main()