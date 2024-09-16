import json
from neat_car_ai import NEATCarAI

def genome_to_json(genome):
    genome_dict = {
        'key': genome.key,
        'fitness': genome.fitness,
        'nodes': {},
        'connections': []
    }

    for node_key, node in genome.nodes.items():
        genome_dict['nodes'][node_key] = {
            'bias': node.bias,
            'response': node.response,
            'activation': node.activation,
            'aggregation': node.aggregation
        }
    
    for conn_key, conn in genome.connections.items():
        genome_dict['connections'].append({
            'weight': conn.weight,
            'enabled': conn.enabled,
            'in': conn_key[0],
            'out': conn_key[1]
        })
    return json.dumps(genome_dict, indent=4)


if __name__ == '__main__':
    genome_json = genome_to_json(NEATCarAI.load_best_genome('genome_5142'))
    print(genome_json)
