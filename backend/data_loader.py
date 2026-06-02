"""
Load Oman_Ethnomedicinal_Merged.csv into a normalized SQLite database.

Schema:
  plants          – one row per unique plant
  compounds       – unique phytochemical compounds
  plant_compounds – many-to-many plant ↔ compound
  conditions      – diseases / conditions extracted from traditional_use
  plant_conditions– many-to-many plant ↔ condition
"""

import csv
import re
import sqlite3
from pathlib import Path

CSV_PATH = Path.home() / "Downloads" / "Oman_Ethnomedicinal_Merged.csv"
DB_PATH = Path(__file__).parent / "omani_ethno.db"

# ---------------------------------------------------------------------------
# Disease/condition keyword extraction
# ---------------------------------------------------------------------------
CONDITION_KEYWORDS = [
    "diabetes", "diabetic",
    "asthma", "respiratory",
    "skin rash", "skin rashes", "skin disease", "skin disorder", "skin allerg", "skin ailment", "skin infection",
    "wound", "wound healing", "wounds",
    "fever", "febrile",
    "inflammation", "inflammatory", "anti-inflammatory",
    "constipation",
    "diarrhea", "diarrhoea", "dysentery",
    "malaria",
    "hypertension", "blood pressure",
    "pain", "analgesic", "stomachache", "stomach pain", "stomach ache", "stomach ailment",
    "headache", "head ache",
    "toothache", "tooth pain",
    "earache", "ear infection",
    "liver", "liver disease", "liver ailment", "jaundice", "hepatitis",
    "kidney",
    "urinary tract", "urinary infection",
    "bleeding", "haemorrhage", "hemorrhage",
    "ulcer", "ulcers",
    "cancer", "tumor", "tumour",
    "anxiety", "depression",
    "antimicrobial", "antibacterial", "antifungal", "antiviral", "antiseptic", "disinfectant",
    "antioxidant",
    "diuretic",
    "laxative",
    "expectorant",
    "tonic",
    "rheumatism", "arthritis",
    "edema", "oedema", "swelling",
    "piles", "hemorrhoids",
    "worms", "worm infection", "anthelmintic",
    "scorpion", "snake bite", "insect bite",
    "digestive", "digestion", "indigestion", "gastritis", "gastric",
    "appetite",
    "nausea", "vomiting",
    "dizziness",
    "eye", "vision", "conjunctivitis",
    "gum", "gum infection",
    "acne", "pimple", "pimples",
    "allergy", "allergies",
    "fracture", "bone",
    "menstrual", "menstruation",
    "antidiabetic",
    "antihypertensive",
    "antileishmanial",
    "antimalarial",
]

