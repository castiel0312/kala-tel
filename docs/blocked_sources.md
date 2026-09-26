# Sources NOT ingested in this session — network-blocked, not rejected

This sandbox can only reach a fixed allowlist of domains (GitHub and a few package registries).
The following sources from the master list are real, valid, and worth pulling — they were **not**
skipped for quality reasons, they simply return `403` from this container's egress proxy. Run
these yourself from a normal machine/laptop with internet access.

| Source | Why it's blocked here | How to get it yourself |
|---|---|---|
| Equinor Volve (official release) | `equinor.com` not reachable; also now requires Databricks Marketplace auth anyway | Sign in to Databricks Marketplace via the link on equinor.com/energy/volve-data-sharing |
| Volve F-9A real-time drilling (Kaggle) | `kaggle.com` not reachable | `kaggle datasets download imranulhaquenoor/volve-dataset-well-f-9-a` (needs a free Kaggle API token) |
| Volve DDR dataset (Hugging Face) | `huggingface.co` not reachable | `pip install huggingface_hub` then `datasets.load_dataset("bengsoon/volve_daily_drilling_report")` |
| Utah FORGE 16B(78)-32, 78B-32, 56-32, 58-32 | `catalog.data.gov`, `data.amerigeoss.org`, `gdr.openei.org` not reachable | Open each catalog.data.gov / GDR link directly in a browser — all are plain HTTPS zip/PDF downloads, no login needed |
| FORCE 2020 well logs (Kaggle mirror) | `kaggle.com` not reachable | Kaggle search "FORCE 2020 well logs"; note the actual competition data is already in this package via the GitHub repo, so this mirror is redundant unless you specifically want the Kaggle packaging |
| BSEE Well database / Raw Data | `data.bsee.gov` not reachable | Browse https://www.data.bsee.gov/Main/Well.aspx directly — it's a query UI, no bulk file confirmed yet either way |
| NLOG Boreholes | `nlog.nl` not reachable | Browse https://www.nlog.nl/en/boreholes directly — web-UI export |
| DGH NDR (India) | `ndrdgh.gov.in` not reachable, also requires registration | Register at https://www.ndrdgh.gov.in/NDR/ — access approval is a manual/institutional process regardless of network |
| DataDRILL kick-detection data (Kaggle) | `kaggle.com` not reachable | Kaggle search "DataDRILL kick detection formation pressure" |
| XAI Drilling Dataset (Kaggle) | `kaggle.com` not reachable | Already flagged in a prior audit as wrong-domain (CNC/metal-machining drill-bit-wear data, not oil & gas) — skip it regardless of access |
| ahmedelbashir99/drilling-log-dataset, afrniomelo/3w-dataset, banlevan/oil-and-gas-production-data (Kaggle) | `kaggle.com` not reachable | Kaggle API once you have a token — low priority: 3w-dataset duplicates the GitHub `petrobras/3W` already in this package, and production-data is out of scope (production, not drilling) |

**Bottom line:** everything hosted on plain GitHub is now actually in this zip. Everything behind
Kaggle/Hugging Face/data.gov/NLOG/Databricks/DGH auth or web-UI-only access still needs to be
pulled by a human with a normal internet connection and, in some cases, a free account/API key.
