import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Ensure backend root is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def generate_sample_dataset(output_path=None, num_records=4000, random_seed=42):
    """
    Generates a 4000-row synthetic urban traffic dataset with realistic temporal,
    spatial, meteorological, and congestion dynamics plus controlled anomalies.
    """
    np.random.seed(random_seed)

    if output_path is None:
        output_path = os.path.join(CURRENT_DIR, 'traffic_sample.csv')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    locations_config = {
        "Main St & 1st Ave": {
            "road_type": "Arterial",
            "lat": 37.7891,
            "lon": -122.4010,
            "base_volume": 80,
            "base_speed": 45,
            "speed_reduction": 22
        },
        "Highway 101 North": {
            "road_type": "Highway",
            "lat": 37.7749,
            "lon": -122.4194,
            "base_volume": 150,
            "base_speed": 75,
            "speed_reduction": 35
        },
        "Downtown Central": {
            "road_type": "Arterial",
            "lat": 37.7850,
            "lon": -122.4064,
            "base_volume": 85,
            "base_speed": 45,
            "speed_reduction": 24
        },
        "Airport Road": {
            "road_type": "Highway",
            "lat": 37.7212,
            "lon": -122.4080,
            "base_volume": 140,
            "base_speed": 75,
            "speed_reduction": 32
        },
        "University Blvd": {
            "road_type": "Collector",
            "lat": 37.7650,
            "lon": -122.4500,
            "base_volume": 55,
            "base_speed": 38,
            "speed_reduction": 18
        },
        "Industrial Zone": {
            "road_type": "Local",
            "lat": 37.7410,
            "lon": -122.4350,
            "base_volume": 32,
            "base_speed": 30,
            "speed_reduction": 12
        },
        "Riverside Drive": {
            "road_type": "Local",
            "lat": 37.7520,
            "lon": -122.4700,
            "base_volume": 28,
            "base_speed": 30,
            "speed_reduction": 11
        },
        "Shopping District": {
            "road_type": "Collector",
            "lat": 37.7879,
            "lon": -122.4075,
            "base_volume": 60,
            "base_speed": 38,
            "speed_reduction": 20
        }
    }

    location_names = list(locations_config.keys())

    # Dynamic date range: from ~10 months ago up to today / current time
    now = datetime.now()
    end_date = datetime(now.year, now.month, now.day, now.hour, (now.minute // 15) * 15, 0)
    start_date = end_date - timedelta(days=300)
    total_seconds = int((end_date - start_date).total_seconds())

    # Generate 4000 timestamps aligned to 15-minute intervals
    random_offsets = np.random.randint(0, total_seconds // 900, size=num_records) * 900
    random_offsets.sort()

    timestamps = [start_date + timedelta(seconds=int(offset)) for offset in random_offsets]

    # Weather distribution: Clear 45%, Cloudy 25%, Rainy 20%, Foggy 7%, Stormy 3%
    weather_choices = ["Clear", "Cloudy", "Rainy", "Foggy", "Stormy"]
    weather_probs = [0.45, 0.25, 0.20, 0.07, 0.03]
    weathers = np.random.choice(weather_choices, size=num_records, p=weather_probs)

    # Locations assigned randomly across records
    loc_indices = np.random.randint(0, len(location_names), size=num_records)

    # Select 50 anomaly rows
    anomaly_indices = set(np.random.choice(num_records, size=50, replace=False))

    records = []
    for i in range(num_records):
        ts = timestamps[i]
        date_str = ts.strftime('%Y-%m-%d')
        time_str = ts.strftime('%H:%M')
        timestamp_str = ts.strftime('%Y-%m-%d %H:%M:%S')
        day_of_week = ts.strftime('%A')
        hour = ts.hour
        is_weekend = ts.weekday() >= 5

        loc_name = location_names[loc_indices[i]]
        loc_cfg = locations_config[loc_name]

        # Latitude & Longitude with small variation (±0.001)
        lat = round(loc_cfg["lat"] + np.random.uniform(-0.0015, 0.0015), 5)
        lon = round(loc_cfg["lon"] + np.random.uniform(-0.0015, 0.0015), 5)

        base_vol = loc_cfg["base_volume"]
        vol_multiplier = 1.0

        # Weekday rush hours
        if not is_weekend:
            if 7 <= hour <= 9:
                vol_multiplier += 0.60
            elif 17 <= hour <= 19:
                vol_multiplier += 0.55
        else:
            vol_multiplier -= 0.20

        # Night time (11 PM - 5 AM)
        if hour >= 23 or hour <= 5:
            vol_multiplier -= 0.70

        weather_val = weathers[i]
        speed_weather_factor = 1.0

        if weather_val == "Rainy":
            vol_multiplier += 0.10
            speed_weather_factor = 0.85
        elif weather_val == "Stormy":
            vol_multiplier += 0.05
            speed_weather_factor = 0.70

        # Apply noise
        noise_vol = np.random.normal(0, 4)
        traffic_vol = int(max(5, round(base_vol * max(0.2, vol_multiplier) + noise_vol)))

        # Average speed formula
        base_speed = loc_cfg["base_speed"]
        reduction_rate = loc_cfg["speed_reduction"]
        noise_speed = np.random.normal(0, 2.5)

        computed_speed = (base_speed - (traffic_vol / base_vol) * reduction_rate + noise_speed) * speed_weather_factor
        avg_speed = round(max(15.0, computed_speed), 1)

        # Temperature: seasonal curve (cooler in Jan/Dec ~48F, warmer in Jul/Aug ~72F in SF)
        day_of_year = ts.timetuple().tm_yday
        seasonal_temp = 58.0 + 12.0 * np.sin((day_of_year - 100) * 2 * np.pi / 365.0)
        # Weather impact on temp
        if weather_val in ["Rainy", "Stormy"]:
            seasonal_temp -= np.random.uniform(4.0, 7.0)
        temp_val = round(seasonal_temp + np.random.normal(0, 2.0), 1)

        is_anomaly = i in anomaly_indices
        if is_anomaly:
            # 3-5x normal volume
            traffic_vol = int(round(traffic_vol * np.random.uniform(3.0, 5.0)))
            # Extreme low speed (< 10) or high speed (> 90)
            if np.random.rand() > 0.4:
                avg_speed = round(np.random.uniform(3.0, 9.5), 1)
            else:
                avg_speed = round(np.random.uniform(92.0, 105.0), 1)

        # Congestion level rules:
        # High: volume >= 120 AND speed <= 25, OR volume >= 150 (any speed)
        # Medium: (volume >= 70 AND speed <= 40) OR (volume >= 100 AND speed <= 50)
        # Low: all others
        if traffic_vol >= 150 or (traffic_vol >= 120 and avg_speed <= 25):
            congestion = "High"
        elif (traffic_vol >= 70 and avg_speed <= 40) or (traffic_vol >= 100 and avg_speed <= 50):
            congestion = "Medium"
        else:
            congestion = "Low"

        records.append({
            "record_id": i + 1,
            "date": date_str,
            "time": time_str,
            "timestamp": timestamp_str,
            "location": loc_name,
            "road_name": loc_name,
            "road_type": loc_cfg["road_type"],
            "latitude": lat,
            "longitude": lon,
            "traffic_volume": traffic_vol,
            "average_speed": avg_speed,
            "weather": weather_val,
            "temperature": temp_val,
            "congestion_level": congestion,
            "is_anomaly": is_anomaly,
            "day_of_week": day_of_week,
            "hour": hour,
            "is_sample": True
        })

    df = pd.DataFrame(records)
    df.to_csv(output_path, index=False)
    print(f"Sample dataset generated successfully at: {output_path} ({len(df)} records)")

    # Auto-register sample dataset in database if possible
    try:
        from config import Config
        from database.db import db, create_all_tables
        from database.models import Dataset
        from flask import Flask

        app = Flask(__name__)
        app.config.from_object(Config)
        db.init_app(app)
        create_all_tables(app)

        with app.app_context():
            existing = Dataset.query.filter_by(filename='traffic_sample.csv').first()
            cols = list(df.columns)
            mapping = {col: col for col in cols}

            if not existing:
                dataset = Dataset(
                    name="San Francisco Urban Traffic Sample",
                    filename="traffic_sample.csv",
                    filepath=output_path,
                    record_count=len(df),
                    is_active=True,
                    is_sample=True
                )
                dataset.set_column_names(cols)
                dataset.set_column_mapping(mapping)
                db.session.add(dataset)
                db.session.commit()
                print(f"Sample dataset auto-registered in database with ID: {dataset.id}")
            else:
                existing.filepath = output_path
                existing.record_count = len(df)
                existing.is_active = True
                existing.preprocessed_filepath = None
                existing.status = 'ready'
                existing.set_column_names(cols)
                existing.set_column_mapping(mapping)
                db.session.commit()
                print(f"Sample dataset updated in database with ID: {existing.id}")
    except Exception as e:
        print(f"Notice: Database auto-registration skipped or failed ({str(e)}). Dataset CSV is created.")

    return output_path


if __name__ == '__main__':
    generate_sample_dataset()
