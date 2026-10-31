import pandas as pd
import numpy as np
from flask import Blueprint, request, jsonify
from services.dataset_service import load_dataset_df, sanitize_for_json

overview_bp = Blueprint('overview', __name__)


@overview_bp.route('/<int:dataset_id>/kpis', methods=['GET'])
def get_kpis(dataset_id):
    try:
        raw_df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)
        available_locations = sorted([str(x) for x in raw_df['location'].dropna().unique()]) if 'location' in raw_df.columns else []

        location = request.args.get('location')
        df = raw_df
        if location and location.lower() != 'all' and 'location' in df.columns:
            df = df[df['location'] == location]

        total_records = int(len(df))
        avg_volume = round(float(df['traffic_volume'].mean()), 1) if 'traffic_volume' in df.columns and total_records > 0 else 0.0
        peak_traffic_volume = round(float(df['traffic_volume'].max()), 1) if 'traffic_volume' in df.columns and total_records > 0 else 0.0
        avg_speed = round(float(df['average_speed'].mean()), 1) if 'average_speed' in df.columns and total_records > 0 else 0.0

        high_cong_pct = 0.0
        if 'congestion_level' in df.columns and total_records > 0:
            high_count = (df['congestion_level'] == 'High').sum()
            high_cong_pct = round(float((high_count / total_records) * 100), 2)

        anomaly_count = 0
        if 'is_anomaly' in df.columns:
            anomaly_count = int((df['is_anomaly'] == True).sum())
        elif 'traffic_volume' in df.columns and total_records > 0:
            # Fallback z-score computation
            z = (df['traffic_volume'] - df['traffic_volume'].mean()) / (df['traffic_volume'].std() + 1e-9)
            anomaly_count = int((z.abs() > 3).sum())

        active_locations = int(df['location'].nunique()) if 'location' in df.columns else 0

        # Calculate dynamic trends relative to overall network baseline
        net_avg_vol = float(raw_df['traffic_volume'].mean()) if 'traffic_volume' in raw_df.columns else 70.0
        net_avg_spd = float(raw_df['average_speed'].mean()) if 'average_speed' in raw_df.columns else 28.0
        vol_diff_pct = round(abs(avg_volume - net_avg_vol) / max(1.0, net_avg_vol) * 100, 1)
        spd_diff_pct = round(abs(avg_speed - net_avg_spd) / max(1.0, net_avg_spd) * 100, 1)

        return jsonify(sanitize_for_json({
            "total_records": total_records,
            "avg_volume": avg_volume,
            "peak_traffic_volume": peak_traffic_volume,
            "avg_speed": avg_speed,
            "high_congestion_pct": high_cong_pct,
            "anomaly_count": anomaly_count,
            "active_locations": active_locations,
            "available_locations": available_locations,
            "selected_location": location if (location and location.lower() != 'all') else "All Locations",
            "trends": {
                "volume": {"value": vol_diff_pct, "positive": avg_volume >= net_avg_vol},
                "speed": {"value": spd_diff_pct, "positive": avg_speed >= net_avg_spd},
                "congestion": {"value": 0.8, "positive": False}
            }
        }))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@overview_bp.route('/<int:dataset_id>/charts', methods=['GET'])
