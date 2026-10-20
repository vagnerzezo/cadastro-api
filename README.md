# API de Cadastro

API REST de cadastro e autenticação de usuários, feita com **Node.js**, **Express 5**, **Prisma** e **MongoDB**. As senhas são guardadas com hash **bcrypt** e a autenticação usa **JWT**.

## Sumário

- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Executando o projeto](#executando-o-projeto)
- [Modelo de dados](#modelo-de-dados)
- [Autenticação](#autenticação)
- [Endpoints](#endpoints)
- [Testando a API](#testando-a-api)
- [Melhorias futuras](#melhorias-futuras)

## Tecnologias

| Pacote | Versão | Uso |
|---|---|---|
| [Express](https://expressjs.com/) | ^5.3.0 | Servidor HTTP e rotas |
| [Prisma](https://www.prisma.io/) / `@prisma/client` | ^6.19.3 | ORM e acesso ao MongoDB |
| [bcrypt](https://www.npmjs.com/package/bcrypt) | ^6.0.0 | Hash das senhas |
| [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) | ^9.0.3 | Geração e validação dos tokens JWT |
| [dotenv](https://www.npmjs.com/package/dotenv) | ^18.0.8 | Carrega as variáveis do `.env` |

O projeto usa ES Modules (`"type": "module"` no `package.json`).

## Estrutura do projeto

```
cadastro/
├── server.js              # Ponto de entrada: cria o app Express e registra as rotas
├── routes/
│   ├── public.js          # Rotas sem autenticação (/register, /login)
│   └── private.js         # Rotas protegidas por JWT (/listUser, /user/:id)
├── middlewares/
│   └── auth.js            # Middleware que valida o token JWT
├── prisma/
│   └── schema.prisma      # Schema do banco (model User)
├── prisma.config.ts       # Configuração do Prisma CLI
├── generated/prisma/      # Prisma Client gerado (não versionado)
├── .env                   # Variáveis de ambiente (não versionado)
└── package.json
```

## Pré-requisitos

- **Node.js 22.18 ou superior.** As rotas importam o Prisma Client direto de um arquivo `.ts` (`generated/prisma/client.ts`), o que depende do suporte nativo do Node a TypeScript (type stripping), ativo por padrão a partir dessa versão.
- **npm**
- Um banco **MongoDB** acessível, como um cluster no [MongoDB Atlas](https://www.mongodb.com/atlas). O Prisma exige que o MongoDB rode como *replica set*, o que o Atlas já faz.

## Instalação

```bash
# 1. Entre na pasta do projeto
cd cadastro

# 2. Instale as dependências
npm install

# 3. Crie o arquivo .env (veja a seção abaixo)

# 4. Gere o Prisma Client em generated/prisma
npx prisma generate

# 5. Sincronize o schema com o banco (cria a coleção e o índice único do e-mail)
npx prisma db push
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/<nome-do-banco>?retryWrites=true&w=majority"
JWT_SECRET="uma-chave-secreta-longa-e-aleatoria"
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | String de conexão do MongoDB usada pelo Prisma |
| `JWT_SECRET` | Sim | Chave usada para assinar e validar os tokens JWT |

Para gerar uma chave segura:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> O `.env` está no `.gitignore`. Nunca suba credenciais para o repositório.

## Executando o projeto

```bash
node server.js
```

Para reiniciar automaticamente ao salvar arquivos:

```bash
node --watch server.js
```

O servidor sobe em **http://localhost:3000** e mostra `Servidor rodando` no terminal.

Se quiser usar `npm start` e `npm run dev`, adicione ao `package.json`:

```json
"scripts": {
  "start": "node server.js",
  "dev": "node --watch server.js"
}
```

## Modelo de dados

Definido em `prisma/schema.prisma`:

| Campo | Tipo | Observação |
|---|---|---|
| `id` | String (ObjectId) | Gerado automaticamente, mapeado para `_id` |
| `email` | String | Único |
| `name` | String | |
| `age` | Int | |
| `password` | String | Hash bcrypt (salt de 10 rounds) |
| `createdAt` | DateTime | Preenchido na criação |
| `updatedAt` | DateTime | Atualizado a cada alteração |

## Autenticação

1. O usuário se cadastra em `POST /register`.
2. Faz login em `POST /login` e recebe um **token JWT válido por 1 hora**. O token carrega o `id` do usuário.
3. Nas rotas privadas, envia o token no cabeçalho:

```
Authorization: Bearer <token>
```

O middleware `middlewares/auth.js` valida o token e coloca o id do usuário em `req.userId`. Sem token, ou com token inválido ou expirado, a resposta é `401`.

## Endpoints

### Públicos

#### `POST /register`

Cadastra um novo usuário.

**Corpo da requisição**

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "age": 28,
  "password": "minhasenha123"
}
```

**Respostas**

| Status | Descrição |
|---|---|
| `201` | Usuário criado; retorna o registro salvo |
| `500` | Erro no servidor (inclui e-mail já cadastrado ou campos faltando) |

```json
{
  "id": "6713f0c2a1b2c3d4e5f60789",
  "email": "maria@email.com",
  "name": "Maria Silva",
  "age": 28,
  "password": "$2b$10$...",
  "createdAt": "2026-10-20T12:00:00.000Z",
  "updatedAt": "2026-10-20T12:00:00.000Z"
}
```

#### `POST /login`

Autentica o usuário e devolve um token JWT.

**Corpo da requisição**

```json
{
  "email": "maria@email.com",
  "password": "minhasenha123"
}
```

**Respostas**

| Status | Corpo |
|---|---|
| `200` | O token JWT como string JSON, por exemplo `"eyJhbGciOiJIUzI1NiIs..."` |
| `404` | `{ "message": "Não foi possível encontrar um usuário " }` |
| `401` | `{ "message": "Senha errada" }` |
| `500` | `{ "message": "Erro no servidor, tente novamente mais tarde." }` |

### Privados (exigem token)

#### `GET /listUser`

Lista todos os usuários cadastrados, sem o campo `password`.

**Cabeçalho**

```
Authorization: Bearer <token>
```

**Respostas**

| Status | Corpo |
|---|---|
| `200` | Lista de usuários (exemplo abaixo) |
| `401` | `{ "message": "Acesso negado" }` (sem token) ou `{ "message": "Token inválido" }` |
| `500` | `{ "message": "Error no servidor, tente novamente mais tarde" }` |

```json
{
  "message": "Usuários listados com sucesso",
  "users": [
    {
      "id": "6713f0c2a1b2c3d4e5f60789",
      "email": "maria@email.com",
      "name": "Maria Silva",
      "age": 28,
      "createdAt": "2026-10-20T12:00:00.000Z",
      "updatedAt": "2026-10-20T12:00:00.000Z"
    }
  ]
}
```

#### `GET /user/:id`

Busca um usuário pelo id, sem o campo `password`.

| Status | Corpo |
|---|---|
| `200` | O usuário encontrado |
| `404` | `{ "message": "Usuário não encontrado" }` |
| `500` | Erro no servidor (inclui id em formato inválido) |

#### `PUT /user/:id`

Atualiza um usuário. Envie só os campos que quer mudar. Se mandar `password`, a senha nova é salva com hash.

```json
{
  "name": "Maria Souza",
  "age": 29
}
```

| Status | Corpo |
|---|---|
| `200` | `{ "message": "Usuário atualizado com sucesso", "user": { ... } }` (sem `password`) |
| `404` | `{ "message": "Usuário não encontrado" }` |
| `500` | Erro no servidor (inclui e-mail já usado por outro usuário) |

#### `DELETE /user/:id`

Remove um usuário.

| Status | Corpo |
|---|---|
| `200` | `{ "message": "Usuário deletado com sucesso" }` |
| `404` | `{ "message": "Usuário não encontrado" }` |
| `500` | Erro no servidor |

### Resumo do CRUD

| Operação | Método e rota | Autenticação |
|---|---|---|
| Criar | `POST /register` | Não |
| Listar todos | `GET /listUser` | Sim |
| Buscar um | `GET /user/:id` | Sim |
| Atualizar | `PUT /user/:id` | Sim |
| Deletar | `DELETE /user/:id` | Sim |

## Testando a API

### Com cURL

```bash
# Cadastro
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Maria Silva","email":"maria@email.com","age":28,"password":"minhasenha123"}'

# Login ( Gera o Token )
curl -s -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@email.com","password":"minhasenha123"}' | tr -d 

# Listar usuários
curl http://localhost:3000/listUser \
  -H "Authorization: Bearer $TOKEN"

# Buscar, atualizar e deletar (troque <id> pelo id do usuário)
curl http://localhost:3000/user/<id> -H "Authorization: Bearer $TOKEN"

curl -X PUT http://localhost:3000/user/<id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Maria Souza","age":29}'

curl -X DELETE http://localhost:3000/user/<id> -H "Authorization: Bearer $TOKEN"
```

### Com Postman, Insomnia ou Thunder Client

1. `POST http://localhost:3000/register` com o JSON de cadastro no body (raw → JSON).
2. `POST http://localhost:3000/login` e copie o token retornado.
3. `GET http://localhost:3000/listUser` com a aba **Authorization** em **Bearer Token**, colando o token.

### Prisma Studio

Para ver e editar os dados do banco pelo navegador:

```bash
npx prisma studio
```

## Melhorias futuras

- Remover o campo `password` da resposta de `POST /register` (hoje o hash volta no corpo).
- Validar o corpo das requisições (por exemplo com Zod ou Joi) e retornar `400` para dados inválidos.
- Retornar `409 Conflict` quando o e-mail já estiver cadastrado, em vez de `500`.
- Usar a mesma mensagem e o mesmo status para "usuário não encontrado" e "senha errada", para não revelar quais e-mails existem.
- Tornar a porta configurável por variável de ambiente (`PORT`).
- Compartilhar uma única instância do `PrismaClient` entre as rotas.
- Adicionar scripts `start`/`dev` no `package.json` e testes automatizados.
- Restringir `PUT` e `DELETE` para que cada usuário só altere a própria conta (comparando `req.params.id` com `req.userId`).

## Licença

ISC
