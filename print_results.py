#!/usr/bin/env python3
"""Print the final XGBoost A1 and LightGBM A1 results summary."""

print("\n" + "="*80)
print("FINAL RESULTS: XGBoost A1 and LightGBM A1 vs Random Forest")
print("="*80)

print("\n📊 MACRO F1 (12 classes) - Primary Metric")
print("-"*80)
models = [
    ("RF A1", 0.4529, 0.3027, 1),
    ("XGB A1", 0.4023, 0.2370, 2),
    ("RF A0", 0.3609, 0.2332, 3),
    ("XGB A0", 0.3288, 0.1904, 4),
    ("LGBM A0", 0.2948, 0.1646, 5),
    ("LGBM A1", 0.2292, 0.1635, 6),
]
print(f"{'Rank':<6} {'Model':<12} {'hidden_test':>12} {'leader_test':>12} {'Mean':>8}")
print("-"*80)
for name, h, l, rank in models:
    mean = (h + l) / 2
    emoji = "🏆" if rank == 1 else "✅" if rank <= 3 else "⚠️"
    print(f"{rank:<6} {name:<12} {h:>12.4f} {l:>12.4f} {mean:>8.4f} {emoji}")
print("-"*80)

print("\n📈 FEATURE IMPROVEMENT (A0 → A1)")
print("-"*80)
improvements = [
    ("RF", 0.0920, 0.0695, "✅ STRONG"),
    ("XGB", 0.0735, 0.0465, "✅ MODERATE"),
    ("LGBM", -0.0657, -0.0011, "❌ DEGRADED"),
]
print(f"{'Model':<8} {'Hidden Δ':>12} {'Leader Δ':>12}   {'Status'}")
print("-"*80)
for model, h, l, status in improvements:
    print(f"{model:<8} {h:>+12.4f} {l:>+12.4f}   {status}")
print("-"*80)

print("\n🎯 KEY FINDINGS")
print("-"*80)
findings = [
    "✅ RF A1 is the STRONGEST model (macro F1: 0.4529 / 0.3027)",
    "✅ A1 feature set IMPROVES RF (+0.092 / +0.070)",
    "✅ A1 feature set IMPROVES XGBoost (+0.074 / +0.047)",
    "❌ A1 feature set DEGRADES LightGBM (-0.066 / -0.001)",
    "❌ XGBoost A1 does NOT beat RF A1 (-0.051 / -0.066)",
    "❌ LightGBM A1 does NOT beat RF A1 (-0.224 / -0.139)",
    "🏆 RF A1 wins 8 of 11 classes (best on rare: Coal F1 0.75)",
]
for f in findings:
    print(f)
print("-"*80)

print("\n🔥 RECOMMENDATION: Proceed with RF A1 to CNN stage")
print("="*80 + "\n")
