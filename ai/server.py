import uvicorn
import json
import os
import asyncio
import threading
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from neat_car_ai import NEATCarAI  # Import your NEATCarAI class

CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.txt')

app = FastAPI()

# CORS settings
origins = ["http://localhost:5500"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store connected clients and their associated NEATCarAI instances
connected_clients = {}
model_threads = {}

async def handle_ping(websocket: WebSocket, data: str):
    await websocket.send_text(json.dumps({"event": "pong"}))
    print("Ping event: Responded with pong")

async def handle_message(websocket: WebSocket, data: str):
    await websocket.send_text(json.dumps({"event": "message", "data": f'Echoed: {data}'}))
    print(f"Message event: Broadcasted message '{data}'")

async def handle_model_init(websocket: WebSocket, data: str):
    pop_size = 50  # Default population size if not provided
    
    # Create a new NEATCarAI instance
    model_instance = NEATCarAI(CONFIG_PATH, socket=websocket)
    connected_clients[websocket] = model_instance
    
    # Create and start a thread for this model
    def model_thread_func():
        asyncio.run(model_instance.run(pop_size))
    
    model_thread = threading.Thread(target=model_thread_func, daemon=True)
    model_threads[websocket] = model_thread
    model_thread.start()
    
    await websocket.send_json({'event': 'model_init', 'data': 'success'})
    print(f"Model init event: Model initialized and associated with client")

async def handle_new_generation(websocket: WebSocket, data: dict):
    model_instance = connected_clients.get(websocket)
    if model_instance:
        asyncio.run_coroutine_threadsafe(
            model_instance.update_car_data(data, "client_id_placeholder"),
            asyncio.get_event_loop()
        )

async def handle_game_state(websocket: WebSocket, data: str):
    model_instance = connected_clients.get(websocket)
    if model_instance:
        output = await asyncio.create_task(
            model_instance.activate(data)
        )
    await websocket.send_json({"event": "game_state", "data": output})

# Dictionary mapping event types to handler functions
event_handlers = {
    "ping": handle_ping,
    "message": handle_message,
    "model_init": handle_model_init,
    "new_generation": handle_new_generation,
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
        connected_clients.pop(websocket, None)
        thread = model_threads.pop(websocket, None)
        if thread and thread.is_alive():
            print(f"Client disconnected. Cleaning up resources.")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)