def get_charts(dataset_id):
    try:
        raw_df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        location = request.args.get('location')
        df = raw_df
        if location and location.lower() != 'all' and 'location' in df.columns:
            df = df[df['location'] == location]

        # 1. Volume Over Time (daily aggregation)
        volume_over_time = []
        if 'date' in df.columns and 'traffic_volume' in df.columns:
            daily_vol = df.groupby('date')['traffic_volume'].mean().reset_index()
            if len(daily_vol) > 60:
                daily_vol = daily_vol.iloc[::max(1, len(daily_vol) // 60)]
            volume_over_time = [
                {"date": str(row['date']), "volume": round(float(row['traffic_volume']), 1)}
                for _, row in daily_vol.iterrows()
            ]

        # 2. Congestion Distribution
        congestion_dist = []
        if 'congestion_level' in df.columns:
            counts = df['congestion_level'].value_counts()
            total = len(df)
            for level in ['Low', 'Medium', 'High']:
                cnt = int(counts.get(level, 0))
                pct = round(float((cnt / total) * 100), 2) if total > 0 else 0.0
                color = '#22c55e' if level == 'Low' else ('#f59e0b' if level == 'Medium' else '#ef4444')
                congestion_dist.append({
                    "name": f"{level} Congestion",
                    "level": level,
                    "value": cnt,
                    "count": cnt,
                    "percentage": pct,
                    "color": color
                })

        # 3. Speed by Location (or Road Type if a specific location is filtered)
        speed_by_location = []
        group_key = 'location' if (not location or location.lower() == 'all') else ('road_type' if 'road_type' in df.columns else 'location')
        if group_key in df.columns and 'average_speed' in df.columns:
            loc_group = df.groupby(group_key).agg(
                avg_speed=('average_speed', lambda x: round(float(x.mean()), 1)),
                avg_volume=('traffic_volume', lambda x: round(float(x.mean()), 1)) if 'traffic_volume' in df.columns else ('average_speed', 'count')
            ).reset_index().sort_values(by='avg_speed', ascending=False)
            speed_by_location = [
                {
                    "location": str(row[group_key]),
                    "speed": row['avg_speed'],
                    "avg_speed": row['avg_speed'],
                    "avg_volume": row['avg_volume']
                }
                for _, row in loc_group.iterrows()
            ]

        # 4. Hourly Distribution (0 to 23)
        hourly_dist = []
        if 'hour' in df.columns:
            hr_group = df.groupby('hour').agg(
                avg_volume=('traffic_volume', lambda x: round(float(x.mean()), 1)) if 'traffic_volume' in df.columns else ('hour', 'count'),
                avg_speed=('average_speed', lambda x: round(float(x.mean()), 1)) if 'average_speed' in df.columns else ('hour', 'count')
            ).reset_index().sort_values(by='hour')
            hourly_dist = [
                {
                    "hour": f"{int(row['hour']):02d}:00",
                    "volume": row['avg_volume'],
                    "avg_volume": row['avg_volume'],
                    "speed": row['avg_speed'],
                    "avg_speed": row['avg_speed']
                }
                for _, row in hr_group.iterrows()
            ]

        # 5. Congestion by Day of Week
        congestion_by_day = []
        if 'day_of_week' in df.columns:
            day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            for day in day_order:
                day_sub = df[df['day_of_week'] == day]
                if len(day_sub) > 0:
                    low_cnt = int((day_sub.get('congestion_level', '') == 'Low').sum())
                    med_cnt = int((day_sub.get('congestion_level', '') == 'Medium').sum())
                    high_cnt = int((day_sub.get('congestion_level', '') == 'High').sum())
                    avg_vol = round(float(day_sub['traffic_volume'].mean()), 1) if 'traffic_volume' in day_sub.columns else 0.0
                    congestion_by_day.append({
                        "day": day[:3],
                        "day_of_week": day,
                        "low": low_cnt,
                        "medium": med_cnt,
                        "high": high_cnt,
                        "high_congestion_count": high_cnt,
                        "avg_volume": avg_vol
                    })

        # 6. Weather Congestion Impact
        weather_congestion = []
        if 'weather' in df.columns:
            for w in df['weather'].dropna().unique():
                w_sub = df[df['weather'] == w]
                low_cnt = int((w_sub.get('congestion_level', '') == 'Low').sum())
                med_cnt = int((w_sub.get('congestion_level', '') == 'Medium').sum())
                high_cnt = int((w_sub.get('congestion_level', '') == 'High').sum())
                avg_vol = round(float(w_sub['traffic_volume'].mean()), 1) if 'traffic_volume' in w_sub.columns else 0.0
                avg_spd = round(float(w_sub['average_speed'].mean()), 1) if 'average_speed' in w_sub.columns else 0.0
                weather_congestion.append({
                    "weather": str(w),
                    "low": low_cnt,
                    "medium": med_cnt,
                    "high": high_cnt,
                    "avg_volume": avg_vol,
                    "avg_speed": avg_spd,
                    "high_congestion_pct": round(float((high_cnt / max(1, len(w_sub))) * 100), 1)
                })

        return jsonify(sanitize_for_json({
            "volume_over_time": volume_over_time,
            "congestion_distribution": congestion_dist,
            "speed_by_location": speed_by_location,
            "hourly_distribution": hourly_dist,
            "congestion_by_day": congestion_by_day,
            "weather_congestion": weather_congestion
        }))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@overview_bp.route('/<int:dataset_id>/insights', methods=['GET'])
def get_insights(dataset_id):
    try:
        raw_df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        location = request.args.get('location')
        df = raw_df
        if location and location.lower() != 'all' and 'location' in df.columns:
            df = df[df['location'] == location]

        insights = []

        # Insight 1: Busiest Corridor
        if 'location' in df.columns and 'traffic_volume' in df.columns:
            loc_vol = df.groupby('location')['traffic_volume'].mean()
            busiest_loc = loc_vol.idxmax()
            busiest_vol = round(float(loc_vol.max()), 1)
            insights.append(f"Highest traffic density observed at '{busiest_loc}' with an average flow of {busiest_vol} vehicles per 15-minute interval.")

        # Insight 2: Congestion Bottlenecks
        if 'location' in df.columns and 'average_speed' in df.columns:
            loc_speed = df.groupby('location')['average_speed'].mean()
            slowest_loc = loc_speed.idxmin()
            slowest_spd = round(float(loc_speed.min()), 1)
            insights.append(f"Most constrained transit corridor is '{slowest_loc}', recording the lowest average travel speed of {slowest_spd} km/h.")

        # Insight 3: Peak Rush Hour
        if 'hour' in df.columns and 'traffic_volume' in df.columns:
            hr_vol = df.groupby('hour')['traffic_volume'].mean()
            peak_hr = int(hr_vol.idxmax())
            peak_val = round(float(hr_vol.max()), 1)
            insights.append(f"Peak urban traffic surge occurs at {peak_hr:02d}:00 with an average throughput of {peak_val} vehicles/interval.")

        # Insight 4: Weather Degradation
        if 'weather' in df.columns and 'average_speed' in df.columns:
            clear_speed = df[df['weather'] == 'Clear']['average_speed'].mean()
            rain_storm_speed = df[df['weather'].isin(['Rainy', 'Stormy'])]['average_speed'].mean()
            if pd.notnull(clear_speed) and pd.notnull(rain_storm_speed) and clear_speed > 0:
                drop_pct = round(float(((clear_speed - rain_storm_speed) / clear_speed) * 100), 1)
                insights.append(f"Precipitation & stormy weather reduce network travel speed by {drop_pct}% compared to clear conditions ({rain_storm_speed:.1f} km/h vs {clear_speed:.1f} km/h).")

        # Insight 5: Congestion Ratio
        if 'congestion_level' in df.columns:
            high_pct = round(float((df['congestion_level'] == 'High').mean() * 100), 1)
            loc_prefix = f"For corridor '{location}', high" if (location and location.lower() != 'all') else "High"
            insights.append(f"{loc_prefix} congestion state accounts for {high_pct}% of temporal intervals across monitored records.")

        # Insight 6: Anomalies Detected
        if 'is_anomaly' in df.columns:
            anom_cnt = int(df['is_anomaly'].sum())
            anom_pct = round(float((anom_cnt / len(df)) * 100), 2)
            insights.append(f"Identified {anom_cnt} statistical traffic anomalies ({anom_pct}% of records) attributable to incidents or sensor outliers.")

        # Most Congested Locations list
        most_congested_locations = []
        target_df_for_locations = raw_df if (not location or location.lower() == 'all') else df
        if 'location' in target_df_for_locations.columns:
            for loc in target_df_for_locations['location'].dropna().unique():
                sub = target_df_for_locations[target_df_for_locations['location'] == loc]
                spd = float(sub['average_speed'].mean()) if 'average_speed' in sub.columns else 0.0
                rate = float((sub.get('congestion_level', '') == 'High').mean())
                most_congested_locations.append({
                    "location": str(loc),
                    "avg_speed": round(spd, 1),
                    "congestion_rate": round(rate, 3)
                })
            most_congested_locations.sort(key=lambda x: x['congestion_rate'], reverse=True)
            most_congested_locations = most_congested_locations[:5]

        # Peak Traffic Hours list
        peak_traffic_hours = []
        if 'hour' in df.columns and 'traffic_volume' in df.columns:
            hr_vols = df.groupby('hour')['traffic_volume'].mean().reset_index()
            hr_vols = hr_vols.sort_values(by='traffic_volume', ascending=False).head(5)
            for _, r in hr_vols.iterrows():
                h = int(r['hour'])
                peak_traffic_hours.append({
                    "hour": f"{h:02d}:00 - {(h+1)%24:02d}:00",
                    "avg_volume": round(float(r['traffic_volume']), 1)
                })

        # Recent Anomalies list
        recent_anomalies = []
        if 'is_anomaly' in df.columns:
            anom_df = df[df['is_anomaly'] == True].tail(5)
            for idx, r in anom_df.iterrows():
                ts = str(r.get('timestamp') or f"{r.get('date', '')} {r.get('time', '')}")
                vol = round(float(r['traffic_volume']), 1) if 'traffic_volume' in r else 0.0
                spd = round(float(r['average_speed']), 1) if 'average_speed' in r else 0.0
                sev = "High" if (vol > 150 or spd < 15) else "Medium"
                recent_anomalies.append({
                    "id": str(r.get('record_id', idx)),
                    "timestamp": ts,
                    "location": str(r.get('location', 'Unknown Corridor')),
                    "volume": vol,
                    "speed": spd,
                    "severity": sev
                })

        return jsonify(sanitize_for_json({
            "insights": insights,
            "most_congested_locations": most_congested_locations,
            "peak_traffic_hours": peak_traffic_hours,
            "recent_anomalies": recent_anomalies
        }))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
