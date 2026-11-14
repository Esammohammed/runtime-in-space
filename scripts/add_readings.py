import argparse
import random
from datetime import datetime, timedelta, timezone
import httpx

def generate_and_send(crew_id: int = 1, indicator: str = "heart_rate", average: float = 60.0, count: int = 20, step_minutes: int = 15, std_dev: float = 2.0):
    now = datetime.now(timezone.utc)
    readings = []
    
    # Generate realistic values around target average
    values = [round(random.gauss(average, std_dev)) for _ in range(count)]
    
    # Adjust slightly if mean drifted due to randomness
    mean_diff = average - (sum(values) / len(values))
    values = [round(v + mean_diff) for v in values]
    
    print(f"-> Generating {count} readings for Crew {crew_id}:")
    print(f"   Indicator: {indicator}")
    print(f"   Values: {values}")
    print(f"   Actual Mean: {sum(values) / len(values):.1f}")

    for i, val in enumerate(values):
        ts = (now - timedelta(minutes=(count - i) * step_minutes)).strftime("%Y-%m-%dT%H:%M:%SZ")
        readings.append({
            "crew_id": crew_id,
            "timestamp": ts,
            "source": "simulator",
            "values": {indicator: float(val)}
        })

    with httpx.Client(base_url="http://127.0.0.1:8000", timeout=15.0) as client:
        # Use /readings/bulk for batch insertion
        resp = client.post("/readings/bulk", json={"readings": readings})
        resp.raise_for_status()
        print(f"✓ Successfully sent {resp.json().get('stored', len(readings))} readings to Core API.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inject readings around an average value for any crew member.")
    parser.add_argument("--crew", type=int, default=1, help="Crew member ID (1, 2, 3, 4)")
    parser.add_argument("--indicator", type=str, default="heart_rate", help="Indicator name (e.g. heart_rate, spo2)")
    parser.add_argument("--avg", type=float, default=60.0, help="Target average value")
    parser.add_argument("--count", type=int, default=20, help="Number of points to generate")
    parser.add_argument("--step-minutes", type=int, default=15, help="Minutes between readings")

    args = parser.parse_args()
    generate_and_send(
        crew_id=args.crew,
        indicator=args.indicator,
        average=args.avg,
        count=args.count,
        step_minutes=args.step_minutes
    )
