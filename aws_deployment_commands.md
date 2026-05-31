# AWS Deployment — Step-by-Step Commands

> [!IMPORTANT]
> Execute these steps **in order**. Each phase depends on the previous one.

---

## Your EC2 Instances

| Instance | Private IP | Public IP | .pem File |
|---|---|---|---|
| Web Server | 172.31.22.42 | 13.63.1.228 | `web.pem` |
| Wazuh | 172.31.41.10 | ? | `wazuh.pem` |
| n8n | 172.31.30.123 | ? | `n8n.pem` |
| AI Models | 172.31.25.6 | ? | `ai.pem` |
| T-Pot | 172.31.13.157 | ? | `tpot.pem` |
| Threat Server | 172.31.27.162 | ? | `threat.pem` |
| DFWS | 172.31.36.190 | ? | `dfws.pem` |

> [!NOTE]
> Replace `?.pem` with your actual `.pem` file names for each instance. You said each instance has a different key.

---

## Phase 1: Security Groups (AWS Console or CLI)

### Option A: AWS Console (Easiest)

1. Go to **AWS Console → EC2 → Security Groups → Create Security Group**
2. Name: `ng-soc-internal`
3. VPC: Select the same VPC all instances are in
4. Add these **Inbound Rules**:

| Port | Protocol | Source | Description |
|---|---|---|---|
| 22 | TCP | `sg-XXXXXXXX` (itself) | SSH between nodes |
| 3000 | TCP | `sg-XXXXXXXX` (itself) | NG-SENTRA backend |
| 5678 | TCP | `sg-XXXXXXXX` (itself) | n8n SOAR |
| 9200 | TCP | `sg-XXXXXXXX` (itself) | Elasticsearch |
| 443 | TCP | `sg-XXXXXXXX` (itself) | Wazuh Dashboard HTTPS |
| 5601 | TCP | `sg-XXXXXXXX` (itself) | Wazuh Dashboard |
| 1514 | TCP | `sg-XXXXXXXX` (itself) | Wazuh Agent |
| 1515 | TCP | `sg-XXXXXXXX` (itself) | Wazuh Registration |
| 5000 | TCP | `sg-XXXXXXXX` (itself) | AI Brain API |
| 5044 | TCP | `sg-XXXXXXXX` (itself) | Filebeat |
| 64297 | TCP | `sg-XXXXXXXX` (itself) | T-Pot Dashboard |
| 6333 | TCP | `sg-XXXXXXXX` (itself) | Qdrant |
| 80 | TCP | `0.0.0.0/0` | Public HTTP |
| 443 | TCP | `0.0.0.0/0` | Public HTTPS |

> [!TIP]
> For the "Source" field, after you create the Security Group, you can reference it by its own ID. This means "allow traffic from any instance that has this same SG attached." This is the cleanest way to do it.

5. Click **Create Security Group**
6. Go to **EC2 → Instances**, select **ALL 7 instances** one at a time:
   - Right-click → **Security → Change Security Groups**
   - Add `ng-soc-internal` → Save

### Option B: AWS CLI (from your local machine)

```bash
# Get your VPC ID first
aws ec2 describe-vpcs --query "Vpcs[0].VpcId" --output text

# Create the security group (replace vpc-XXXXX with your VPC ID)
SG_ID=$(aws ec2 create-security-group \
  --group-name ng-soc-internal \
  --description "NG-SOC internal communication" \
  --vpc-id vpc-XXXXX \
  --query "GroupId" --output text)

echo "Created Security Group: $SG_ID"

# Add all required inbound rules (self-referencing)
for PORT in 22 3000 5678 9200 443 5601 1514 1515 5000 5044 64297 6333; do
  aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port $PORT \
    --source-group $SG_ID
done

# Add public HTTP/HTTPS (for Web Server)
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0

# Attach to all instances (replace with your actual instance IDs)
for INSTANCE_ID in i-web123 i-wazuh123 i-n8n123 i-ai123 i-tpot123 i-threat123 i-dfws123; do
  aws ec2 modify-instance-attribute \
    --instance-id $INSTANCE_ID \
    --groups $SG_ID
done
```

