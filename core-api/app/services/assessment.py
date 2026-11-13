"""Status rules: a reading plus limits from the content file gives a colour.

There is no AI here on purpose. The rules are easy to read and easy to defend.
"""
ORDER = {"green": 0, "yellow": 1, "red": 2}


def assess(definition: dict, value: float, baseline: float | None = None) -> tuple[str, str]:
    """Return (status, reason) for one value of one indicator."""
    green_low, green_high = definition["green"]
    yellow_low, yellow_high = definition["yellow"]
    unit = definition.get("unit", "")

    if value < yellow_low or value > yellow_high:
        side = "below" if value < yellow_low else "above"
        return "red", f"{value:g} {unit} is {side} the watch range {yellow_low:g} to {yellow_high:g}"

    if value < green_low or value > green_high:
        side = "below" if value < green_low else "above"
        return "yellow", f"{value:g} {unit} is {side} the normal range {green_low:g} to {green_high:g}"

    tolerance = definition.get("baseline_tolerance_pct")
    if tolerance and baseline:
        diff_pct = (value - baseline) / baseline * 100
        if abs(diff_pct) > tolerance:
            side = "above" if diff_pct > 0 else "below"
            return "yellow", f"{abs(diff_pct):.0f}% {side} your baseline of {baseline:g}"

    return "green", "Within the normal range"


def worst(statuses: list[str]) -> str | None:
    """The most serious status in a list, or None for an empty list."""
    known = [s for s in statuses if s in ORDER]
    return max(known, key=ORDER.get) if known else None
