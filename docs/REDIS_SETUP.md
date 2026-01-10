# 🔴 Redis Setup - SUSMI

O SUSMI usa Redis para cache e gerenciamento de filas. Aqui estão várias formas de configurá-lo:

## 🐳 Opção 1: Docker (Recomendado)

### Iniciar Redis com Docker

```bash
# Iniciar Redis
docker run -d \
  --name susmi-redis \
  -p 6379:6379 \
  redis:alpine

# Verificar se está rodando
docker ps | grep redis

# Testar conexão
redis-cli ping
# Deve retornar: PONG
```

### Comandos úteis Docker

```bash
# Parar Redis
docker stop susmi-redis

# Iniciar Redis novamente
docker start susmi-redis

# Ver logs
docker logs susmi-redis

# Remover container
docker rm -f susmi-redis
```

---

## 💻 Opção 2: Redis no Windows

### Usando WSL2 (Recomendado para Windows)

```bash
# No WSL2 (Ubuntu)
sudo apt update
sudo apt install redis-server

# Iniciar Redis
sudo service redis-server start

# Verificar status
sudo service redis-server status

# Testar
redis-cli ping
```

### Redis Native para Windows (Legado)

⚠️ Redis oficial não suporta Windows, mas há builds da comunidade:

1. **Download**:
   - https://github.com/microsoftarchive/redis/releases
   - Baixe `Redis-x64-xxx.msi`

2. **Instalar**:
   - Execute o instalador
   - Marque "Add to PATH"
   - Inicie o serviço

3. **Testar**:
   ```bash
   redis-cli ping
   ```

---

## 🍎 Opção 3: Redis no macOS

```bash
# Instalar com Homebrew
brew install redis

# Iniciar Redis
brew services start redis

# Verificar status
brew services list

# Testar
redis-cli ping

# Parar Redis
brew services stop redis
```

---

## 🐧 Opção 4: Redis no Linux

### Ubuntu/Debian

```bash
# Instalar
sudo apt update
sudo apt install redis-server

# Iniciar
sudo systemctl start redis

# Habilitar no boot
sudo systemctl enable redis

# Status
sudo systemctl status redis

# Testar
redis-cli ping
```

### Fedora/RHEL

```bash
# Instalar
sudo dnf install redis

# Iniciar
sudo systemctl start redis

# Status
sudo systemctl status redis
```

---

## ☁️ Opção 5: Redis na Cloud (Produção)

Para produção, use serviços gerenciados:

### Upstash (Grátis para começar)
1. Acesse: https://upstash.com
2. Crie um database Redis
3. Copie a URL de conexão
4. Atualize `.env`:
   ```env
   REDIS_URL=rediss://default:xxxx@xxxx.upstash.io:6379
   ```

### Redis Cloud
1. Acesse: https://redis.com/try-free/
2. Crie uma instância grátis
3. Copie as credenciais
4. Atualize `.env`

### AWS ElastiCache / Azure Cache / Google Cloud Memorystore
- Configure conforme documentação do provedor

---

## 🧪 Testar Conexão Redis

### Método 1: CLI

```bash
redis-cli ping
# Resposta: PONG
```

### Método 2: Comandos básicos

```bash
# Conectar
redis-cli

# Testar SET/GET
127.0.0.1:6379> SET test "Hello Redis"
OK
127.0.0.1:6379> GET test
"Hello Redis"
127.0.0.1:6379> exit
```

### Método 3: Node.js (usar script do projeto)

```bash
pnpm test:connection
```

---

## ⚙️ Configurar no SUSMI

O arquivo `.env` já está configurado:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=3600
```

### Usar Redis remoto (Upstash, etc):

```env
# Opção 1: URL completa
REDIS_URL=rediss://default:password@host:port

# Opção 2: Detalhado
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
REDIS_TTL=3600
REDIS_TLS=true
```

---

## 🚫 Desabilitar Redis Temporariamente

Se não quiser usar Redis agora:

### apps/api/src/app.module.ts

```typescript
@Module({
  imports: [
    // ... outros imports
    // RedisModule,  // <- Comentar esta linha
  ],
})
```

⚠️ **Nota**: Algumas funcionalidades podem não funcionar sem Redis (cache, filas).

---

## 📊 Monitorar Redis

### Ver estatísticas

```bash
redis-cli info

# Ou apenas estatísticas de memória
redis-cli info memory

# Ou estatísticas de clientes
redis-cli info clients
```

### Monitor em tempo real

```bash
redis-cli monitor
```

### Ver todas as chaves

```bash
redis-cli keys "*"
```

### Limpar tudo (CUIDADO!)

```bash
redis-cli FLUSHALL
```

---

## 🔧 Troubleshooting

### Erro: "ECONNREFUSED 127.0.0.1:6379"

Redis não está rodando. Inicie com:
- Docker: `docker start susmi-redis`
- Linux: `sudo systemctl start redis`
- macOS: `brew services start redis`
- WSL2: `sudo service redis-server start`

### Erro: "NOAUTH Authentication required"

Redis precisa de senha. Configure no `.env`:
```env
REDIS_PASSWORD=sua-senha
```

### Porta já em uso

```bash
# Ver o que está usando a porta 6379
lsof -ti:6379 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :6379   # Windows
```

---

## ✅ Checklist Redis

- [ ] Redis instalado/Docker rodando
- [ ] Redis iniciado
- [ ] `redis-cli ping` retorna PONG
- [ ] `.env` configurado corretamente
- [ ] API conecta sem erros
- [ ] `pnpm test:connection` passa

---

**Pronto!** Redis configurado e pronto para uso! 🎉
