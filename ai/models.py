from dataclasses import dataclass
from threading import Thread

from fastapi import WebSocket

from neat_car_ai import NEATCarAI


@dataclass
class Client:
    id: str
    model: NEATCarAI
    socket: WebSocket
    thread: Thread
