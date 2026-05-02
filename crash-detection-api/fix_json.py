import json
import os

files = ['test_severe_crash.json', 'test_crash_data.json']

for filename in files:
    if not os.path.exists(filename):
        continue
        
    with open(filename, 'r') as f:
        data = json.load(f)
    
    new_readings = []
    for r in data['readings']:
        new_r = r.copy()
        if 'acceleration' in r:
            new_r['acceleration_x'] = r['acceleration']['x']
            new_r['acceleration_y'] = r['acceleration']['y']
            new_r['acceleration_z'] = r['acceleration']['z']
            del new_r['acceleration']
        if 'gyro' in r:
            new_r['gyro_x'] = r['gyro']['x']
            new_r['gyro_y'] = r['gyro']['y']
            new_r['gyro_z'] = r['gyro']['z']
            del new_r['gyro']
        new_readings.append(new_r)
    
    data['readings'] = new_readings
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Fixed {filename}")