> [!WARNING]
> The `modify-instance-attribute --groups` command **replaces** all SGs. If your instances already have other SGs, list them all: `--groups sg-existing $SG_ID`

---

## Phase 2: SSH Key Distribution

### Step 2.1: SSH into Web Server

```bash
# From your Windows machine (PowerShell/CMD):
ssh -i web.pem ubuntu@13.63.1.228
```

### Step 2.2: Generate an internal SSH key pair (on Web Server)

```bash
# On the Web Server EC2:
ssh-keygen -t ed25519 -f /home/ubuntu/.ssh/ng-soc-key -N ""
cat /home/ubuntu/.ssh/ng-soc-key.pub
```

**Copy the output** (it will look like `ssh-ed25519 AAAA... ubuntu@ip-172-31-22-42`). You'll paste this into every other EC2 instance.

### Step 2.3: Add the public key to each EC2 instance

You need to SSH into each instance separately from your Windows machine (using their individual `.pem` files), and paste the public key:

```bash
# ─── Wazuh Server ─────────────────────────────────────────────
# From your Windows machine:
ssh -i wazuh.pem ubuntu@172.31.41.10
# Then on the Wazuh server:
echo "ssh-ed25519 AAAA...PASTE_YOUR_KEY_HERE..." >> /home/ubuntu/.ssh/authorized_keys
exit

# ─── n8n Server ───────────────────────────────────────────────
ssh -i n8n.pem ubuntu@172.31.30.123
echo "ssh-ed25519 AAAA...PASTE_YOUR_KEY_HERE..." >> /home/ubuntu/.ssh/authorized_keys
exit

# ─── AI Models Server ────────────────────────────────────────
ssh -i ai.pem ubuntu@172.31.25.6
echo "ssh-ed25519 AAAA...PASTE_YOUR_KEY_HERE..." >> /home/ubuntu/.ssh/authorized_keys
exit

# ─── T-Pot Server ────────────────────────────────────────────
ssh -i tpot.pem ubuntu@172.31.13.157
echo "ssh-ed25519 AAAA...PASTE_YOUR_KEY_HERE..." >> /home/ubuntu/.ssh/authorized_keys
exit

# ─── Threat Server ───────────────────────────────────────────
ssh -i threat.pem ubuntu@172.31.27.162
echo "ssh-ed25519 AAAA...PASTE_YOUR_KEY_HERE..." >> /home/ubuntu/.ssh/authorized_keys
exit

# ─── DFWS Server ─────────────────────────────────────────────
ssh -i dfws.pem ubuntu@172.31.36.190
echo "ssh-ed25519 AAAA...PASTE_YOUR_KEY_HERE..." >> /home/ubuntu/.ssh/authorized_keys
exit
```

> [!IMPORTANT]
> If you can't SSH into an instance using its private IP from your Windows machine, use the **public IP** instead. You can find each instance's public IP in the AWS Console.

### Step 2.4: Test from Web Server

```bash
# SSH back into the Web Server:
ssh -i web.pem ubuntu@13.63.1.228

# Test connectivity to each node:
ssh -i /home/ubuntu/.ssh/ng-soc-key ubuntu@172.31.41.10 "echo 'Wazuh OK'"
ssh -i /home/ubuntu/.ssh/ng-soc-key ubuntu@172.31.30.123 "echo 'n8n OK'"
ssh -i /home/ubuntu/.ssh/ng-soc-key ubuntu@172.31.25.6 "echo 'AI OK'"
ssh -i /home/ubuntu/.ssh/ng-soc-key ubuntu@172.31.13.157 "echo 'T-Pot OK'"
ssh -i /home/ubuntu/.ssh/ng-soc-key ubuntu@172.31.27.162 "echo 'Threat OK'"
ssh -i /home/ubuntu/.ssh/ng-soc-key ubuntu@172.31.36.190 "echo 'DFWS OK'"
```