# Canonical form mapping
CANONICAL = {
    "skin rash": "Skin disorders",
    "skin rashes": "Skin disorders",
    "skin disease": "Skin disorders",
    "skin disorder": "Skin disorders",
    "skin allerg": "Skin disorders",
    "skin ailment": "Skin disorders",
    "skin infection": "Skin disorders",
    "diabetic": "Diabetes",
    "diabetes": "Diabetes",
    "antidiabetic": "Diabetes",
    "febrile": "Fever",
    "fever": "Fever",
    "inflammatory": "Inflammation",
    "inflammation": "Inflammation",
    "anti-inflammatory": "Inflammation",
    "diarrhoea": "Diarrhea",
    "diarrhea": "Diarrhea",
    "dysentery": "Diarrhea",
    "blood pressure": "Hypertension",
    "hypertension": "Hypertension",
    "antihypertensive": "Hypertension",
    "stomachache": "Stomach ailments",
    "stomach pain": "Stomach ailments",
    "stomach ache": "Stomach ailments",
    "stomach ailment": "Stomach ailments",
    "digestive": "Digestive disorders",
    "digestion": "Digestive disorders",
    "indigestion": "Digestive disorders",
    "gastritis": "Digestive disorders",
    "gastric": "Digestive disorders",
    "wound": "Wound healing",
    "wound healing": "Wound healing",
    "wounds": "Wound healing",
    "bleeding": "Bleeding / Hemorrhage",
    "haemorrhage": "Bleeding / Hemorrhage",
    "hemorrhage": "Bleeding / Hemorrhage",
    "liver disease": "Liver diseases",
    "liver ailment": "Liver diseases",
    "liver": "Liver diseases",
    "jaundice": "Liver diseases",
    "hepatitis": "Liver diseases",
    "worm infection": "Parasitic infections",
    "worms": "Parasitic infections",
    "anthelmintic": "Parasitic infections",
    "antimicrobial": "Antimicrobial",
    "antibacterial": "Antimicrobial",
    "antifungal": "Antimicrobial",
    "antiviral": "Antimicrobial",
    "antiseptic": "Antimicrobial",
    "disinfectant": "Antimicrobial",
    "scorpion": "Bites & Stings",
    "snake bite": "Bites & Stings",
    "insect bite": "Bites & Stings",
    "edema": "Edema / Swelling",
    "oedema": "Edema / Swelling",
    "swelling": "Edema / Swelling",
    "piles": "Hemorrhoids",
    "hemorrhoids": "Hemorrhoids",
    "urinary tract": "Urinary disorders",
    "urinary infection": "Urinary disorders",
    "respiratory": "Respiratory disorders",
    "asthma": "Asthma",
    "headache": "Headache",
    "head ache": "Headache",
    "toothache": "Toothache",
    "tooth pain": "Toothache",
    "earache": "Ear infections",
    "ear infection": "Ear infections",
    "eye": "Eye disorders",
    "vision": "Eye disorders",
    "conjunctivitis": "Eye disorders",
    "gum": "Oral / Dental",
    "gum infection": "Oral / Dental",
    "pain": "Pain relief",
    "analgesic": "Pain relief",
    "acne": "Acne / Pimples",
    "pimple": "Acne / Pimples",
    "pimples": "Acne / Pimples",
    "cancer": "Cancer",
    "tumor": "Cancer",
    "tumour": "Cancer",
    "malaria": "Malaria",
    "antimalarial": "Malaria",
    "rheumatism": "Rheumatism / Arthritis",
    "arthritis": "Rheumatism / Arthritis",
    "nausea": "Nausea / Vomiting",
    "vomiting": "Nausea / Vomiting",
    "menstrual": "Menstrual disorders",
    "menstruation": "Menstrual disorders",
    "constipation": "Constipation",
    "laxative": "Constipation",
    "diuretic": "Diuretic uses",
    "antioxidant": "Antioxidant",
    "tonic": "General tonic",
    "appetite": "Appetite disorders",
    "anxiety": "Mental health",
    "depression": "Mental health",
    "dizziness": "Dizziness / Vertigo",
    "expectorant": "Cough / Expectorant",
    "allergy": "Allergy",
    "allergies": "Allergy",
    "kidney": "Kidney disorders",
    "ulcer": "Ulcers",
    "ulcers": "Ulcers",
    "fracture": "Bone / Fracture",
    "bone": "Bone / Fracture",
    "antileishmanial": "Leishmaniasis",
}


def extract_conditions(text: str) -> list[str]:
    """Extract canonical condition names from a free-text traditional_use string.

    Matching is anchored to a word *start* boundary (``\\b`` before the keyword)
    so inflections/plurals are still caught (wound -> wounds, allerg -> allergy)
    while mid-word false positives are rejected (deliver !-> liver,
    backbone !-> bone, hearing !-> ear).
    """
    text_lower = text.lower()
    found = set()
    for kw in CONDITION_KEYWORDS:
        if re.search(r"\b" + re.escape(kw), text_lower):
            canonical = CANONICAL.get(kw)
            if canonical:
                found.add(canonical)
            else:
                found.add(kw.capitalize())
    return sorted(found)


# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS plants (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    family      TEXT,
    scientific_name TEXT NOT NULL,
    local_name  TEXT,
    part_used   TEXT,
    traditional_use TEXT,
    source      TEXT,
    image_url   TEXT
);

CREATE TABLE IF NOT EXISTS compounds (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT UNIQUE NOT NULL,
    imppat_id   TEXT
);

CREATE TABLE IF NOT EXISTS plant_compounds (
    plant_id    INTEGER REFERENCES plants(id),
    compound_id INTEGER REFERENCES compounds(id),
    reference   TEXT,
    PRIMARY KEY (plant_id, compound_id)
);

