from prometheus_client import Histogram

analysis_risk_score_histogram = Histogram(
    "analysis_risk_score_histogram",
    "Risk score-like values captured by registry operations",
    buckets=(0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100),
)

simulation_duration_seconds = Histogram(
    "simulation_duration_seconds",
    "Duration in seconds for selected registry operations",
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5),
)
