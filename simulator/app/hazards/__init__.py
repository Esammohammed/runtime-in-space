"""Registry merging the four hazard modules into the flat lookups the
generator and scenario validation use.

Each hazard module (radiation, isolation, gravity, environment) owns a
disjoint set of indicators -- their noise/limits/decimals for the
generator -- plus the scenarios that mostly affect them, even when a
scenario's own effects reach into another hazard's indicators (dehydration,
for instance, touches heart_rate, hrv and skin_temp at once). A key
collision between modules is a real bug, not something to resolve quietly,
so merging fails loudly instead of letting one value silently win.
"""
from app.hazards import environment, gravity, isolation, radiation

MODULES = (radiation, isolation, gravity, environment)


def _merge_dicts(attr: str) -> dict:
    merged: dict = {}
    for module in MODULES:
        for key, value in getattr(module, attr).items():
            if key in merged:
                raise ValueError(f"{key!r} is claimed by more than one hazard module's {attr}")
            merged[key] = value
    return merged


def _merge_tuples(attr: str) -> tuple[str, ...]:
    seen: list[str] = []
    for module in MODULES:
        for indicator in getattr(module, attr):
            if indicator in seen:
                raise ValueError(f"{indicator!r} is claimed by more than one hazard module's {attr}")
            seen.append(indicator)
    return tuple(seen)


CONTINUOUS = _merge_tuples("CONTINUOUS")
DAILY = _merge_tuples("DAILY")
NOISE = _merge_dicts("NOISE")
LIMITS = _merge_dicts("LIMITS")
DECIMALS = _merge_dicts("DECIMALS")
DAY_SWING = _merge_dicts("DAY_SWING")
ALL_SCENARIOS = _merge_dicts("SCENARIOS")

# indicator id -> hazard tag, for the indicators.json <-> hazards consistency test.
HAZARD_OF = {indicator: module.HAZARD for module in MODULES for indicator in module.CONTINUOUS + module.DAILY}
