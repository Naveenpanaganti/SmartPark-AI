import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TIME_RANGE_HOURS = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };

export default function useAnalytics() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [heatmap, setHeatmap] = useState(Array.from({ length: 7 }, () => new Array(24).fill(0)));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataWarning, setDataWarning] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');

  const fetchAll = useCallback(async () => {
    try {
      const hours = TIME_RANGE_HOURS[timeRange] || 24;
      const [histRes, statsRes, predRes, heatRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/occupancy-history?hours=${hours}`),
        fetch(`${API_BASE}/analytics/stats`),
        fetch(`${API_BASE}/analytics/predictions`),
        fetch(`${API_BASE}/analytics/heatmap`),
      ]);
      const [histData, statsData, predData, heatData] = await Promise.all([
        histRes.json(), statsRes.json(), predRes.json(), heatRes.json()
      ]);
      setHistory(histData.data || []);
      setStats(statsData);
      setPredictions(predData.data || []);
      setHeatmap(heatData.data || Array.from({ length: 7 }, () => new Array(24).fill(0)));
      setDataWarning(
        histData.data_warning ||
        statsData.data_warning ||
        predData.data_warning ||
        heatData.data_warning ||
        null
      );
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { history, stats, predictions, heatmap, loading, error, dataWarning, timeRange, setTimeRange };
}
