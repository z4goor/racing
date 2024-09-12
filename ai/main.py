import asyncio
import os
import signal
import socketio
import sys
import threading
import uvicorn
from neat_car_ai import NEATCarAI

shutdown_flag = asyncio.Event()

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['http://127.0.0.1:5500']
)
app = socketio.ASGIApp(sio)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.txt')

clients = {}
neat_models = {}

heartbeat_interval = 6

@sio.event
async def connect(sid, environ):
    print(f'Client connected: {sid}')
    clients[sid] = True

@sio.event
async def disconnect(sid):
    print(f'Client disconnected: {sid}')
    if sid in clients:
        del clients[sid]

@sio.event
async def message(sid, data):
    print(f'Message from client {sid}: {data}')
    await sio.emit('message', f"Echo: {data}", room=sid)

@sio.event
async def ping(sid):
    print(f'PINGED by {sid}')
    await sio.emit('ping', 'pong', room=sid)

@sio.event
async def heartbeat(sid, data):
    print(f'Received heartbeat from {sid}: {data}')
    # Mark the client as alive
    clients[sid] = True

@sio.event
async def model_init(sid, data):
    print(f'Model init requested by {sid}')

    # Start a new thread to run the NEAT model
    neat_thread = threading.Thread(target=run_neat_model, args=(CONFIG_PATH, sio))
    neat_thread.start()

    await sio.emit('model_init_response', {'status': 'Model initialized'}, room=sid)

def run_neat_model(config_path, sio):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    neat_model = NEATCarAI(config_path=config_path, socket=sio)
    
    loop.run_until_complete(neat_model.run(pop_size=4))  # Adjust pop_size as needed

@sio.event
async def new_generation(sid, data):
    print("Received initial car data for new generation")
    neat_model = neat_models.get(sid)
    if neat_model:
        await neat_model.update_car_data(data)
        await sio.emit('generation_ready', room=sid)
    else:
        print(f"No model found for client {sid}")

@sio.event
async def game_state(sid, data):
    neat_model = neat_models.get(sid)
    if neat_model:
        outputs = await neat_model.activate(data)
        await sio.emit('game_state', outputs, room=sid)
    else:
        print(f"No model found for client {sid}")

async def send_heartbeats():
    while True:
        await asyncio.sleep(heartbeat_interval)
        for sid in list(clients.keys()):
            if clients[sid]:  # If the client responded to the last heartbeat
                clients[sid] = False  # Mark it as not responded
                await sio.emit('heartbeat', 'ping', room=sid)
            else:  # If the client didn't respond, disconnect it
                print(f'Client {sid} failed to respond to heartbeat. Disconnecting...')
                await sio.disconnect(sid)

# Start the heartbeat task when the server starts
async def start_background_tasks(app):
    app['heartbeat_task'] = asyncio.create_task(send_heartbeats())

# Clean up the heartbeat task when the server stops
async def cleanup_background_tasks(app):
    app['heartbeat_task'].cancel()
    await app['heartbeat_task']

# app.on_startup.append(start_background_tasks)
# app.on_cleanup.append(cleanup_background_tasks)

async def main():
    global shutdown_flag
    
    # Run the Uvicorn server
    server = uvicorn.Server(config=uvicorn.Config(app, host='0.0.0.0', port=8000, loop='asyncio'))
    loop = asyncio.get_event_loop()
    
    # Run the server in a background task
    server_task = loop.create_task(server.serve())

    # Check for shutdown signal
    while not shutdown_flag.is_set():
        await asyncio.sleep(1)  # Adjust sleep duration as needed
    
    # Graceful shutdown
    server.should_exit = True
    await server_task  # Wait for the server to exit

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped by user")
        shutdown_flag.set()
        sys.exit(0)
