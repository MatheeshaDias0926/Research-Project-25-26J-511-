import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# --- Configuration ---
NUM_DAYS = 365
BUS_CAPACITY = 55
ROUTES = {
    'A': {'name': 'Colombo-Kandy', 'stops': 8},
    'B': {'name': 'Colombo-Jaffna', 'stops': 10}
}
TIME_BINS = ['6-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22']

# --- Simulation Logic ---
data = []
start_date = datetime(2023, 1, 1)

for day_num in range(NUM_DAYS):
    current_date = start_date + timedelta(days=day_num)
    day_of_week = current_date.strftime('%A')
    
    # Simulate multiple journeys per day for each route
    for _ in range(np.random.randint(10, 15)): # 10-15 journeys per day
        for route_id, route_info in ROUTES.items():
            occupancy = 0
            for stop_id in range(1, route_info['stops'] + 1):
                # Simulate time of day and weather
                time_bin = np.random.choice(TIME_BINS)
                weather = np.random.choice(['not_rain', 'rain'], p=[0.8, 0.2])

                # --- Heuristics for passenger changes ---
                # Base change based on stop progression
                passengers_in = max(0, np.random.randint(10 - stop_id, 20 - stop_id))
                passengers_out = np.random.randint(0, 5) if stop_id < route_info['stops'] else occupancy

                # Adjust for time of day (peak hours)
                if time_bin in ['8-10', '16-18']:
                    passengers_in = int(passengers_in * 1.5)
                
                # Adjust for day of week (weekends are less busy)
                if day_of_week in ['Saturday', 'Sunday']:
                    passengers_in = int(passengers_in * 0.7)

                # Adjust for weather (rain increases demand)
                if weather == 'rain':
                    passengers_in = int(passengers_in * 1.2)

                # Update occupancy
                occupancy += passengers_in
                occupancy -= passengers_out
                
                # Ensure occupancy is within logical bounds
                occupancy = max(0, min(occupancy, BUS_CAPACITY + 20)) # Cap at capacity + 20 standing

                data.append({
                    'route_id': route_id,
                    'stop_id': stop_id,
                    'day_of_week': day_of_week,
                    'time_of_day': time_bin,
                    'weather': weather,
                    'passenger_count': occupancy
                })

# Create DataFrame and save to CSV
df = pd.DataFrame(data)
df.to_csv('synthetic_bus_data.csv', index=False)

print(f"Generated {len(df)} records and saved to synthetic_bus_data.csv")
print(df.head())