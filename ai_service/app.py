from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime
import random
# In a real app, you would import scikit-learn model here:
# import joblib
# model = joblib.load('traffic_model.pkl')

app = Flask(__name__)
CORS(app)

def predict_traffic_heuristic(hour, is_weekend, road_condition="good"):
    # Mocking scikit-learn AI logic with a heuristic approach
    # Traffic peaks during weekdays 8-10 AM and 5-7 PM
    if not is_weekend:
        if (8 <= hour <= 10) or (17 <= hour <= 19):
            base_traffic = 0.8 # High
        elif (11 <= hour <= 16):
            base_traffic = 0.5 # Medium
        else:
            base_traffic = 0.2 # Low
    else:
        # Weekends have more spread out, generally lower traffic
        if (10 <= hour <= 20):
            base_traffic = 0.4
        else:
            base_traffic = 0.1
            
    # Add some random variance
    traffic_level = min(1.0, max(0.0, base_traffic + random.uniform(-0.1, 0.1)))
    
    if traffic_level > 0.7:
        return "High"
    elif traffic_level > 0.4:
        return "Medium"
    else:
        return "Low"

@app.route('/api/predict_traffic', methods=['POST'])
def predict_traffic():
    data = request.json
    
    # We expect coordinates and time from the client
    # source = data.get('source')
    # destination = data.get('destination')
    # current_time = data.get('time')
    
    now = datetime.datetime.now()
    hour = now.hour
    is_weekend = now.weekday() >= 5
    
    prediction = predict_traffic_heuristic(hour, is_weekend)
    
    # In a full scikit-learn model, we would extract features and do:
    # prediction = model.predict([features])[0]
    
    return jsonify({
        'traffic_level': prediction,
        'timestamp': now.isoformat()
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)
