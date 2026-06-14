# Psi Agenda API

Backend ASP.NET Core + Entity Framework Core + PostgreSQL para o MVP local da fase 5. A API cobre cadastro, autenticacao, espacos, servicos, profissionais, agenda, bloqueios, reservas, reagendamento, cancelamento, avaliacoes, notificacoes internas e auditoria basica.

Pix financeiro, webhooks de pagamento e deploy de producao nao fazem parte desta entrega.

## Rodar com Docker

Na raiz do repositorio:

```bash
docker compose up --build -d
curl http://localhost:3001/health
```

Servicos:

- API: `http://localhost:3001`.
- PostgreSQL: `localhost:5432`.
- Banco: `psi_agenda`.
- Usuario/senha de desenvolvimento: `psi` / `psi`.

## Rodar local sem container da API

Suba o PostgreSQL pelo Docker Compose ou use um PostgreSQL local com a connection string em `backend/src/PsiAgenda.Api/appsettings.Development.json`.

```bash
dotnet restore backend/src/PsiAgenda.Api/PsiAgenda.Api.csproj
dotnet run --project backend/src/PsiAgenda.Api/PsiAgenda.Api.csproj
```

Em `Development`, a API aplica migrations automaticamente ao iniciar.

## Abrir no Visual Studio

Abra `backend/PsiAgenda.Backend.sln` no Visual Studio para carregar a solucao completa com os projetos:

- `PsiAgenda.Api`
- `PsiAgenda.Application`
- `PsiAgenda.Domain`
- `PsiAgenda.Infrastructure`

O projeto de inicializacao deve ser `PsiAgenda.Api`. O arquivo `backend/backend.slnx` tambem foi mantido para Visual Studio/.NET com suporte ao formato XML de solution. O arquivo `backend/.project` identifica o workspace do backend para ferramentas que esperam esse descritor.

## Migrations

As migrations ficam em `backend/src/PsiAgenda.Infrastructure/Persistence/Migrations`.

Para criar uma nova migration:

```bash
dotnet ef migrations add NomeDaMigration \
  --project backend/src/PsiAgenda.Infrastructure \
  --startup-project backend/src/PsiAgenda.Api
```

Para aplicar manualmente:

```bash
dotnet ef database update \
  --project backend/src/PsiAgenda.Infrastructure \
  --startup-project backend/src/PsiAgenda.Api
```

## Verificacoes

```bash
dotnet build backend/src/PsiAgenda.Api/PsiAgenda.Api.csproj
```

Tambem e possivel rodar pela raiz:

```bash
npm run backend:build
```

## Healthcheck

- `GET /health`

Resposta esperada:

```json
{ "status": "ok", "service": "psi-agenda-api" }
```

## Autenticacao

Endpoints com `RequireAuthorization` esperam `Authorization: Bearer <accessToken>`.

- `POST /auth/register/customer`
- `POST /auth/register/space-admin`
- `POST /auth/register/professional`
- `POST /auth/login`
- `POST /auth/refresh-token`
- `POST /auth/logout`
- `GET /auth/me`

Endpoints sensiveis usam rate limit de desenvolvimento.

## Espacos e gestao

- `POST /spaces`
- `PUT /spaces/{spaceId}`
- `GET /spaces/my`
- `POST /spaces/{spaceId}/starter-setup`
- `GET /spaces/{spaceId}/onboarding-checklist`
- `GET /spaces/{spaceId}/dashboard`
- `GET|POST /spaces/{spaceId}/categories`
- `GET|POST /spaces/{spaceId}/services`
- `PUT /spaces/{spaceId}/services/{serviceId}`
- `GET|POST /spaces/{spaceId}/professionals`
- `PUT /spaces/{spaceId}/professionals/{professionalId}`
- `GET|PUT /spaces/{spaceId}/opening-hours`
- `GET|PUT /spaces/{spaceId}/professionals/{professionalId}/schedule`
- `GET|POST /spaces/{spaceId}/blocked-times`
- `DELETE /spaces/{spaceId}/blocked-times/{blockedTimeId}`
- `GET|PUT /spaces/{spaceId}/payment-settings`
- `GET|PUT /spaces/{spaceId}/cancellation-policy`
- `GET /spaces/{spaceId}/appointments`
- `GET /spaces/{spaceId}/appointments/{appointmentId}`
- `POST /spaces/{spaceId}/appointments/{appointmentId}/confirm`
- `POST /spaces/{spaceId}/appointments/{appointmentId}/reject`
- `POST /spaces/{spaceId}/appointments/{appointmentId}/complete`
- `POST /spaces/{spaceId}/appointments/{appointmentId}/no-show`
- `GET|POST /spaces/{spaceId}/photos`
- `DELETE /spaces/{spaceId}/photos/{photoId}`
- `GET|PUT /spaces/{spaceId}/notification-settings`

## Publico, cliente e profissional

- `GET /public/spaces`
- `GET /public/spaces/{spaceId}`
- `GET /public/spaces/{spaceId}/professionals/compatible?serviceIds=<ids>`
- `POST /availability/search`
- `POST /appointments/reserve`
- `GET /customers/me/appointments`
- `GET /customers/me/appointments/{appointmentId}`
- `POST /customers/me/appointments/{appointmentId}/cancel`
- `POST /customers/me/appointments/{appointmentId}/reschedule`
- `POST /customers/me/appointments/{appointmentId}/review`
- `GET /professionals/me/appointments`
- `GET /professionals/me/appointments/{appointmentId}`
- `POST /professionals/me/appointments/{appointmentId}/complete`
- `POST /professionals/me/appointments/{appointmentId}/no-show`
- `POST /professionals/me/blocked-times`
- `GET /notifications`
- `POST /notifications/{notificationId}/read`

## Contrato de erro atual

- Validacao de entrada e regras de negocio: `400` com `{ "message": "..." }`.
- Recurso inexistente: `404` com `{ "message": "..." }`.
- Falta de autenticacao JWT: `401`.
- Usuario autenticado sem permissao no recurso: `403`.

O item de task para padronizar completamente erros e status segue aberto ate existir teste automatizado cobrindo esses contratos.
