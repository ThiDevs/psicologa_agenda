# Psi Agenda API

Backend ASP.NET Core + Entity Framework Core + PostgreSQL para o MVP local da fase 5. A API cobre cadastro, autenticacao, espacos, servicos, profissionais, agenda, bloqueios, reservas, reagendamento, cancelamento, avaliacoes, notificacoes internas e auditoria basica.

Pix financeiro, webhooks de pagamento e deploy de producao nao fazem parte desta entrega.

## Rodar com Docker

Na raiz do repositorio:

```bash
docker compose up --build -d
curl http://localhost:3001/api/health
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

- `GET /api/health`

Resposta esperada:

```json
{ "status": "ok", "service": "psi-agenda-api" }
```

## Paginas publicas

Usadas pela App Store, suporte e links legais do app.

- `GET /privacy`
- `GET /terms`
- `GET /support`

## Autenticacao

Endpoints com `RequireAuthorization` esperam `Authorization: Bearer <accessToken>`.

- `POST /api/auth/register/customer`
- `POST /api/auth/register/space-admin`
- `POST /api/auth/register/professional`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `DELETE /api/auth/me`

Endpoints sensiveis usam rate limit de desenvolvimento.

## Espacos e gestao

- `POST /api/spaces`
- `PUT /api/spaces/{spaceId}`
- `GET /api/spaces/my`
- `POST /api/spaces/{spaceId}/starter-setup`
- `GET /api/spaces/{spaceId}/onboarding-checklist`
- `GET /api/spaces/{spaceId}/dashboard`
- `GET|POST /api/spaces/{spaceId}/categories`
- `GET|POST /api/spaces/{spaceId}/services`
- `PUT /api/spaces/{spaceId}/services/{serviceId}`
- `GET|POST /api/spaces/{spaceId}/professionals`
- `PUT /api/spaces/{spaceId}/professionals/{professionalId}`
- `GET|PUT /api/spaces/{spaceId}/opening-hours`
- `GET|PUT /api/spaces/{spaceId}/professionals/{professionalId}/schedule`
- `GET|POST /api/spaces/{spaceId}/blocked-times`
- `DELETE /api/spaces/{spaceId}/blocked-times/{blockedTimeId}`
- `GET|PUT /api/spaces/{spaceId}/payment-settings`
- `GET|PUT /api/spaces/{spaceId}/cancellation-policy`
- `GET /api/spaces/{spaceId}/appointments`
- `GET /api/spaces/{spaceId}/appointments/{appointmentId}`
- `POST /api/spaces/{spaceId}/appointments/{appointmentId}/confirm`
- `POST /api/spaces/{spaceId}/appointments/{appointmentId}/reject`
- `POST /api/spaces/{spaceId}/appointments/{appointmentId}/complete`
- `POST /api/spaces/{spaceId}/appointments/{appointmentId}/no-show`
- `GET|POST /api/spaces/{spaceId}/photos`
- `DELETE /api/spaces/{spaceId}/photos/{photoId}`
- `GET|PUT /api/spaces/{spaceId}/notification-settings`

## Publico, cliente e profissional

- `GET /api/public/spaces`
- `GET /api/public/spaces/{spaceId}`
- `GET /api/public/spaces/{spaceId}/professionals/compatible?serviceIds=<ids>`
- `POST /api/availability/search`
- `POST /api/appointments/reserve`
- `GET /api/customers/me/appointments`
- `GET /api/customers/me/appointments/{appointmentId}`
- `POST /api/customers/me/appointments/{appointmentId}/cancel`
- `POST /api/customers/me/appointments/{appointmentId}/reschedule`
- `POST /api/customers/me/appointments/{appointmentId}/review`
- `GET /api/professionals/me/appointments`
- `GET /api/professionals/me/appointments/{appointmentId}`
- `POST /api/professionals/me/appointments/{appointmentId}/complete`
- `POST /api/professionals/me/appointments/{appointmentId}/no-show`
- `POST /api/professionals/me/blocked-times`
- `GET /api/notifications`
- `POST /api/notifications/{notificationId}/read`

## Contrato de erro atual

- Validacao de entrada e regras de negocio: `400` com `{ "message": "..." }`.
- Recurso inexistente: `404` com `{ "message": "..." }`.
- Falta de autenticacao JWT: `401`.
- Usuario autenticado sem permissao no recurso: `403`.

O item de task para padronizar completamente erros e status segue aberto ate existir teste automatizado cobrindo esses contratos.
