# 🏦 Fin Core - Sistema Financeiro com Blockchain

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  Sistema financeiro desenvolvido com <strong>NestJS</strong> e <strong>Clean Architecture</strong>, implementando um ledger blockchain para garantir a integridade das transações financeiras.
</p>

## 📋 Sobre o Projeto

Este é um **desafio técnico** que implementa um sistema financeiro completo com as seguintes características:

- ✅ **Clean Architecture** com separação clara de responsabilidades
- ✅ **Ledger Blockchain** para garantir integridade das transações
- ✅ **Transações Atômicas** com controle de concorrência
- ✅ **API RESTful** completa com validações
- ✅ **Testes Abrangentes** (Unit, Integration, E2E)
- ✅ **Auditoria Completa** com verificação de cadeia

## 🏗️ Arquitetura

```
src/
├── domain/           # Regras de negócio puras
│   ├── entities/     # Entidades de domínio
│   ├── repositories/ # Interfaces de repositório
│   └── services/     # Serviços de domínio (ChainHasher)
├── application/      # Casos de uso
│   ├── use-cases/    # Lógica de aplicação
│   └── dto/          # Data Transfer Objects
├── infrastructure/   # Implementações técnicas
│   ├── db/          # TypeORM, entidades, migrations
│   └── repositories/ # Implementações de repositório
└── interfaces/      # Camada de apresentação
    ├── http/        # Controllers REST
    └── presenters/  # Formatadores de resposta
```

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- Docker e Docker Compose
- npm ou yarn

### 1. Clone e Instale
```bash
git clone <repository-url>
cd fin-core-luiza-labs
npm install
```

### 2. Configure o Banco de Dados com Docker Compose
```bash
# Subir o MySQL
docker-compose up -d mysql

# Aguardar o banco ficar pronto (healthcheck)
docker-compose ps
```

### 3. Configure as Variáveis de Ambiente
```bash
# .env
DB_HOST=localhost
DB_PORT=3306
DB_USER=app
DB_PASS=app
DB_NAME=fincore
DB_ROOT_PASS=root
PORT=3000
```

### 4. Execute as Migrations
```bash
npm run migration:run
```

### 5. Execute os Seeds (Opcional)
```bash
npm run seed:run
```

## 🏃‍♂️ Executando a Aplicação

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod

# Debug
npm run start:debug
```

**Importante:** Certifique-se de que o MySQL está rodando via Docker Compose:
```bash
# Verificar se o banco está ativo
docker-compose ps

# Se não estiver, subir o banco
docker-compose up -d mysql
```

A aplicação estará disponível em `http://localhost:3000`

## 🧪 Executando os Testes

### Estrutura de Testes
```
test/
├── unit/              # Testes unitários (mocks)
├── integration/       # Testes de integração (banco real)
├── setup/            # Configurações globais
└── *.e2e-spec.ts     # Testes end-to-end
```

### Comandos de Teste
```bash
# Testes unitários
npm run test:unit
npm run test:unit:watch
npm run test:unit:cov

# Testes de integração
npm run test:integration
npm run test:integration:watch
npm run test:integration:cov

# Testes E2E
npm run test:e2e

# Todos os testes
npm run test:all
npm run test:all:cov
```

## 📚 Documentação da API

### Base URL
```
http://localhost:3000
```

### Headers Opcionais
```
Content-Type: application/json
idempotency-key: <string> # Para garantir idempotência
```

---

## 💰 Transações Financeiras

### 1. **Depósito** - `POST /transactions/deposit`

Adiciona fundos à uma conta.

**Payload:**
```json
{
  "accountNumber": "ACC-001",
  "amount": 150.25,
  "description": "seed deposit"
}
```

**Resposta:**
```json
{
  "balance": "1150.25",
  "entryId": 123,
  "hash": "a1b2c3d4e5f6..."
}
```

**Validações:**
- `accountNumber`: Obrigatório, string não vazia
- `amount`: Obrigatório, número positivo
- `description`: Opcional, string

---

### 2. **Saque** - `POST /transactions/withdraw`

Remove fundos de uma conta (com taxa).

**Payload:**
```json
{
  "accountNumber": "ACC-001",
  "amount": 50,
  "description": "atm cash"
}
```

**Resposta:**
```json
{
  "balance": "1098.50",
  "entryId": 124,
  "hash": "b2c3d4e5f6a1..."
}
```

