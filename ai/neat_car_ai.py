import asyncio
import neat
import os
import time
import pickle

class NEATCarAI:
    def __init__(self, config_path, socket):
        self.config = self.load_config(config_path)
        self.sio = socket
        self.generation = 0
        self.best_genome = None
        self.population = None
        self.stats = None
        self.car_states = {}
        self.genomes = {}
        self.lock = asyncio.Lock()
        self.loop = asyncio.get_event_loop()
    
    @property
    def id(self):
        return self.sio.client.port

    def load_config(self, config_path):
        return neat.config.Config(
            neat.DefaultGenome, 
            neat.DefaultReproduction,
            neat.DefaultSpeciesSet, 
            neat.DefaultStagnation,
            config_path
        )
    
    async def run(self, data):
        self.config.pop_size = data['generationSize']
        self.population = neat.Population(self.config)
        self.population.add_reporter(neat.StdOutReporter(True))
        self.stats = neat.StatisticsReporter()
        self.population.add_reporter(self.stats)

        try:
            self.best_genome = await asyncio.to_thread(self.population.run, self.run_generation, data['numGenerations'])
            self.save_best_genome('genome')
        except Exception as e:
            print(f"Error during population run: {e}")

    async def update_car_data(self, car_data, client_id):
        async with self.lock:
            self.car_states = car_data

    def run_generation(self, genomes, config):
        try:
            asyncio.run_coroutine_threadsafe(self.setup_data(genomes, config), self.loop).result()
            asyncio.run_coroutine_threadsafe(self.pause_action(), self.loop).result()
            asyncio.run_coroutine_threadsafe(self.clear_data(), self.loop).result()
        except Exception as e:
            print(f"Error in run_generation: {e}")
    
    async def setup_data(self, genomes, config):
        for _, genome in genomes:
            genome.fitness = 0
        
        await self.sio.send_json({'event': 'new_generation', 'data': len(genomes)})
        
        while not self.car_states:
            await asyncio.sleep(0.05)
        
        async with self.lock:
            self.genomes = {
                id_: {
                    'genome': genomes[genome_id][1],
                    'network': neat.nn.FeedForwardNetwork.create(genomes[genome_id][1], config)
                }
                for genome_id, id_ in enumerate(self.car_states.keys())
            }
        await self.sio.send_json({'event': 'start', 'data': 'LETSGO'})
    
    async def pause_action(self):
        timeout = 3
        interval = 0.017
        time_threshold = 3
        total_time = 0

        while total_time < timeout:
            start_time = time.time()
            async with self.lock:
                car_data = list(self.car_states.values())
            
            if not car_data:
                return
            
            actions = {}
            staying = 0
            for car_id, state in self.car_states.items():
                collision = await self.evaluate_genome(car_id, state)
                if collision:
                    actions[car_id] = await self.activate_car(car_id, state)
                    if state['speed'] == 0:
                        staying += 1
            if total_time > time_threshold and len(actions) == staying:
                print('Stop on stop')
                return
            if actions:
                await self.send_car_action(actions)
            
            await asyncio.sleep(interval - (time.time() - start_time))
            total_time += interval

    async def evaluate_genome(self, car_id, state):
        async with self.lock:
            car = self.genomes.get(car_id)
            if not car:
                return False
            car = car.copy()
        
        if state['collision']:
            car['genome'].fitness -= 50
            async with self.lock:
                del self.genomes[car_id]
                return False
        elif state['speed'] < 0:
            car['genome'].fitness -= 200
        elif state['speed'] < 0.2:
            car['genome'].fitness -= 1
        else:
            car['genome'].fitness += state['speed']
        return True

    async def send_car_action(self, actions):
        try:
            await self.sio.send_json({
                'event': 'car_action',
                'data': actions
            })
        except Exception as e:
            print(f"Error while sending actions: {e}")

    
    async def clear_data(self):
        await self.sio.send_json({'event': 'stop', 'data': 'HALT'})
        await asyncio.sleep(0.1)
        async with self.lock:
            self.genomes.clear()
            self.car_states.clear()
    
    async def activate_car(self, id_, state):
        async with self.lock:
            try:
                genome = self.genomes[id_]
            except Exception:
                return
        try:
            inputs = [sensor['distance'] for sensor in state['sensors']] + [state['speed']]
            return genome['network'].activate(inputs)
        except Exception as e:
            print(f"Error while activating car {id_}: {e}")
            return [0, 0]

    def save_best_genome(self, file_name):
        filepath = os.path.join(os.path.dirname(__file__), 'genomes', file_name)
        try:
            with open(filepath, 'wb') as f:
                pickle.dump(self.best_genome, f)
            print(f'Best genome saved to {filepath}')
        except Exception as e:
            print(f"Error saving best genome: {e}")
    
    @staticmethod
    def load_best_genome(file_name):
        filepath = os.path.join(os.path.dirname(__file__), 'genomes', file_name)
        try:
            with open(filepath, 'rb') as f:
                return pickle.load(f)
            print(f'Best genome loaded from {filepath}')
        except Exception as e:
            print(f"Error loading best genome: {e}")


if __name__ == '__main__':
    import json
    print(json.dumps(NEATCarAI.load_best_genome('genome_5142')))
