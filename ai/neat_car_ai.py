import asyncio
import neat
import os
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
    
    async def run(self, pop_size):
        self.config.pop_size = pop_size
        self.population = neat.Population(self.config)
        self.population.add_reporter(neat.StdOutReporter(True))
        self.stats = neat.StatisticsReporter()
        self.population.add_reporter(self.stats)

        try:
            self.best_genome = await asyncio.to_thread(self.population.run, self.run_generation, 60)
            self.save_best_genome('genome')
        except Exception as e:
            print(f"Error during population run: {e}")

    async def update_car_data(self, car_data, client_id):
        async with self.lock:
            self.car_states = car_data
        if not self.car_states:
            print('ALARM - NO SELF.CAR_STATES AFTER UPDATE')

    def run_generation(self, genomes, config):
        try:
            asyncio.run_coroutine_threadsafe(self.setup_data(genomes, config), self.loop).result()
            # asyncio.run_coroutine_threadsafe(self.data_check(), self.loop).result()
            asyncio.run_coroutine_threadsafe(self.pause_action(), self.loop).result()
            asyncio.run_coroutine_threadsafe(self.clear_data(), self.loop).result()
        except Exception as e:
            print(f"Error in run_generation: {e}")
    
    async def setup_data(self, genomes, config):
        for _, genome in genomes:
            genome.fitness = 0
        
        await self.sio.send_json({'event': 'new_generation', 'data': 'LETSGO'})
        
        while not self.car_states:
            print('waiting for car states')
            await asyncio.sleep(0.2)
        print('CAR STATES FOUND')
        
        async with self.lock: 
            self.genomes = {
                id_: {
                    'genome': genomes[genome_id][1],
                    'network': neat.nn.FeedForwardNetwork.create(genomes[genome_id][1], config)
                }
                for genome_id, id_ in enumerate(self.car_states.keys())
            }
        await self.sio.send_json({'event': 'start', 'data': 'LETSGO'})
    
    async def data_check(self):
        async with self.lock:
            status = set(self.genomes.keys()) == set(self.car_states.keys())
            print('DATA CHECK', status)
    
    async def pause_action(self):
        timeout = 12
        interval = 0.2
        total_time = 0

        while total_time < timeout:
            async with self.lock:
                car_data = list(self.car_states.values())
            
            if not car_data:
                return
            
            actions = {}
            for car_id, state in self.car_states.items():
                await self.evaluate_genome(car_id, state)
                actions[car_id] = await self.activate_car(car_id, state)
            if actions:
                await self.send_car_action(actions)

            await asyncio.sleep(interval)
            total_time += interval

    async def evaluate_genome(self, car_id, state):
        async with self.lock:
            try:
                car = self.genomes.get(car_id).copy()
            except Exception as e:
                print(f'cannot get id {car_id} from genomes {list(self.genomes.keys())}')
        if not car:
            return
        
        if state['collision']:
            car['genome'].fitness -= 300
        elif state['speed'] < 0.02:
            car['genome'].fitness -= 10
        elif state['speed'] < 0.21:
            car['genome'].fitness -= 1
        else:
            car['genome'].fitness += state['speed'] / 2

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
        try:
            actions = self.genomes[id_]['network'].activate([sensor['distance'] for sensor in state['sensors']] + [state['speed']])

            return [
                'break' if actions[0] < -0.5 else 'accelerate' if actions[0] > 0.5 else None,
                'left' if actions[1] < -0.5 else 'right' if actions[1] > 0.5 else None,
            ]
        except Exception as e:
            print(f"Error while activating car {id_}: {e}")
            return [None, None]

    def save_best_genome(self, file_name):
        filepath = os.path.join(os.path.dirname(__file__), 'genomes', file_name)
        try:
            with open(filepath, 'wb') as f:
                pickle.dump(self.best_genome, f)
            print(f'Best genome saved to {filepath}')
        except Exception as e:
            print(f"Error saving best genome: {e}")

    def load_best_genome(self, file_name):
        filepath = os.path.join(os.path.dirname(__file__), 'genomes', file_name)
        try:
            with open(filepath, 'rb') as f:
                self.best_genome = pickle.load(f)
            print(f'Best genome loaded from {filepath}')
        except Exception as e:
            print(f"Error loading best genome: {e}")


if __name__ == '__main__':
    neat = NEATCarAI(os.path.join(os.path.dirname(__file__), 'config.txt'), None)
    neat.load_best_genome('genome')
    print(neat.best_genome)    