**Taxa de Saque:**
- Taxa fixa: R$ 1,00
- Taxa variável: 0,5% do valor
- Exemplo: R$ 50,00 = R$ 1,00 + R$ 0,25 = R$ 1,25

**Validações:**
- Verifica saldo + limite de crédito
- `amount`: Deve ser positivo
- Conta deve existir

---

### 3. **Transferência** - `POST /transactions/transfer`

Transfere fundos entre contas.

**Payload:**
```json
{
  "from": "ACC-001",
  "to": "ACC-002",
  "amount": 25.5,
  "description": "pix test"
}
```

**Resposta:**
```json
{
  "outTxId": 125,
  "inTxId": 126,
  "originAfter": "1071.75",
  "destAfter": "525.50"
}
```

**Taxa de Transferência:**
- Taxa fixa: R$ 1,00
- Taxa variável: 0,5% do valor
- Cobrada apenas da conta origem

**Validações:**
- `from` e `to` devem ser diferentes
- Ambas as contas devem existir
- Saldo suficiente na conta origem

---

### 4. **Processamento em Lote** - `POST /transactions/batch`

Processa múltiplas transações em uma única requisição.

**Payload:**
```json
{
  "items": [
    {
      "type": "DEPOSIT",
      "accountNumber": "ACC-001",
      "amount": 100,
      "description": "batch dep"
    },
    {
      "type": "TRANSFER",
      "from": "ACC-001",
      "to": "ACC-002",
      "amount": 30,
      "description": "batch trf"
    },
    {
      "type": "WITHDRAW",
      "accountNumber": "ACC-002",
      "amount": 10,
      "description": "batch wdr"
    }
  ]
}
```

**Resposta:**
```json
{
  "processed": 3,
  "failed": 0,
  "results": [
    { "success": true, "entryId": 127 },
    { "success": true, "outTxId": 128, "inTxId": 129 },
    { "success": true, "entryId": 130 }
  ]
}
```

**Tipos Suportados:**
- `DEPOSIT`: Requer `accountNumber`, `amount`, `description` (opcional)
- `WITHDRAW`: Requer `accountNumber`, `amount`, `description` (opcional)
- `TRANSFER`: Requer `from`, `to`, `amount`, `description` (opcional)

---

## 🔍 Auditoria e Verificação

### 1. **Verificar Integridade da Cadeia** - `GET /audit/verify/{accountNumber}`

Verifica se a cadeia de blocos está íntegra.

**Exemplo:**
```bash
GET /audit/verify/ACC-001
```

**Resposta (Sucesso):**
```json
{
  "ok": true,
  "height": "15",
  "head": "f6a1b2c3d4e5..."
}
```

**Resposta (Erro):**
```json
{
  "ok": false,
  "brokenAt": "8",
  "expectedPrev": "a1b2c3d4e5f6...",
  "gotPrev": "wrong_hash_here"
}
```

---

### 2. **Consultar Ledger** - `GET /audit/ledger/{accountNumber}`

Lista todas as transações de uma conta com paginação e filtros.

**Parâmetros de Query:**
- `page`: Número da página (padrão: 1)
- `limit`: Itens por página (padrão: 20)
- `type`: Filtrar por tipo (`DEPOSIT`, `WITHDRAW`, `TRANSFER_OUT`, `TRANSFER_IN`)
- `from`: Data inicial (ISO 8601)
- `to`: Data final (ISO 8601)

**Exemplo:**
```bash
GET /audit/ledger/ACC-001?page=1&limit=10&type=TRANSFER_OUT&from=2024-01-01T00:00:00Z
```

**Resposta:**
```json
{
  "ok": true,
  "page": 1,
  "limit": 10,
  "total": 25,
  "items": [
    {
      "id": 125,
      "type": "TRANSFER_OUT",
      "amount": "25.50",
      "fee": "1.13",
      "description": "pix test",
      "occurredAt": "2024-01-15T14:30:25.123Z",
      "height": "15",
      "prevHash": "a1b2c3d4e5f6...",
      "hash": "b2c3d4e5f6a1...",
      "relatedTxId": 126
    }
  ]
}
```

---

### 3. **Consultar Entrada por Hash** - `GET /audit/entry/{hash}`

Busca uma transação específica pelo seu hash.

**Exemplo:**
```bash
GET /audit/entry/b2c3d4e5f6a1...
```

