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
            self.best_genome = await asyncio.to_thread(self.population.run, self.run_generation, 20)
            self.save_best_genome('genome')
        except Exception as e:
            print(f"Error during population run: {e}")

    async def wait_for_car_data(self):
        async def periodic_check():
            while not self.car_data_event.is_set():
                print(f"No data loaded from client {self.id}. Car data event status: {self.car_data_event.is_set()}")
                await asyncio.sleep(1)
        
        check_task = asyncio.create_task(periodic_check())

        try:
            await self.car_data_event.wait()
            print('Car data received, proceeding with generation.')
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
        timeout = 10
        await asyncio.sleep(timeout)

    async def send_generation_end_message(self):
        try:
            await self.sio.emit('generation_end', {'message': 'Generation has ended, prepare for a new race!'})
            await self.request_new_generation()
        except Exception as e:
            print(f"Error while sending generation end message: {e}")

    async def activate(self, inputs):
        try:
            outputs = {id_: await self.activate_car(id_, state) for id_, state in inputs.items()}
            return outputs
        except Exception as e:
            print(f"Error during activation: {e}")
            return None
    
    async def activate_car(self, id_, state):
        try:
            car = self.cars[id_]
        except KeyError:
            return None

        try:
            if state['collision']:
                car['genome'].fitness -= 500
                del self.cars[id_]
                return None
            if state['speed'] < 0.1:
                car['genome'].fitness -= 7
            elif state['speed'] < 0.8:
                car['genome'].fitness -= 2
            else:
                car['genome'].fitness += 1
            
            action = car['network'].activate([sensor['distance'] for sensor in state['sensors']] + [state['speed'], state['collision']])

            if action[0] > 0.8:
                return 'accelerate'
            if action[0] > 0.45:
                return 'right'
            if action[0] > 0.1:
                return 'left'
            return 'brake'
        
        except Exception as e:
            print(f"Error while activating car {id_}: {e}")
            return None

    async def evaluate_genomes(self):
        try:
            for car_id, car_data in self.cars.items():
                state = car_data['state']
                if state['speed'] < 0:
                    car_data['genome'].fitness -= 3
                if state['speed'] < 0.2:
                    car_data['genome'].fitness -= 1
                elif state['collision']:
                    car_data['genome'].fitness -= 15
                    print('DELETE')
                    del self.cars[car_id]
                else:
                    car_data['genome'].fitness += 1
            print('Genomes evaluated successfully.')
        except Exception as e:
            print(f"Error during genome evaluation: {e}")

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
