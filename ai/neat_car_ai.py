import asyncio
import neat
import os
import time
import pickle

class NEATCarAI:
    def __init__(self, id_, config_path, on_message_callback):
        self.id = id_
        self.config = self.load_config(config_path)
        self.on_message_callback = on_message_callback
        self.generation = 0
        self.best_genome = None
        self.population = None
        self.stats = None
        self.car_states = {}
        self.genomes = {}
        self.lock = asyncio.Lock()
        self.loop = asyncio.get_event_loop()
        self.shared_state = {
            "car_states": {},
            "genomes": {}
        }
        self.generation_termination_event = asyncio.Event()

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
            print(f"Error during NEAT run: {e}")

    async def update_car_data(self, car_data):
        async with self.lock:
            self.shared_state["car_states"] = car_data

    def run_generation(self, genomes, config):
        self.generation += 1
        print(f'Start generation number {self.generation}. ')
        self.generation_termination_event.clear()

        setup_future = asyncio.run_coroutine_threadsafe(self.setup_data(genomes, config), self.loop)
        setup_future.result()

        tasks = [
            asyncio.run_coroutine_threadsafe(self.process_car_data(), self.loop),
            asyncio.run_coroutine_threadsafe(self.adjust_genome_fitness(), self.loop),
            asyncio.run_coroutine_threadsafe(self.check_generation_end(), self.loop)
        ]

        termination_future = asyncio.run_coroutine_threadsafe(self.generation_termination_event.wait(), self.loop)
        termination_future.result()

        clear_future = asyncio.run_coroutine_threadsafe(self.clear_data(), self.loop)
        clear_future.result()

        for task in tasks:
            task.cancel()

    async def setup_data(self, genomes, config):
        for _, genome in genomes:
            genome.fitness = 0

        await self.on_message_callback(self.id, {'event': 'new_generation', 'data': {'number': self.generation, 'size': len(genomes)}})

        timeout = 5
        start_time = time.time()

        while not self.shared_state["car_states"]:
            if time.time() - start_time > timeout:
                raise TimeoutError("Car states not received within the timeout period.")
            await asyncio.sleep(0.05)

        async with self.lock:
            self.genomes = {
                id_: {
                    'genome': genomes[genome_id][1],
                    'network': neat.nn.FeedForwardNetwork.create(genomes[genome_id][1], config)
                }
                for genome_id, id_ in enumerate(self.shared_state["car_states"].keys())
            }
        
        await self.on_message_callback(self.id, {'event': 'start', 'data': 'LETSGO'})

    async def process_car_data(self):
        interval = 0.05
        while not self.generation_termination_event.is_set():
            car_data = list(self.shared_state["car_states"].values())

            if not car_data:
                await asyncio.sleep(interval)
                continue

            actions = {}
            for car_id, state in self.shared_state["car_states"].items():
                action = await self.activate_car(car_id, state)
                if action:
                    actions[car_id] = action

            if actions:
                async with self.lock:
                    self.shared_state["actions"] = actions

            await asyncio.sleep(interval)
        print('Exiting process_car_data...')

    async def activate_car(self, car_id, state):
        async with self.lock:
            genome = self.genomes.get(car_id)

        if not genome:
            return [0, 0]

        try:
            inputs = [sensor['distance'] for sensor in state['sensors']] + [state['speed']]
            action = genome['network'].activate(inputs)
            return action
        except Exception as e:
            print(f"Error activating car {car_id}: {e}")
            return [0, 0]

    async def adjust_genome_fitness(self):
        interval = 0.2
        while not self.generation_termination_event.is_set():
            for car_id, state in self.shared_state["car_states"].items():
                await self.evaluate_genome(car_id, state)
            await asyncio.sleep(interval)

    async def evaluate_genome(self, car_id, state):
        async with self.lock:
            car = self.genomes.get(car_id)

        if not car:
            return False

        fitness = car['genome'].fitness

        if state['collision']:
            async with self.lock:
                car['genome'].fitness = fitness - 50
                del self.genomes[car_id]
            return False

        if state['speed'] < 0:
            fitness -= 200
        elif state['speed'] < 0.2:
            fitness -= 1
        else:
            fitness += state['speed']
        
        async with self.lock:
            car['genome'].fitness = fitness
        return True

    async def check_generation_end(self):
        timeout = 15
        time_threshold = 3
        interval = 0.2
        total_time = 0

        while total_time < timeout:
            car_data = list(self.shared_state["car_states"].values())
            if not car_data:
                print("No car data, exiting check_generation_end.")
                return

            staying = sum(state['speed'] <= 0 for state in car_data)

            if total_time > time_threshold and staying == len(car_data):
                print('All cars stationary, terminating generation.')
                self.generation_termination_event.set()
                return

            await asyncio.sleep(interval)
            total_time += interval

        print('Timeout reached, terminating generation.')
        self.generation_termination_event.set()


    async def clear_data(self):
        print('Inside clear_data.')

        try:
            await self.on_message_callback(self.id, {'event': 'stop', 'data': 'HALT'})
            print('Sent HALT event to client.')
        except Exception as e:
            print(f"Error sending HALT event: {e}")

        await asyncio.sleep(0.1)

        print('Attempting to acquire lock in clear_data...')
        async with self.lock:
            self.genomes.clear()
            self.shared_state["car_states"].clear()

    def save_best_genome(self, file_name):
        filepath = os.path.join(os.path.dirname(__file__), 'genomes', file_name)
        try:
            with open(filepath, 'wb') as f:
                pickle.dump(self.best_genome, f)
        except Exception as e:
            print(f"Error saving best genome: {e}")

    @staticmethod
    def load_best_genome(file_name):
        filepath = os.path.dirname(__file__), 'genomes', file_name
        try:
            with open(filepath, 'rb') as f:
                return pickle.load(f)
        except Exception as e:
            print(f"Error loading best genome: {e}")
