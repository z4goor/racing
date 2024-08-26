from flask import Flask, request
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

@app.route('/game-state', methods=['POST'])
def receive_game_state():
    game_state = request.json
    print(game_state)
    return json.dumps({"action": 'dupa'})

def ai_decide_action(game_state):
    if game_state['car']['speed'] < 10:
        return "accelerate"
    return "turn_left"


if __name__ == "__main__":
    app.run(port=5000)