CREATE TABLE IF NOT EXISTS conditions (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS plant_conditions (
    plant_id     INTEGER REFERENCES plants(id),
    condition_id INTEGER REFERENCES conditions(id),
    PRIMARY KEY (plant_id, condition_id)
);

CREATE INDEX IF NOT EXISTS idx_plants_family  ON plants(family);
CREATE INDEX IF NOT EXISTS idx_plants_sci     ON plants(scientific_name);
CREATE INDEX IF NOT EXISTS idx_compounds_name ON compounds(name);
"""


def build_db():
    # Remove stale DB
    if DB_PATH.exists():
        DB_PATH.unlink()

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.executescript(SCHEMA)

    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # ---- plants (aggregate the many CSV rows per plant) ----
    # The source CSV has one row per (plant, phytochemical), so a single plant
    # spans many rows whose `Traditional use` / `Part use` columns DIFFER.
    # We must merge every row's text — otherwise we silently drop the majority
    # of a plant's documented uses (and therefore its conditions).
    AGG_FIELDS = {
        "family": "Family",
        "local_name": "Local Name",
        "part_used": "Part use",
        "traditional_use": "Traditional use",
        "source": "Source",
    }
    plant_rows: dict[str, dict[str, list[str]]] = {}
    plant_order: list[str] = []

    for row in rows:
        sci = row["Plant Name"].strip()
        if not sci:
            continue
        if sci not in plant_rows:
            plant_rows[sci] = {k: [] for k in AGG_FIELDS}
            plant_order.append(sci)
        rec = plant_rows[sci]
        for key, col in AGG_FIELDS.items():
            val = (row.get(col) or "").strip()
            if val and val not in rec[key]:
                rec[key].append(val)

    plant_id_map: dict[str, int] = {}  # scientific_name → id

    for sci in plant_order:
        rec = plant_rows[sci]
        # family is a single taxonomic fact → first value; the rest are merged.
        family = rec["family"][0] if rec["family"] else None
        local_name = ", ".join(rec["local_name"]) or None
        part_used = "; ".join(rec["part_used"]) or None
        traditional_use = "; ".join(rec["traditional_use"]) or None
        source = "; ".join(rec["source"]) or None
        cur.execute(
            "INSERT INTO plants (family, scientific_name, local_name, part_used, traditional_use, source) "
            "VALUES (?,?,?,?,?,?)",
            (family, sci, local_name, part_used, traditional_use, source),
        )
        plant_id_map[sci] = cur.lastrowid

    # ---- compounds + plant_compounds ----
    compound_id_map: dict[str, int] = {}

    for row in rows:
        sci = row["Plant Name"].strip()
        if sci not in plant_id_map:
            continue
        plant_id = plant_id_map[sci]

        compound_name = row["Phytochemical name"].strip()
        if not compound_name:
            continue

        if compound_name not in compound_id_map:
            imppat = row["IMPPAT Phytochemical identifier"].strip() or None
            cur.execute(
                "INSERT OR IGNORE INTO compounds (name, imppat_id) VALUES (?,?)",
                (compound_name, imppat),
            )
            cur.execute("SELECT id FROM compounds WHERE name=?", (compound_name,))
            compound_id_map[compound_name] = cur.fetchone()[0]

        compound_id = compound_id_map[compound_name]
        ref = row["references"].strip() or None
        cur.execute(
            "INSERT OR IGNORE INTO plant_compounds (plant_id, compound_id, reference) VALUES (?,?,?)",
            (plant_id, compound_id, ref),
        )

    # ---- conditions + plant_conditions ----
    condition_id_map: dict[str, int] = {}

    for sci, plant_id in plant_id_map.items():
        cur.execute("SELECT traditional_use FROM plants WHERE id=?", (plant_id,))
        (trad_use,) = cur.fetchone()
        if not trad_use:
            continue
        for cond in extract_conditions(trad_use):
            if cond not in condition_id_map:
                cur.execute("INSERT OR IGNORE INTO conditions (name) VALUES (?)", (cond,))
                cur.execute("SELECT id FROM conditions WHERE name=?", (cond,))
                condition_id_map[cond] = cur.fetchone()[0]
            cur.execute(
                "INSERT OR IGNORE INTO plant_conditions (plant_id, condition_id) VALUES (?,?)",
                (plant_id, condition_id_map[cond]),
            )

    con.commit()
    con.close()

    print(f"DB built at {DB_PATH}")
    print(f"  Plants:    {len(plant_id_map)}")
    print(f"  Compounds: {len(compound_id_map)}")
    print(f"  Conditions: {len(condition_id_map)}")


if __name__ == "__main__":
    build_db()
