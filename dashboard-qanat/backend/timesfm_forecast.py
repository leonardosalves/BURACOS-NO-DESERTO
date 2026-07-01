#!/usr/bin/env python3
"""
TimesFM forecast bridge for Lumiera trend predictions.
Reads JSON from stdin, writes JSON to stdout (last line).
"""

from __future__ import annotations

import json
import sys
from typing import Any


def _read_input() -> dict[str, Any]:
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    return json.loads(raw)


def _emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False))


def _fallback_forecast(values: list[float], horizon: int) -> list[float]:
    import numpy as np

    arr = np.asarray(values, dtype=np.float64)
    if arr.size == 0:
        return [0.0] * horizon
    if arr.size == 1:
        return [float(arr[0])] * horizon

    x = np.arange(arr.size, dtype=np.float64)
    slope, intercept = np.polyfit(x, arr, 1)
    start = float(arr.size)
    preds = [max(0.0, float(intercept + slope * (start + i))) for i in range(horizon)]

    # Blend with recent EMA so flat series do not explode
    alpha = 0.35
    ema = float(arr[-1])
    for v in arr[-min(7, arr.size) :]:
        ema = alpha * float(v) + (1 - alpha) * ema
    preds = [max(0.0, 0.55 * p + 0.45 * ema) for p in preds]
    return preds


def _timesfm_forecast(series_list: list[list[float]], horizon: int, max_context: int) -> list[list[float]] | None:
    try:
        import numpy as np
        import timesfm
        import torch
    except ImportError:
        return None

    try:
        torch.set_float32_matmul_precision("high")
        model = timesfm.TimesFM_2p5_200M_torch.from_pretrained("google/timesfm-2.5-200m-pytorch")
        model.compile(
            timesfm.ForecastConfig(
                max_context=max_context,
                max_horizon=max(horizon, 32),
                normalize_inputs=True,
                use_continuous_quantile_head=False,
                force_flip_invariance=True,
                infer_is_positive=True,
                fix_quantile_crossing=True,
            )
        )
        inputs = []
        for values in series_list:
            arr = np.asarray(values, dtype=np.float64)
            if arr.size > max_context:
                arr = arr[-max_context:]
            if arr.size < 8:
                arr = np.pad(arr, (8 - arr.size, 0), mode="edge")
            inputs.append(arr)
        point_forecast, _ = model.forecast(horizon=horizon, inputs=inputs)
        return [list(map(float, row)) for row in point_forecast]
    except Exception:
        return None


def main() -> int:
    payload = _read_input()
    horizon = int(payload.get("horizon") or 7)
    horizon = max(1, min(horizon, 28))
    max_context = int(payload.get("maxContext") or payload.get("max_context") or 512)
    series = payload.get("series") or []

    if not series:
        _emit({"ok": False, "error": "Nenhuma série temporal informada."})
        return 1

    cleaned: list[dict[str, Any]] = []
    value_lists: list[list[float]] = []
    for item in series:
        sid = str(item.get("id") or item.get("label") or "series")
        label = str(item.get("label") or sid)
        raw_values = item.get("values") or item.get("points") or []
        values: list[float] = []
        for v in raw_values:
            if isinstance(v, dict):
                values.append(max(0.0, float(v.get("views") or v.get("value") or 0)))
            else:
                values.append(max(0.0, float(v or 0)))
        if not values:
            values = [0.0]
        cleaned.append({"id": sid, "label": label, "values": values})
        value_lists.append(values)

    engine = "fallback"
    forecasts: list[list[float]] = []

    tfm_preds = _timesfm_forecast(value_lists, horizon, max_context)
    if tfm_preds is not None and len(tfm_preds) == len(value_lists):
        engine = "timesfm-2.5"
        forecasts = tfm_preds
    else:
        forecasts = [_fallback_forecast(v, horizon) for v in value_lists]

    results = []
    for meta, hist, pred in zip(cleaned, value_lists, forecasts):
        hist_sum = sum(hist[-7:]) or 0.0
        pred_sum = sum(pred) or 0.0
        last = hist[-1] if hist else 0.0
        growth_pct = ((pred_sum - hist_sum) / hist_sum * 100.0) if hist_sum > 0 else (100.0 if pred_sum > 0 else 0.0)
        results.append(
            {
                "id": meta["id"],
                "label": meta["label"],
                "history": hist,
                "forecast": pred,
                "historySum7d": round(hist_sum, 2),
                "forecastSum": round(pred_sum, 2),
                "lastValue": round(last, 2),
                "growthPct": round(growth_pct, 2),
            }
        )

    _emit(
        {
            "ok": True,
            "engine": engine,
            "horizon": horizon,
            "results": results,
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())