**Resposta:**
```json
{
  "ok": true,
  "entry": {
    "id": 125,
    "accountNumber": "ACC-001",
    "type": "TRANSFER_OUT",
    "amount": "25.50",
    "fee": "1.13",
    "description": "pix test",
    "occurredAt": "2024-01-15T14:30:25.123Z",
    "height": "15",
    "prevHash": "a1b2c3d4e5f6...",
    "hash": "b2c3d4e5f6a1...",
    "relatedTxId": 126,
    "createdAt": "2024-01-15T14:30:25.123Z"
  }
}
```

---

## 🔐 Segurança e Integridade

### Blockchain Ledger
- Cada transação gera um hash SHA-256 único
- Hash inclui: conta, tipo, valor, taxa, timestamp, hash anterior
- Cadeia imutável e verificável
- Prevenção de alterações não autorizadas

### Transações Atômicas
- Todas as operações são transacionais
- Rollback automático em caso de erro
- Controle de concorrência com locks pessimistas
- Isolamento SERIALIZABLE para transferências

### Validações
- Validação de entrada com class-validator
- Verificação de saldo e limites
- Prevenção de transações inválidas
- Tratamento de erros padronizado

---

## 📊 Exemplos de Uso

### Fluxo Completo de Transações
```bash
# 1. Criar conta e fazer depósito inicial
curl -X POST http://localhost:3000/transactions/deposit \
  -H "Content-Type: application/json" \
  -d '{"accountNumber": "ACC-001", "amount": 1000, "description": "Initial deposit"}'

# 2. Fazer saque
curl -X POST http://localhost:3000/transactions/withdraw \
  -H "Content-Type: application/json" \
  -d '{"accountNumber": "ACC-001", "amount": 100, "description": "ATM withdrawal"}'

# 3. Transferir para outra conta
curl -X POST http://localhost:3000/transactions/transfer \
  -H "Content-Type: application/json" \
  -d '{"from": "ACC-001", "to": "ACC-002", "amount": 50, "description": "PIX transfer"}'

# 4. Verificar integridade
curl http://localhost:3000/audit/verify/ACC-001

# 5. Consultar histórico
curl "http://localhost:3000/audit/ledger/ACC-001?limit=5"
```

### Processamento em Lote
```bash
curl -X POST http://localhost:3000/transactions/batch \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"type": "DEPOSIT", "accountNumber": "ACC-001", "amount": 100},
      {"type": "TRANSFER", "from": "ACC-001", "to": "ACC-002", "amount": 50},
      {"type": "WITHDRAW", "accountNumber": "ACC-002", "amount": 25}
    ]
  }'
```

---

## 🛠️ Desenvolvimento

### Scripts Disponíveis
```bash
# Desenvolvimento
npm run start:dev          # Modo desenvolvimento com watch
npm run start:debug        # Modo debug

# Build e Produção
npm run build              # Compilar TypeScript
npm run start:prod         # Executar versão compilada

# Testes
npm run test:unit          # Testes unitários
npm run test:integration   # Testes de integração
npm run test:e2e           # Testes end-to-end
npm run test:all           # Todos os testes

# Qualidade de Código
npm run lint               # ESLint
npm run format             # Prettier

# Banco de Dados
npm run migration:create   # Criar nova migration
npm run migration:run      # Executar migrations
npm run migration:revert   # Reverter última migration
npm run seed:run           # Executar seeds
```

---

## 📈 Monitoramento e Logs

### Logs da Aplicação
- Todas as transações são logadas
- Erros com stack trace completo
- Métricas de performance
- Auditoria de acesso

### Health Check
```bash
GET /health
```

### Métricas
- Número de transações por minuto
- Tempo médio de resposta
- Taxa de erro
- Uso de recursos

---

## 🚀 Deploy

### Docker Compose
A aplicação utiliza Docker Compose para gerenciar o banco de dados MySQL. A aplicação Node.js roda localmente.

```bash
# Subir apenas o banco de dados
docker-compose up -d mysql

# Verificar status
docker-compose ps

# Parar serviços
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose down -v
```

### Configuração do Docker Compose
O arquivo `docker-compose.yml` configura:
- **MySQL 8.0** com healthcheck
- **Volume persistente** para dados
- **Variáveis de ambiente** configuráveis
- **Porta 3306** exposta

### Variáveis de Ambiente
```bash
# .env
DB_ROOT_PASS=root
DB_NAME=fincore
DB_USER=app
DB_PASS=app
DB_PORT=3306
DB_HOST=localhost
PORT=3000
```
---

<p align="center">
  Desenvolvido com ❤️ usando NestJS e Clean Architecture
</p>