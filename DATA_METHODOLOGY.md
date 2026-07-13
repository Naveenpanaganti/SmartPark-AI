# Data Methodology — ParkSmart Analytics Enhancement

## 1. Synthetic Data Generation

### Approach and Assumptions

ParkSmart has no pre-existing historical booking data, so a synthetic dataset is generated to simulate 30 days of realistic mall traffic. The generator (`backend/seed.js`) inserts records into both the `bookings` table and the `occupancy_snapshots` table.

**Core assumptions:**

| Assumption | Rationale |
|---|---|
| Malls follow weekday/weekend traffic patterns | Industry norm; weekend footfall is ~20–25% higher |
| Three daily peak windows | Matches observed mall patterns: morning commute, lunchtime, evening |
| Car slots fill faster than bike slots | Car ownership prevalence in the target market |
| Booking duration averages 90 minutes | Reasonable average shopping/dining visit |

**Traffic pattern constants:**

| Slot type | Weekday booking probability | Weekend booking probability |
|---|---|---|
| Car | 0.65 | 0.80 |
| Bike | 0.40 | 0.55 |

**Peak-hour multipliers** increase the booking probability within these windows:

| Window | Hours | Multiplier |
|---|---|---|
| Morning rush | 08:00–10:00 | ×1.4 |
| Lunch peak | 12:00–14:00 | ×1.3 |
| Evening peak | 17:00–20:00 | ×1.5 |

### Idempotency

The seed script is idempotent. Before inserting, it checks whether data already exists for each target date and floor level. Re-running the script does not produce duplicate records.

### Coverage

Every slot ID present in the `parking_slots` table at seed time is included in the generated dataset, ensuring no gaps in per-slot reporting.

---

## 2. Data Cleaning and Preprocessing Pipeline

The pipeline (`backend/pipeline.js`) runs as a standalone script (`npm run pipeline`) and applies four cleaning rules to the `occupancy_snapshots` table:

### Rule 1 — Deduplication

**What:** Remove snapshot rows that share an identical `(floor_level, recorded_at)` pair.  
**Why:** Duplicate timestamps can occur if the snapshot scheduler fires more than once within the same second (e.g., on server restart). Keeping duplicates would inflate occupancy averages.  
**Method:** A SQL `GROUP BY floor_level, recorded_at HAVING COUNT(*) > 1` query identifies duplicates; the highest `id` in each group is retained and all lower `id` duplicates are deleted.

### Rule 2 — Null record discard

**What:** Discard any snapshot where `total_slots`, `booked_slots`, or `available_slots` is NULL.  
**Why:** NULL numeric values cannot participate in arithmetic; leaving them in would cause silent NaN propagation in averages and predictions.  
**Method:** A `WHERE total_slots IS NULL OR booked_slots IS NULL OR available_slots IS NULL` filter identifies affected rows. A counter `null_records_discarded` is incremented and the rows are deleted.

### Rule 3 — Invalid record exclusion

**What:** Exclude snapshots where `booked_slots > total_slots`.  
**Why:** This is a physical impossibility. Such rows indicate a data entry error or race condition and would produce occupancy rates > 100%, corrupting all downstream analytics.  
**Method:** These rows are flagged with a log entry (record ID, floor level, values) and deleted. The counter `invalid_records_removed` is incremented.

### Rule 4 — Outlier detection (3-sigma rule)

**What:** Flag snapshots whose `occupancy_rate` deviates more than 3 standard deviations from the per-hour mean.  
**Why:** The 3-sigma rule is the standard statistical definition of an outlier. It catches sensor glitches or booking anomalies while retaining genuine peak periods.  
**Method:**
1. Compute `mean` and `stddev` of `occupancy_rate` for each distinct `EXTRACT(HOUR FROM recorded_at)` value across all non-null, valid records.
2. For each snapshot, if `|occupancy_rate − mean| > 3 × stddev`, set `is_outlier = TRUE`.
3. Outlier records are **not deleted** — they remain in the table for audit purposes but are excluded from all analytics queries (`WHERE is_outlier = FALSE`).

---

## 3. Data Quality Verification

After each pipeline run, a JSON report is persisted to the `pipeline_runs` table and printed to stdout:

```json
{
  "run_timestamp": "2024-06-01T10:00:00.000Z",
  "total_records_processed": 8640,
  "null_records_discarded": 3,
  "duplicate_records_removed": 12,
  "outliers_flagged": 47,
  "records_loaded": 8578
}
```

The relationship `records_loaded = total_records_processed − null_records_discarded − duplicate_records_removed` (outliers are flagged but still counted in `records_loaded`) can be verified manually to confirm the pipeline ran correctly.

**Additional verification steps performed during development:**

1. Ran `SELECT COUNT(*) FROM occupancy_snapshots WHERE booked_slots > total_slots` after pipeline — returned 0.
2. Ran `SELECT COUNT(*) FROM occupancy_snapshots WHERE is_outlier = TRUE` — matched `outliers_flagged` in the report.
3. Ran `SELECT floor_level, recorded_at, COUNT(*) FROM occupancy_snapshots GROUP BY floor_level, recorded_at HAVING COUNT(*) > 1` — returned 0 rows (no duplicates).
4. Seeded 30 days of data; verified `SELECT COUNT(*) FROM bookings` returned ≥ 2,000 records.

---

## 4. Prediction Model

The prediction engine (`backend/prediction.js`) uses a **weighted moving average (WMA)** over the past 14 days of historical snapshots for each hour of the day.

**Formula:**

```
WMA(h) = Σ(rate[d] × w[d]) / Σ(w[d])
```

Where:
- `h` = hour of day (0–23)
- `d` = number of days ago (d=1 is yesterday, d=14 is 14 days ago)
- `w[d] = 15 − d` (linear decay: yesterday gets weight 14, oldest day gets weight 1)

**Confidence interval:**

```
lower = max(0,   WMA − 1.96 × σ)
upper = min(100, WMA + 1.96 × σ)
```

Where `σ` = population standard deviation of the same hour's values across the 14-day window. This approximates a 95% CI under a normal distribution assumption.

**Fallback:** When fewer than 7 days of data exist for a given hour, the global mean occupancy rate for that hour is used and `low_confidence: true` is set on the prediction object.
