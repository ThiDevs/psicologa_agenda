# Fase 4 - Gestao real do espaco, agenda inteligente e reserva temporaria

Status: concluida em 2026-05-28.

## Implementado no backend

- [x] CRUD real de servicos por espaco.
- [x] Cadastro real de categorias de servico a partir dos servicos criados.
- [x] CRUD real de profissionais por espaco.
- [x] Vinculo profissional-servico persistido no PostgreSQL.
- [x] Horario de funcionamento do espaco.
- [x] Agenda individual da profissional com pausa/almoco.
- [x] Bloqueios manuais.
- [x] Regras de pagamento.
- [x] Politica de cancelamento.
- [x] Busca publica de espacos publicados.
- [x] Catalogo publico filtrando apenas espacos operacionalmente completos.
- [x] Detalhe publico do espaco com servicos, profissionais, horarios e regras.
- [x] Busca de profissionais compativeis.
- [x] `POST /availability/search`.
- [x] Algoritmo de disponibilidade considerando duracao, buffer, funcionamento, agenda, pausas, bloqueios, agendamentos e reservas ativas.
- [x] `POST /appointments/reserve`.
- [x] Reserva temporaria com `expires_at` para pagamentos online.
- [x] Worker Service para expirar reservas vencidas.
- [x] Transacao serializavel na criacao de reserva/agendamento para reduzir risco de conflito.

## Implementado no app

- [x] Home consumindo espacos reais da API.
- [x] Detalhe do espaco consumindo dados reais da API.
- [x] Selecao de servicos reais.
- [x] Selecao de profissionais reais compativeis.
- [x] Calendario consumindo disponibilidade real da API.
- [x] Pagamento criando reserva/agendamento via API.
- [x] Dashboard do gestor com metricas reais.
- [x] Tela de servicos integrada.
- [x] Tela de profissionais integrada.
- [x] Tela de funcionamento integrada.
- [x] Tela de agenda da profissional integrada.
- [x] Tela de regras de pagamento integrada.
- [x] Tela de politica de cancelamento integrada.
- [x] Tela de bloqueios integrada.
- [x] Tela de agenda do gestor integrada.
- [x] Dados ficticios, preenchimentos automaticos de teste e modo cliente fixo removidos do app.

## Testes executados

- [x] `DOTNET_ROOT=/opt/homebrew/opt/dotnet/libexec dotnet build backend/src/PsiAgenda.Api/PsiAgenda.Api.csproj`
- [x] `docker compose up --build -d`
- [x] `GET http://localhost:3001/health`
- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] Teste final no iPhone 17 Pro via Computador:
  - login de cliente real;
  - visualizacao de espaco publicado pela API;
  - detalhe com servico real;
  - selecao de servico;
  - selecao de profissional compativel;
  - calendario com horarios reais da API;
  - revisao;
  - pagamento no local;
  - tela de sucesso com pedido confirmado.
- [x] Fluxo HTTP completo:
  - cadastro de gestor;
  - criacao de espaco;
  - criacao de servico;
  - criacao de profissional;
  - vinculo profissional-servico;
  - configuracao de funcionamento;
  - configuracao de agenda da profissional;
  - configuracao de pagamento;
  - configuracao de cancelamento;
  - checklist completo;
  - publicacao no catalogo;
  - busca de disponibilidade;
  - cadastro de cliente;
  - reserva/agendamento;
  - validacao de que o mesmo horario deixou de aparecer apos a reserva.

## Resultado do teste HTTP

```json
{
  "checklistComplete": true,
  "publishedVisible": true,
  "publicServices": 1,
  "firstSlot": "2026-06-01 09:00-10:10",
  "appointmentStatus": "confirmed",
  "conflictBlocked": true,
  "activeServicesCount": 1,
  "activeProfessionalsCount": 1
}
```

Screenshot do teste no simulador:

```text
artifacts/computer-use-fase-4-booking-success.png
```

## Pontos que ficam para fases futuras

- Upload real de fotos do espaco.
- Pagamento online real com gateway e webhook.
- Excecoes avancadas de agenda alem de bloqueios manuais.
- Cancelamento, reagendamento e historico completo da cliente.
