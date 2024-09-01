from flask import Flask, request
from flask_cors import CORS
import json
import random

app = Flask(__name__)
CORS(app)

@app.route('/game-state', methods=['POST'])
def receive_game_state():
    game_state = request.json
    print("Input: ", json.dumps(game_state))
    return json.dumps(ai_decide_action(game_state))

def ai_decide_action(game_state):
    response = {car_id: random_move() for car_id, _ in game_state.items()}
    print("Output: ", response)
    return response

def random_move():
    return random.choice(['left', 'right', 'accelerate', 'brake'])


if __name__ == "__main__":
    app.run(port=5000)
