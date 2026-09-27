#!/usr/bin/env python3
"""Draft a private LCM reference grid from observed communal contracts.

This is an analytical estimate, never a published tariff. Review exceptions,
coverage, and suggested prices before activating a commercial version.
"""

import argparse
import csv
import json
import math
import re
import statistics
import subprocess
from collections import defaultdict
from pathlib import Path
from openpyxl import load_workbook


def price(text):
    try:
        return float(text.replace("'", "").replace(" ", "").strip())
    except ValueError:
        return None


def population(text):
    match = re.search(r"([\d '\u2019]+)\s*habitants?", text, flags=re.I)
    return int(re.sub(r"\D", "", match.group(1))) if match else None


def excluded_reason(row):
    if row["Type partenaire"] != "Commune":
        return "not a single commune"
    label = row["Référence secondaire"]
    if label not in ("SUP-LCM Gold", "SUP-LCM Platinium"):
        return "different LCM plan"
    if not population(row["Description"]):
        return "population missing"
    if price(row["Prix période initiale"]) is None:
        return "price missing"
    combined = (row["Texte libre 2"] + " " + row["Description"]).lower()
    exceptions = ("gold+", "complément", "ajout des modules", "support annuel",
                  "régio", "même instance", "eadmin", "ged", "caisses",
                  "salaires ascl", "pce", "uniquement hébergement")
    if any(word in combined for word in exceptions):
        return "special scope or supplement"
    return None


def robust_curve(observations):
    pairs = [(x["population"], x["price"]) for x in observations]
    slopes = [math.log(pb / pa) / math.log(b / a)
              for a, pa in pairs for b, pb in pairs if b >= a * 1.5 and pa > 0 and pb > 0]
    if not slopes:
        raise ValueError("Too few comparable contracts for an LCM curve")
    exponent = max(0, min(1.5, statistics.median(slopes)))
    factor = statistics.median(value / pop ** exponent for pop, value in pairs)
    errors = [abs(math.log(value / (factor * pop ** exponent)))
              for pop, value in pairs]
    errors.sort()
    return exponent, factor, errors[math.ceil(len(errors) * .8) - 1]


def fribourg_anchor(path):
    workbook = load_workbook(path, read_only=True, data_only=True)
    sheet = workbook["Modules"]
    population_value = workbook["Licences&Presta"]["D3"].value
    amount = sheet["M77"].value
    if not isinstance(population_value, (int, float)) or not isinstance(amount, (int, float)):
        raise ValueError("Fribourg offer anchor not found at expected cells")
    return {"population": int(population_value), "price": float(amount),
            "source": f"{path.name}:Modules!M77"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("contracts", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--fribourg", type=Path,
                        help="Optional actual Fribourg offer Gold anchor; outside Git")
    parser.add_argument("--max-population", type=int, default=40000)
    args = parser.parse_args()
    root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"],
        cwd=Path(__file__).parent, text=True).strip()).resolve()
    if args.out.resolve() == root or root in args.out.resolve().parents:
        parser.error("Private LCM output must be outside the Git checkout")
    with args.contracts.open(newline="") as stream:
        rows = list(csv.DictReader(stream, delimiter="\t"))
    samples = defaultdict(list)
    rejected = defaultdict(int)
    for row in rows:
        reason = excluded_reason(row)
        if reason:
            rejected[reason] += 1
            continue
        block = ((population(row["Description"]) - 1) // 5000 + 1) * 5000
        key = "gold" if row["Référence secondaire"].endswith("Gold") else "platinium"
        samples[(key, block)].append({"commune": row["Nom pour PrimeSheet"],
            "contract": row["Numéro de contrat"],
            "price": price(row["Prix période initiale"]),
            "population": population(row["Description"])})
    reference = fribourg_anchor(args.fribourg) if args.fribourg else None
    entries = {}
    for key in ("gold", "platinium"):
        observations = [item for (name, _), group in samples.items()
                        if name == key for item in group]
        exponent, factor, error = robust_curve(observations)
        entries[key] = {"exponent": exponent, "factor": factor,
                        "error_80pct_log": error}
    grid = []
    for block in range(5000, args.max_population + 1, 5000):
        entry = {"up_to": block, "status": "draft_unapproved"}
        for key in ("gold", "platinium"):
            fit = entries[key]["factor"] * block ** entries[key]["exponent"]
            sample = samples.get((key, block), [])
            # Only bands with several contracts anchor the curve directly.
            # One exceptional contract can be far from the intended standard.
            value = statistics.median(x["price"] for x in sample) if len(sample) >= 2 else fit
            method = "observed_median" if len(sample) >= 2 else (
                "model_interpolated" if block <= max(
                    b for name, b in samples if name == key) else "model_extrapolated")
            if key == "gold" and reference and block >= 15000:
                start, end = 15000, reference["population"]
                if end > start:
                    base = entries[key]["factor"] * start ** entries[key]["exponent"]
                    slope = (reference["price"] - base) / (end - start)
                    value = base + slope * (block - start)
                    method = "offer_interpolated" if block <= end else "offer_extrapolated"
            entry[key] = None if value is None else round(value / 500) * 500
            entry[f"{key}_evidence"] = {"method": method, "sample_size": len(sample),
                "raw_band_median": statistics.median(x["price"] for x in sample)
                    if sample else None,
                "contracts": [item["contract"] for item in sample],
                "model_80pct_error_factor": round(math.exp(entries[key]["error_80pct_log"]), 3),
                "offer_anchor": reference if key == "gold" and reference else None,
                "range": ([min(x["price"] for x in sample),
                           max(x["price"] for x in sample)] if sample else None)}
        grid.append(entry)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"status": "draft_unapproved",
        "source": args.contracts.name,
        "excluded_by_reason": rejected,
        "method": "robust log population fit; multi-contract bands; optional offer anchor",
        "included_contracts": {key: sum(len(v) for (plan, _), v in samples.items()
                                   if plan == key) for key in ("gold", "platinium")},
        "grid": grid}, ensure_ascii=False, indent=2) + "\n")
    print("Draft only: ", len(grid), "blocks; evidence:",
          {key: sum(len(v) for (plan, _), v in samples.items() if plan == key)
           for key in ("gold", "platinium")})


if __name__ == "__main__":
    main()
