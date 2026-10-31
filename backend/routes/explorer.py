import math
from datetime import datetime, timedelta
import pandas as pd
from flask import Blueprint, request, jsonify
from services.dataset_service import load_dataset_df, sanitize_for_json

explorer_bp = Blueprint('explorer', __name__)


def _generate_future_predictions(df, args):
    """
    When a user queries a future date (beyond historical dataset observations),
    generates time-series predicted traffic records using historical hour/day-of-week
    patterns and transparent congestion thresholds.
    """
    date_from = args.get('date_from')
    date_to = args.get('date_to') or date_from
    if not date_from:
        return pd.DataFrame()

    try:
        start_d = datetime.strptime(str(date_from).strip()[:10], '%Y-%m-%d')
        end_d = datetime.strptime(str(date_to).strip()[:10], '%Y-%m-%d')
    except Exception:
        return pd.DataFrame()

    if end_d < start_d:
        end_d = start_d

    # Limit range to max 14 days for performance
    if (end_d - start_d).days > 14:
        end_d = start_d + timedelta(days=14)

    req_location = args.get('location')
    locations = [req_location] if req_location and req_location != 'all' else list(df['location'].dropna().unique())

    has_dow = 'day_of_week' in df.columns
    has_hr = 'hour' in df.columns

    # Coordinate lookup per location
    loc_coords = {}
    for loc in locations:
        sub = df[df['location'] == loc]
        lat = float(sub['latitude'].dropna().iloc[0]) if 'latitude' in sub and not sub['latitude'].dropna().empty else 37.7749
        lon = float(sub['longitude'].dropna().iloc[0]) if 'longitude' in sub and not sub['longitude'].dropna().empty else -122.4194
        road_type = str(sub['road_type'].dropna().iloc[0]) if 'road_type' in sub and not sub['road_type'].dropna().empty else 'Arterial'
        loc_coords[loc] = (lat, lon, road_type)

    predicted_rows = []
    curr_d = start_d
    rec_counter = 90000

    while curr_d <= end_d:
        d_str = curr_d.strftime('%Y-%m-%d')
        dow_str = curr_d.strftime('%A')

        time_from_h = int(str(args.get('time_from', '00:00'))[:2]) if args.get('time_from') else 0
        time_to_h = int(str(args.get('time_to', '23:59'))[:2]) if args.get('time_to') else 23

        for hour in range(time_from_h, min(24, time_to_h + 1)):
            time_str = f"{hour:02d}:00"
            ts_str = f"{d_str} {time_str}:00"

            for loc in locations:
                lat, lon, road_type = loc_coords.get(loc, (37.7749, -122.4194, 'Arterial'))

                sub_loc = df[df['location'] == loc]
                if has_dow and has_hr:
                    hist_match = sub_loc[(sub_loc['day_of_week'] == dow_str) & (sub_loc['hour'] == hour)]
                    if len(hist_match) > 0:
                        vol = float(hist_match['traffic_volume'].mean())
                        spd = float(hist_match['average_speed'].mean())
                    else:
                        vol = float(sub_loc['traffic_volume'].mean()) if 'traffic_volume' in sub_loc else 65.0
                        spd = float(sub_loc['average_speed'].mean()) if 'average_speed' in sub_loc else 35.0
                else:
                    vol = float(sub_loc['traffic_volume'].mean()) if 'traffic_volume' in sub_loc else 65.0
                    spd = float(sub_loc['average_speed'].mean()) if 'average_speed' in sub_loc else 35.0

                vol = round(max(5.0, vol), 1)
                spd = round(max(8.0, spd), 1)

                if (vol >= 120 and spd <= 25) or vol >= 150:
                    cong = 'High'
                elif (vol >= 70 and spd <= 40) or (vol >= 100 and spd <= 50):
                    cong = 'Medium'
                else:
                    cong = 'Low'

                req_cong = args.get('congestion_level')
                if req_cong and req_cong != cong:
                    continue

                rec_counter += 1
                predicted_rows.append({
                    'record_id': rec_counter,
                    'date': d_str,
                    'time': time_str,
                    'timestamp': ts_str,
                    'location': loc,
                    'road_type': road_type,
                    'latitude': lat,
                    'longitude': lon,
                    'traffic_volume': vol,
                    'average_speed': spd,
                    'congestion_level': cong,
                    'weather': 'Forecast (Model)',
                    'is_predicted': True,
                    'is_sample': True
                })

        curr_d += timedelta(days=1)

    return pd.DataFrame(predicted_rows)


