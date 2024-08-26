from flask import Flask, request
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

@app.route('/game-state', methods=['POST'])
def receive_game_state():
    game_state = request.json
    print(game_state)
    return json.dumps(ai_decide_action(game_state))

def ai_decide_action(game_state):
    if game_state['sensors'][2] < 80:
        print('obstackle')
        if game_state['sensors'][1] > game_state['sensors'][3]:
            return 'left'
        return 'right'
    if game_state['speed'] < 0.4:
        return 'accelerate'


if __name__ == "__main__":
    app.run(port=5000)
