import uvicorn
import json
import os
import asyncio
import threading
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from neat_car_ai import NEATCarAI
from models import Client

CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.txt')

app = FastAPI()

origins = ["http://localhost:5500"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connected_clients = {}

async def global_message_callback(model_id: str, message: dict):
    client = next((c for c in connected_clients.values() if c.id == model_id), None)
    if not client:
        return
    try:
        await client.socket.send_json(message)
    except Exception as e:
        print(f"Error sending message to WebSocket for model {model_id}: {e}")

async def handle_ping(websocket: WebSocket, data: str):
    await websocket.send_text(json.dumps({"event": "pong"}))

async def handle_message(websocket: WebSocket, data: str):
    await websocket.send_text(json.dumps({"event": "message", "data": f'Echoed: {data}'}))

async def handle_model_init(websocket: WebSocket, data: str):
    model_id = websocket.client.host
    model_instance = NEATCarAI(model_id, CONFIG_PATH, global_message_callback)

    def model_thread_func():
        asyncio.run(model_instance.run(data))

    model_thread = threading.Thread(target=model_thread_func, daemon=True)
    client = Client(id=model_id, model=model_instance, socket=websocket, thread=model_thread)
    connected_clients[websocket] = client
    
    model_thread.start()
    await websocket.send_json({'event': 'model_init', 'data': 'success'})

async def handle_game_state(websocket: WebSocket, data: str):
    client = connected_clients.get(websocket)
    if not client:
        print('No model instance.')
    
    model_instance = client.model
    await model_instance.update_car_data(data)

    async with model_instance.lock:
        actions = model_instance.shared_state.get("actions", {})

    if actions:
        await websocket.send_json({
            'event': 'car_action',
            'data': actions
        })

event_handlers = {
    "ping": handle_ping,
    "message": handle_message,
    "model_init": handle_model_init,
    "game_state": handle_game_state,
}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            event = data.get("event")
            event_data = data.get("data")

            handler = event_handlers.get(event)
            if handler:
                await handler(websocket, event_data)
            else:
                await websocket.send_text(f"Unknown event: {event}")
    except Exception as e:
        print(f"Error in WebSocket connection: {e}")
    finally:
        client = connected_clients.pop(websocket, None)
        if client and client.thread.is_alive():
            print(f"Client {client.id} disconnected. Cleaning up resources.")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
