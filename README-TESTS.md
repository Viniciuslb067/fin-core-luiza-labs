# Estrutura de Testes - Fin Core Luiza Labs

## 📁 Organização dos Testes

Os testes estão organizados em uma estrutura hierárquica clara:

```
test/
├── unit/                          # Testes unitários
│   ├── domain/
│   │   └── services/
│   │       └── ChainHasher.spec.ts
│   ├── application/
│   │   └── use-cases/
│   │       ├── Transfer.usecase.spec.ts
│   │       ├── VerifyChain.usecase.spec.ts
│   │       ├── Deposit.usecase.spec.ts
│   │       └── Withdraw.usecase.spec.ts
│   └── interfaces/
│       └── http/
│           └── transactions.controller.spec.ts
├── integration/                   # Testes de integração
│   └── use-cases/
│       └── transfer.integration.spec.ts
├── setup/                        # Configurações globais
│   ├── unit.setup.ts
│   └── integration.setup.ts
├── app.e2e-spec.ts              # Testes E2E existentes
├── transactions.e2e-spec.ts     # Testes E2E de transações
└── jest-e2e.json               # Configuração E2E
```

## 🧪 Tipos de Testes

### 1. **Testes Unitários** (`test/unit/`)
- **Objetivo**: Testar componentes isolados com mocks
- **Cobertura**: Lógica de negócio, validações, cálculos
- **Execução**: Rápida, sem dependências externas

**Componentes testados:**
- ✅ `ChainHasher` - Algoritmo de hash de ledger
- ✅ `TransferUseCase` - Lógica de transferência
- ✅ `VerifyChainUseCase` - Verificação de integridade
- ✅ `DepositUseCase` - Lógica de depósito
- ✅ `WithdrawUseCase` - Lógica de saque
- ✅ `TransactionsController` - Validação de entrada

### 2. **Testes de Integração** (`test/integration/`)
- **Objetivo**: Testar interação entre componentes com banco real
- **Cobertura**: Transações, persistência, concorrência
- **Execução**: Mais lenta, requer banco de dados

**Cenários testados:**
- ✅ Transferência completa com banco de dados
- ✅ Validação de fundos insuficientes
- ✅ Concorrência e consistência de dados
- ✅ Tratamento de erros de validação

### 3. **Testes E2E** (`test/`)
- **Objetivo**: Testar fluxos completos via API HTTP
- **Cobertura**: Endpoints, validações, respostas
- **Execução**: Mais lenta, aplicação completa

**Endpoints testados:**
- ✅ `POST /transactions/deposit`
- ✅ `POST /transactions/withdraw`
- ✅ `POST /transactions/transfer`
- ✅ `POST /transactions/batch`
- ✅ `GET /transactions/verify/:accountNumber`

## 🚀 Comandos de Execução

### Testes Unitários
```bash
# Executar todos os testes unitários
npm run test:unit

# Executar com watch mode
npm run test:unit:watch

# Executar com cobertura
npm run test:unit:cov
```

### Testes de Integração
```bash
# Executar todos os testes de integração
npm run test:integration

# Executar com watch mode
npm run test:integration:watch

# Executar com cobertura
npm run test:integration:cov
```

### Testes E2E
```bash
# Executar testes E2E
npm run test:e2e
```

### Todos os Testes
```bash
# Executar todos os tipos de teste
npm run test:all

# Executar todos com cobertura
npm run test:all:cov
```

## ⚙️ Configurações

### Jest Unit Tests (`jest.unit.json`)
- **Root**: `test/unit/`
- **Pattern**: `*.spec.ts`
- **Timeout**: 10s
- **Coverage**: `coverage/unit/`

### Jest Integration Tests (`jest.integration.json`)
- **Root**: `test/integration/`
- **Pattern**: `*.integration.spec.ts`
- **Timeout**: 30s
- **Coverage**: `coverage/integration/`

### Jest E2E Tests (`test/jest-e2e.json`)
- **Root**: `test/`
- **Pattern**: `*.e2e-spec.ts`
- **Timeout**: Padrão

## 🎯 Estratégia de Testes

### **Prioridade 1 - Componentes Críticos**
1. **ChainHasher** - Algoritmo de hash (segurança)
2. **TransferUseCase** - Lógica mais complexa
3. **VerifyChainUseCase** - Verificação de integridade

### **Prioridade 2 - Operações Financeiras**
1. **DepositUseCase** - Operações de crédito
2. **WithdrawUseCase** - Operações de débito
3. **ProcessBatchUseCase** - Processamento em lote

### **Prioridade 3 - Interface**
1. **TransactionsController** - Validação de entrada
2. **AuditController** - Auditoria

## 🔧 Setup e Configuração

### Variáveis de Ambiente para Testes
```bash
# Testes de Integração
NODE_ENV=test
DB_NAME=fincore_test
DB_HOST=localhost
DB_PORT=3306
DB_USER=test
DB_PASS=test
```

### Dependências de Teste
- `@nestjs/testing` - Framework de testes NestJS
- `jest` - Runner de testes
- `supertest` - Testes HTTP
- `@faker-js/faker` - Dados de teste

## 📊 Cobertura de Testes

### Métricas Esperadas
- **Unit Tests**: > 90% cobertura
- **Integration Tests**: > 80% cobertura
- **E2E Tests**: > 70% cobertura

### Relatórios
- Unit: `coverage/unit/lcov-report/index.html`
- Integration: `coverage/integration/lcov-report/index.html`

## 🐛 Debugging

### Testes Unitários
```bash
npm run test:debug
```

### Testes Específicos
```bash
# Executar apenas um arquivo
npm run test:unit -- --testPathPattern=Transfer.usecase.spec.ts

# Executar com verbose
npm run test:unit -- --verbose
```

## 📝 Convenções

### Nomenclatura
- **Unit**: `*.spec.ts`
- **Integration**: `*.integration.spec.ts`
- **E2E**: `*.e2e-spec.ts`

### Estrutura de Teste
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something when condition', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Mocks
- Use `jest.fn()` para funções
- Use `jest.Mock` para tipagem
- Mock apenas dependências externas

## 🔄 CI/CD

### Pipeline de Testes
1. **Lint** - Verificar código
2. **Unit Tests** - Testes rápidos
3. **Integration Tests** - Testes com banco
4. **E2E Tests** - Testes completos
5. **Coverage Report** - Relatório de cobertura

### Comandos CI
```bash
# Pipeline completo
npm run lint && npm run test:all:cov
```