You should see `Wazuh OK`, `n8n OK`, etc. for each one. If any fail, the Security Group is missing or the key wasn't added correctly.

---

## Phase 3: Fix Docker Binding on Each EC2

### n8n Server (172.31.30.123)

```bash
ssh -i n8n.pem ubuntu@172.31.30.123

# Check how n8n is running
docker ps

# If n8n binds to 127.0.0.1, restart it with 0.0.0.0:
# Stop the current container first:
docker stop n8n-soc  # or whatever the container name is
docker rm n8n-soc

# Re-run with correct binding:
docker run -d \
  --name n8n-soc \
  --restart=always \
  -p 0.0.0.0:5678:5678 \
  -e N8N_HOST=0.0.0.0 \
  -e WEBHOOK_URL=http://172.31.30.123:5678 \
  -v /home/ubuntu/.n8n:/home/node/.n8n \
  n8nio/n8n

# Verify it's listening on 0.0.0.0:
ss -tlnp | grep 5678
# Should show: 0.0.0.0:5678
```

### AI Models Server (172.31.25.6)

```bash
ssh -i ai.pem ubuntu@172.31.25.6

# Check if your Python server binds to 0.0.0.0
# If using Waitress:
# In your Python code, ensure: serve(app, host='0.0.0.0', port=5000)
# If using Flask directly: app.run(host='0.0.0.0', port=5000)

# Verify:
ss -tlnp | grep 5000
# Should show: 0.0.0.0:5000 (NOT 127.0.0.1:5000)
```

### Wazuh Server (172.31.41.10)

```bash
ssh -i wazuh.pem ubuntu@172.31.41.10

# Check Elasticsearch/OpenSearch binding:
sudo grep "network.host" /etc/wazuh-indexer/opensearch.yml

# If it says 127.0.0.1 or localhost, change it:
sudo sed -i 's/network.host: .*/network.host: 0.0.0.0/' /etc/wazuh-indexer/opensearch.yml
sudo systemctl restart wazuh-indexer

# Verify:
ss -tlnp | grep 9200
# Should show: 0.0.0.0:9200

# Also check Wazuh Dashboard:
ss -tlnp | grep 443
```

---

## Phase 4: Deploy Code to Web Server EC2

### Step 4.1: Push your code to GitHub

```bash
# From your Windows machine (PowerShell) in c:\Users\ZIAD\ng-sentra:
git add -A
git commit -m "feat: AWS distributed architecture migration - replace local IPs with EC2 private IPs, add SSH key auth"
git push origin main
```

### Step 4.2: Pull code on Web Server EC2

```bash
ssh -i web.pem ubuntu@13.63.1.228

# Clone or pull the repo
cd /home/ubuntu
git clone https://github.com/ZiadMahmoud2003/ng-sentra.git
# OR if already cloned:
cd /home/ubuntu/ng-sentra
git pull origin main

# Install dependencies
npm install -g pnpm
pnpm install

# Copy .env.local to the server
# Option 1: SCP from your Windows machine
# (From a new PowerShell window on Windows):
scp -i web.pem c:\Users\ZIAD\ng-sentra\.env.local ubuntu@13.63.1.228:/home/ubuntu/ng-sentra/.env.local

# Option 2: Or just create it manually on the server:
nano /home/ubuntu/ng-sentra/.env.local
# Paste the contents and save
```

### Step 4.3: Run seed scripts

```bash
cd /home/ubuntu/ng-sentra

# Seed components with new AWS IPs
npx tsx server/seed.ts

# Seed system settings with new AWS IPs
npx tsx server/seed-settings.ts
```

### Step 4.4: Build and start the application