def _apply_explorer_filters(df, args):
    date_from = args.get('date_from')
    today_str = datetime.now().strftime('%Y-%m-%d')
    max_dataset_date = str(df['date'].max())[:10] if 'date' in df.columns and not df['date'].dropna().empty else today_str

    # If the user selected a future date beyond recorded history, switch to prediction generation
    if date_from and str(date_from).strip()[:10] > max_dataset_date:
        pred_df = _generate_future_predictions(df, args)
        return pred_df, True

    filtered_df = df.copy()

    location = args.get('location')
    if location and 'location' in filtered_df.columns:
        filtered_df = filtered_df[filtered_df['location'] == location]

    weather = args.get('weather')
    if weather and 'weather' in filtered_df.columns:
        filtered_df = filtered_df[filtered_df['weather'] == weather]

    congestion = args.get('congestion_level')
    if congestion and 'congestion_level' in filtered_df.columns:
        filtered_df = filtered_df[filtered_df['congestion_level'] == congestion]

    if date_from:
        date_from_str = str(date_from).strip()[:10]
        if 'date' in filtered_df.columns:
            df_dates = filtered_df['date'].astype(str).str[:10]
            filtered_df = filtered_df[df_dates >= date_from_str]
        elif 'timestamp' in filtered_df.columns:
            df_dates = pd.to_datetime(filtered_df['timestamp'], errors='coerce')
            filtered_df = filtered_df[df_dates >= pd.to_datetime(date_from_str)]

    date_to = args.get('date_to')
    if date_to:
        date_to_str = str(date_to).strip()[:10]
        if 'date' in filtered_df.columns:
            df_dates = filtered_df['date'].astype(str).str[:10]
            filtered_df = filtered_df[df_dates <= date_to_str]
        elif 'timestamp' in filtered_df.columns:
            df_dates = pd.to_datetime(filtered_df['timestamp'], errors='coerce')
            filtered_df = filtered_df[df_dates <= pd.to_datetime(date_to_str + ' 23:59:59')]

    time_from = args.get('time_from')
    if time_from and 'time' in filtered_df.columns:
        filtered_df = filtered_df[filtered_df['time'].astype(str).str[:5] >= str(time_from)[:5]]

    time_to = args.get('time_to')
    if time_to and 'time' in filtered_df.columns:
        filtered_df = filtered_df[filtered_df['time'].astype(str).str[:5] <= str(time_to)[:5]]

    return filtered_df, False


@explorer_bp.route('/<int:dataset_id>/records', methods=['GET'])
def get_records(dataset_id):
    try:
        df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        filtered_df, is_predicted = _apply_explorer_filters(df, request.args)

        # Sorting
        sort_by = request.args.get('sort_by')
        sort_dir = request.args.get('sort_dir', 'asc').lower()
        if sort_by and sort_by in filtered_df.columns:
            ascending = (sort_dir != 'desc')
            filtered_df = filtered_df.sort_values(by=sort_by, ascending=ascending)
        elif 'record_id' in filtered_df.columns:
            filtered_df = filtered_df.sort_values(by='record_id', ascending=True)

        # Pagination
        page = max(1, int(request.args.get('page', 1)))
        per_page = max(1, min(int(request.args.get('per_page', 50)), 200))
        total = len(filtered_df)
        pages = max(1, math.ceil(total / per_page))

        start = (page - 1) * per_page
        end = start + per_page
        records = filtered_df.iloc[start:end].to_dict(orient='records')

        return jsonify(sanitize_for_json({
            "records": records,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pages,
            "is_predicted": is_predicted,
            "prediction_note": "Future date selected: displaying ML predicted traffic flow based on day-of-week patterns." if is_predicted else None
        }))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@explorer_bp.route('/<int:dataset_id>/filters', methods=['GET'])
def get_filter_options(dataset_id):
    try:
        df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        locations = sorted([str(x) for x in df['location'].dropna().unique()]) if 'location' in df.columns else []
        weathers = sorted([str(x) for x in df['weather'].dropna().unique()]) if 'weather' in df.columns else []
        congestion_levels = ['Low', 'Medium', 'High'] if 'congestion_level' in df.columns else []

        date_min = str(df['date'].min()) if 'date' in df.columns and not df['date'].dropna().empty else None
        date_max = str(df['date'].max()) if 'date' in df.columns and not df['date'].dropna().empty else None

        return jsonify(sanitize_for_json({
            "locations": locations,
            "weathers": weathers,
            "weather_conditions": weathers,
            "congestion_levels": congestion_levels,
            "date_range": {
                "min": date_min,
                "max": date_max
            },
            "date_min": date_min,
            "date_max": date_max
        }))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@explorer_bp.route('/<int:dataset_id>/stats', methods=['GET'])
def get_filtered_stats(dataset_id):
    try:
        df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)
        filtered_df, is_predicted = _apply_explorer_filters(df, request.args)

        total_records = len(filtered_df)
        avg_volume = round(float(filtered_df['traffic_volume'].mean()), 1) if 'traffic_volume' in filtered_df.columns and total_records > 0 else 0.0
        avg_speed = round(float(filtered_df['average_speed'].mean()), 1) if 'average_speed' in filtered_df.columns and total_records > 0 else 0.0

        breakdown = {}
        if 'congestion_level' in filtered_df.columns and total_records > 0:
            c_counts = filtered_df['congestion_level'].value_counts()
            for lvl in ['High', 'Medium', 'Low']:
                breakdown[lvl] = int(c_counts.get(lvl, 0))

        return jsonify(sanitize_for_json({
            "total_records": total_records,
            "avg_volume": avg_volume,
            "avg_speed": avg_speed,
            "congestion_breakdown": breakdown,
            "is_predicted": is_predicted
        }))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
