import yaml

with open('/home/ubuntu/ai_classifier/docker-compose.yml', 'r') as f:
    data = yaml.safe_load(f)

if 'ports' not in data['services']['ai-classifier-brain']:
    data['services']['ai-classifier-brain']['ports'] = ['5000:5000']

with open('/home/ubuntu/ai_classifier/docker-compose.yml', 'w') as f:
    yaml.dump(data, f)