```bash
# Option A: Development mode (for testing)
pnpm dev

# Option B: Production mode
pnpm build
pnpm start

# Option C: Run with PM2 (recommended for production)
npm install -g pm2
pm2 start "pnpm start" --name ng-sentra
pm2 save
pm2 startup  # Makes it survive reboots
```

---

## Phase 5: Install and Configure Nginx

```bash
# On Web Server EC2 (172.31.22.42):
ssh -i web.pem ubuntu@13.63.1.228

# Install Nginx
sudo apt update
sudo apt install -y nginx

# Copy the nginx config
sudo cp /home/ubuntu/ng-sentra/nginx/nginx.conf /etc/nginx/sites-available/ng-sentra

# Remove default site and enable ours
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/ng-sentra /etc/nginx/sites-enabled/ng-sentra

# Create SSL directory
sudo mkdir -p /etc/nginx/ssl
```

### SSL Certificate Options

#### Option A: Cloudflare Origin Certificate (Recommended since you own ngsentra.com on Cloudflare)

1. Go to **Cloudflare Dashboard → ngsentra.com → SSL/TLS → Origin Server**
2. Click **Create Certificate**
3. Keep defaults (RSA 2048, 15 years)
4. **Copy the Origin Certificate** (PEM) → save as `ng-sentra.crt`
5. **Copy the Private Key** (PEM) → save as `ng-sentra.key`

```bash
# On Web Server, paste the certificate:
sudo nano /etc/nginx/ssl/ng-sentra.crt
# Paste the Origin Certificate content, save

sudo nano /etc/nginx/ssl/ng-sentra.key
# Paste the Private Key content, save

sudo chmod 600 /etc/nginx/ssl/ng-sentra.key
```

#### Option B: Self-Signed (Quick Testing)

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/ng-sentra.key \
  -out /etc/nginx/ssl/ng-sentra.crt \
  -subj "/C=EG/ST=Cairo/L=Cairo/O=NG-SENTRA/CN=ngsentra.com"
```

### Test and Start Nginx

```bash
# Test the config
sudo nginx -t

# If it says "syntax is ok" and "test is successful":
sudo systemctl restart nginx
sudo systemctl enable nginx

# Verify Nginx is running:
sudo systemctl status nginx
curl -k https://localhost
```

---

## Phase 6: Point ngsentra.com to AWS

### In Cloudflare Dashboard:

1. Go to **ngsentra.com → DNS**
2. Add an **A Record**:
   - Name: `@` (root domain)
   - IPv4: `13.63.1.228` (Web Server public IP)
   - Proxy: **Proxied** (orange cloud) ← this gives you Cloudflare's DDoS protection + SSL
3. Add another **A Record** (optional):
   - Name: `www`
   - IPv4: `13.63.1.228`
   - Proxy: **Proxied**
4. Go to **SSL/TLS → Overview**:
   - Set mode to **Full (strict)** if using Origin Certificate
   - Set mode to **Full** if using self-signed certificate

### Verify:

```bash
# Wait 1-2 minutes for DNS propagation, then:
curl https://ngsentra.com
# or just open it in your browser!
```

---

## Phase 7: Start Qdrant on Web Server

```bash
# On Web Server:
docker run -d \
  --name qdrant \
  --restart=always \
  -p 0.0.0.0:6333:6333 \
  qdrant/qdrant

# Verify:
curl http://localhost:6333/collections
```

---

## 🔍 Full Verification Checklist

Run ALL of these **from the Web Server EC2**:

```bash
echo "=== 1. SSH Connectivity ==="
ssh -i /home/ubuntu/.ssh/ng-soc-key ubuntu@172.31.41.10 "echo 'Wazuh SSH: OK'" 2>/dev/null || echo "Wazuh SSH: FAILED"
ssh -i /home/ubuntu/.ssh/ng-soc-key ubuntu@172.31.30.123 "echo 'n8n SSH: OK'" 2>/dev/null || echo "n8n SSH: FAILED"
ssh -i /home/ubuntu/.ssh/ng-soc-key ubuntu@172.31.25.6 "echo 'AI SSH: OK'" 2>/dev/null || echo "AI SSH: FAILED"
ssh -i /home/ubuntu/.ssh/ng-soc-key ubuntu@172.31.13.157 "echo 'T-Pot SSH: OK'" 2>/dev/null || echo "T-Pot SSH: FAILED"

