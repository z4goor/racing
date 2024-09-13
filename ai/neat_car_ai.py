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
        self.cars = {}
        self.genomes = {}
        self.car_data_event = asyncio.Event()
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
            self.best_genome = await asyncio.to_thread(self.population.run, self.run_generation, 70)
            self.save_best_genome('genome')
        except Exception as e:
            print(f"Error during population run: {e}")

    async def wait_for_car_data(self):
        async def periodic_check():
            while not self.car_data_event.is_set():
                await asyncio.sleep(1)
        
        check_task = asyncio.create_task(periodic_check())

        try:
            await self.car_data_event.wait()
        finally:
            check_task.cancel()
            try:
                await check_task
            except asyncio.CancelledError:
                pass

    async def update_car_data(self, car_data, client_id):
        async with self.lock:
            self.cars = car_data
            self.car_data_event.set()

    async def request_new_generation(self):
        try:
            await self.sio.send_json({'event': 'new_generation', 'data': 'NEED DATA'})
        except Exception as e:
            print(f"Error while sending new generation request: {e}")

    def run_generation(self, genomes, config):
        try:
            asyncio.run_coroutine_threadsafe(self.request_new_generation(), self.loop).result()
            asyncio.run_coroutine_threadsafe(self.wait_for_car_data(), self.loop).result()
            
            for _, genome in genomes:
                genome.fitness = 0
            
            self.cars = {
                id_: {
                    'genome': genomes[genome_id][1],
                    'network': neat.nn.FeedForwardNetwork.create(genomes[genome_id][1], config)
                }
                for genome_id, id_ in enumerate(self.cars.keys())
            }
            asyncio.run_coroutine_threadsafe(self.pause_action(), self.loop).result()

            self.car_data_event.clear()
            self.cars.clear()

        except Exception as e:
            print(f"Error in run_generation: {e}")
    
    async def pause_action(self):
        timeout = 30
        interval = 1
        total_time = 0

        while total_time < timeout:
            async with self.lock:
                car_data = self.cars.values()
            
            if not self.cars or all(car.get('speed', 1) == 0 for car in car_data):
                return
            await asyncio.sleep(interval)
            total_time += interval

    async def send_generation_end_message(self):
        try:
            await self.sio.emit('generation_end', {'message': 'Generation has ended, prepare for a new race!'})
            await self.request_new_generation()
        except Exception as e:
            print(f"Error while sending generation end message: {e}")

    async def activate(self, inputs):
        try:
            outputs = {
                id_: await self.activate_car(id_, state)
                for id_, state in inputs.items()
            }
            return outputs
        except Exception as e:
            print(f"Error during activation: {e}")
            return None
    
    async def activate_car(self, id_, state):
        try:
            async with self.lock:
                car = self.cars[id_]
                self.cars[id_]['speed'] = state['speed']
                self.cars[id_]['collision'] = state['collision']
        except KeyError:
            return [None, None]

        try:
            if state['collision']:
                car['genome'].fitness -= 300
                async with self.lock:
                    del self.cars[id_]
                return None
            if state['speed'] < 0.02:
                car['genome'].fitness -= 100
            elif state['speed'] < 0.21:
                car['genome'].fitness -= 2
            else:
                car['genome'].fitness += 1 * state['speed']
            
            actions = car['network'].activate([sensor['distance'] for sensor in state['sensors']] + [state['speed'], state['collision']])

            return [
                'break' if actions[0] < -0.5 else 'accelerate' if actions[0] > 0.6 else None,
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
