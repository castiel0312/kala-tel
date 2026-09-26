"""Inspect the real FORGE 16B files: survey xlsx/txt, Pason 10-second CSV,
and the Pason LAS template. Diagnostic  writes nothing."""only 
from pathlib import Path
import pandas as pd

BASE = Path("data/interim/forge16b_78_32")
SURVEY_XLSX = BASE / "16B(78)-32 Well Survey" / "16B(78)-32 Final Survey Report.xlsx"
SURVEY_TXT = BASE / "16B(78)-32 Well Survey" / "16B(78)-32 Final Survey Report.txt"
PASON_CSV = BASE / "16B_Pason" / "10 Second Data.csv"
PASON_LAS = BASE / "16B_Pason" / "Drilling_template.las"
KPI_DIR = BASE / "16B_Pason" / "kpi_daily"
RIGDOWN_DIR = BASE / "16B_Pason" / "Rig_Down_&_Move"

def inspect_survey_xlsx():
    print("\n=== SURVEY XLSX ===")
    if not SURVEY_XLSX.exists():
        print("  NOT FOUND:", SURVEY_XLSX)
        return
    xl = pd.ExcelFile(SURVEY_XLSX)
    print("Sheets:", xl.sheet_names)
    for sheet in xl.sheet_names:
        df = xl.parse(sheet, nrows=8)
        pri        pri        pri        e         pri        primn        pri        pri        pri        e        ns        pri        pri        pri        e         pri        primn       if not SURVEY_TXT.exists():
        print("  NOT FOUND:", SURVEY_TXT)
        return
    with open(SURVEY_TXT, errors="ignore") as f:
        for _ in range(25):
            line = f.readline()
            if not line:
                break
            print(" ", line.rstrip())

def inspect_pason_csv():
    print("\n=== PASON 10-SECOND CSV ===")
    if not PASON_CSV.exists():
        print("  NOT FOUND:", PASON_CSV)
        return
    print("File size (MB):", round(PASON_CSV.stat().st_size / 1e6, 1))
    df = pd.read_csv(PASON_CSV, nrows=10, low_memory=Fal    df = pd.read_csv(PASON_CSV, n.columns))
    print(df.head(10).to_string())
    # count total rows without loading whole fi    # count total rows without loN_CSV, errors="ignore") as f:
        n        n        n      f)
    print("Approx total rows (incl. header):    print("Approx total rows (incl. header):    print("Approx total rows (incl. header):    print("Approx total rows (incl. header):    print("Approx total rows (incl. header):    print("Approx total rows (incl. header)ad(str(PASON_LAS))
        print("Curves:", [(c.mnemonic, c.unit, c.descr) for c in las.curves])
    except Exception as e:
        print("  lasio failed, showing raw head instead:", e)
        with open(PASON_LAS, errors="ignore") as f:
            for             for                      for             for          
def inspect_dir(path, label):
    print(f"\n=== {label} ({path}) ===")
    if not path.e    if not path.e    if not path.e    if not path.e    i files = sorted(path.rglob("*"))
    files = [f for f in files if f.is_file()]
    print(f"Total files: {len(files)}")
    for f in files[:8]:
                                                                                                                                                     t_survey_txt()
    inspect_pason_csv()
    inspect_pason_las()
    inspect_dir(KPI_DIR, "KPI_DAILY DIR")
    inspect_dir(RIGDOWN_DIR, "RIG_DOWN_&_MOVE DIR")

if __name__ == "__main__":
    main()