echo ""
echo "=== 2. Port Connectivity ==="
nc -zw3 172.31.41.10 9200 && echo "Wazuh ES (9200): OK" || echo "Wazuh ES (9200): FAILED"
nc -zw3 172.31.41.10 443 && echo "Wazuh Dashboard (443): OK" || echo "Wazuh Dashboard (443): FAILED"
nc -zw3 172.31.30.123 5678 && echo "n8n (5678): OK" || echo "n8n (5678): FAILED"
nc -zw3 172.31.25.6 5000 && echo "AI Brain (5000): OK" || echo "AI Brain (5000): FAILED"
nc -zw3 172.31.13.157 64297 && echo "T-Pot (64297): OK" || echo "T-Pot (64297): FAILED"

echo ""
echo "=== 3. Service Health ==="
curl -sk -u admin:SecretPassword https://172.31.41.10:9200/_cluster/health?pretty 2>/dev/null | head -5 || echo "Wazuh ES: UNREACHABLE"
curl -s http://172.31.30.123:5678/healthz 2>/dev/null || echo "n8n: UNREACHABLE"
curl -s http://172.31.25.6:5000/status 2>/dev/null || echo "AI Brain: UNREACHABLE"
curl -s http://localhost:6333/collections 2>/dev/null | head -3 || echo "Qdrant: UNREACHABLE"
curl -s http://localhost:3000 2>/dev/null | head -3 && echo "NG-SENTRA: OK" || echo "NG-SENTRA: UNREACHABLE"

echo ""
echo "=== 4. Nginx ==="
sudo nginx -t 2>&1
curl -sk https://localhost | head -3 && echo "Nginx HTTPS: OK" || echo "Nginx: FAILED"

echo ""
echo "=== DONE ==="
```

---

## 🚨 Troubleshooting

### "Connection refused" on any port
```bash
# On the target EC2, check if the service is listening:
ss -tlnp | grep <PORT>
# If it shows 127.0.0.1, the service binds to localhost only — needs 0.0.0.0
```

### "Connection timed out" on any port
```bash
# Security Group is blocking it.
# Go to AWS Console → EC2 → Security Groups → verify the rules
```

### "Permission denied (publickey)" when SSHing
```bash
# 1. Check the key was added:
ssh -i <correct.pem> ubuntu@<IP> "cat ~/.ssh/authorized_keys"
# Look for your ng-soc-key.pub content

# 2. Check permissions:
ssh -i <correct.pem> ubuntu@<IP> "ls -la ~/.ssh/"
# authorized_keys should be 600 or 644
# .ssh directory should be 700
```

### Wazuh "socket hang up"
```bash
# This means Elasticsearch closed the connection. Common causes:
# 1. SSL mismatch — make sure you use https:// in the URL
# 2. Auth failed — verify username/password
# 3. Elasticsearch crashed — check logs:
ssh -i /home/ubuntu/.ssh/ng-soc-key ubuntu@172.31.41.10 "sudo journalctl -u wazuh-indexer --no-pager -n 20"
```

### n8n SSH to other EC2 fails
```bash
# n8n runs inside Docker — it can't see the host's SSH keys
# You need to mount the key into the container:
docker run -d \
  --name n8n-soc \
  -p 0.0.0.0:5678:5678 \
  -v /home/ubuntu/.n8n:/home/node/.n8n \
  -v /home/ubuntu/.ssh/ng-soc-key:/home/node/.ssh/ng-soc-key:ro \
  -e N8N_HOST=0.0.0.0 \
  n8nio/n8n
```
