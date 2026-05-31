#!/bin/bash
set -e

echo "Setting permissions on .pem files..."
chmod 600 *.pem

PUB_KEY=$(cat /home/ubuntu/.ssh/ng-soc-key.pub)

echo "Injecting key into AI Models (172.31.25.6)..."
ssh -o StrictHostKeyChecking=no -i AI_models.pem ubuntu@172.31.25.6 "echo '$PUB_KEY' >> ~/.ssh/authorized_keys"

echo "Injecting key into n8n (172.31.30.123)..."
ssh -o StrictHostKeyChecking=no -i n8nserver.pem ubuntu@172.31.30.123 "echo '$PUB_KEY' >> ~/.ssh/authorized_keys"

echo "Injecting key into Wazuh (172.31.41.10)..."
ssh -o StrictHostKeyChecking=no -i wazuhkey.pem ubuntu@172.31.41.10 "echo '$PUB_KEY' >> ~/.ssh/authorized_keys"

echo "Injecting key into DFWS (172.31.36.190)..."
ssh -o StrictHostKeyChecking=no -i Dfkey.pem ubuntu@172.31.36.190 "echo '$PUB_KEY' >> ~/.ssh/authorized_keys"

echo "Injecting key into Threat Server (172.31.27.162)..."
ssh -o StrictHostKeyChecking=no -i mitm-url.pem ubuntu@172.31.27.162 "echo '$PUB_KEY' >> ~/.ssh/authorized_keys"

echo "Injecting key into T-Pot (172.31.13.157 on port 2222)..."
ssh -o StrictHostKeyChecking=no -p 2222 -i tpot.pem ubuntu@172.31.13.157 "echo '$PUB_KEY' >> ~/.ssh/authorized_keys" || \
ssh -o StrictHostKeyChecking=no -p 2222 -i tpot.pem admin@172.31.13.157 "echo '$PUB_KEY' >> ~/.ssh/authorized_keys" || \
ssh -o StrictHostKeyChecking=no -p 2222 -i tpot.pem tsec@172.31.13.157 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$PUB_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" || echo "TPot ssh failed"

echo "Keys successfully injected!"
