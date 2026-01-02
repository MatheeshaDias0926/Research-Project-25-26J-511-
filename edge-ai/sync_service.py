import requests
import json

def sync_driver_data(device_id):
    # Fetch from MERN backend
    response = requests.get(f"http://your-cloud-api/api/device/{device_id}/drivers")
    drivers = response.json()
    
    # Save embeddings locally for offline use
    with open('local_db.json', 'w') as f:
        json.dump(drivers, f)
    print("Local driver database updated.")

# Run this every time the device boots or every hour