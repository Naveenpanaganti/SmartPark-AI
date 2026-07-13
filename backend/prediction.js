'use strict';

/**
 * Computes population standard deviation of an array of numbers.
 * Returns 0 if array has fewer than 2 elements.
 */
function computePopStddev(samples) {
  if (samples.length < 2) return 0;
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
  const variance = samples.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / samples.length;
  return Math.sqrt(variance);
}

/**
 * Computes weighted moving average.
 * samples: array ordered from most-recent (index 0) to oldest (index n-1)
 * weight for index i (0-based) = (samples.length + 1) - (i + 1) = samples.length - i
 * e.g. for 14 samples: w[0]=14, w[1]=13, ... w[13]=1
 */
function computeWMA(samples) {
  if (samples.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < samples.length; i++) {
    const weight = samples.length - i;
    weightedSum += samples[i] * weight;
    totalWeight += weight;
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

/**
 * Gets predictions for a target date using a 14-day weighted moving average.
 * @param {import('pg').Pool} pool
 * @param {string|null} targetDate - ISO date string e.g. "2024-01-15", defaults to tomorrow
 * @returns {Promise<{ predictions: Prediction[], mae_yesterday: number|null }>}
 */
async function getPredictions(pool, targetDate) {
  // Default to tomorrow
  const target = targetDate
    ? new Date(targetDate)
    : (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })();

  const predictions = [];

  // Get global mean for fallback
  const globalResult = await pool.query(`
    SELECT EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC')::INTEGER AS hour,
           AVG(occupancy_rate) AS global_mean
    FROM occupancy_snapshots
    WHERE is_outlier = FALSE
    GROUP BY EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC')
  `);
  const globalMeanByHour = {};
  for (const row of globalResult.rows) {
    globalMeanByHour[row.hour] = parseFloat(row.global_mean);
  }
  const overallGlobalMean = globalResult.rows.length > 0
    ? globalResult.rows.reduce((s, r) => s + parseFloat(r.global_mean), 0) / globalResult.rows.length
    : 0;

  for (let h = 0; h < 24; h++) {
    // Get past 14 days of avg occupancy_rate for this hour
    const histResult = await pool.query(`
      SELECT DATE(recorded_at AT TIME ZONE 'UTC') AS day,
             AVG(occupancy_rate) AS avg_rate
      FROM occupancy_snapshots
      WHERE EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC') = $1
        AND recorded_at >= NOW() - INTERVAL '14 days'
        AND is_outlier = FALSE
      GROUP BY DATE(recorded_at AT TIME ZONE 'UTC')
      ORDER BY day DESC
    `, [h]);

    const samples = histResult.rows.map(r => parseFloat(r.avg_rate));
    const low_confidence = samples.length < 7;

    let predicted_occupancy_rate;
    if (samples.length === 0) {
      predicted_occupancy_rate = globalMeanByHour[h] ?? overallGlobalMean;
    } else {
      predicted_occupancy_rate = computeWMA(samples);
      if (low_confidence && samples.length === 0) {
        predicted_occupancy_rate = globalMeanByHour[h] ?? overallGlobalMean;
      }
    }

    const stddev = computePopStddev(samples);
    const margin = 1.96 * stddev;
    const confidence_lower = Math.max(0, predicted_occupancy_rate - margin);
    const confidence_upper = Math.min(100, predicted_occupancy_rate + margin);

    predictions.push({
      hour: h,
      predicted_occupancy_rate: Math.round(predicted_occupancy_rate * 100) / 100,
      confidence_lower: Math.round(confidence_lower * 100) / 100,
      confidence_upper: Math.round(confidence_upper * 100) / 100,
      is_peak: predicted_occupancy_rate >= 70,
      low_confidence,
    });
  }

  // Compute MAE for yesterday
  let mae_yesterday = null;
  try {
    const yesterdayResult = await pool.query(`
      SELECT EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC')::INTEGER AS hour,
             AVG(occupancy_rate) AS actual_rate
      FROM occupancy_snapshots
      WHERE DATE(recorded_at AT TIME ZONE 'UTC') = CURRENT_DATE - 1
        AND is_outlier = FALSE
      GROUP BY EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC')
    `);
    if (yesterdayResult.rows.length > 0) {
      // Get yesterday's predictions (run same logic for yesterday)
      const yesterdayPreds = await getPredictionsForDate(pool, new Date(Date.now() - 86400000));
      let totalError = 0;
      let count = 0;
      for (const actual of yesterdayResult.rows) {
        const pred = yesterdayPreds.find(p => p.hour === actual.hour);
        if (pred) {
          totalError += Math.abs(pred.predicted_occupancy_rate - parseFloat(actual.actual_rate));
          count++;
        }
      }
      mae_yesterday = count > 0 ? Math.round((totalError / count) * 100) / 100 : null;
    }
  } catch (_) {
    mae_yesterday = null;
  }

  return { predictions, mae_yesterday };
}

// Internal helper to avoid infinite recursion — runs prediction without MAE
async function getPredictionsForDate(pool, date) {
  const globalResult = await pool.query(`
    SELECT EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC')::INTEGER AS hour,
           AVG(occupancy_rate) AS global_mean
    FROM occupancy_snapshots WHERE is_outlier = FALSE
    GROUP BY EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC')
  `);
  const globalMeanByHour = {};
  for (const row of globalResult.rows) globalMeanByHour[row.hour] = parseFloat(row.global_mean);
  const overallGlobalMean = globalResult.rows.length > 0
    ? globalResult.rows.reduce((s, r) => s + parseFloat(r.global_mean), 0) / globalResult.rows.length : 0;

  const preds = [];
  for (let h = 0; h < 24; h++) {
    const histResult = await pool.query(`
      SELECT AVG(occupancy_rate) AS avg_rate
      FROM occupancy_snapshots
      WHERE EXTRACT(HOUR FROM recorded_at AT TIME ZONE 'UTC') = $1
        AND recorded_at < $2
        AND recorded_at >= $2::TIMESTAMPTZ - INTERVAL '14 days'
        AND is_outlier = FALSE
      GROUP BY DATE(recorded_at AT TIME ZONE 'UTC')
      ORDER BY 1 DESC
    `, [h, date.toISOString()]);
    const samples = histResult.rows.map(r => parseFloat(r.avg_rate));
    const wma = samples.length > 0 ? computeWMA(samples) : (globalMeanByHour[h] ?? overallGlobalMean);
    preds.push({ hour: h, predicted_occupancy_rate: Math.round(wma * 100) / 100 });
  }
  return preds;
}

module.exports = { getPredictions, computeWMA, computePopStddev };
