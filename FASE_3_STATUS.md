# Fase 3 - Status de Implementação

Data: 2026-05-28

## Concluído

- [x] Backend ASP.NET Core Web API em .NET 10 estruturado em `Api`, `Application`, `Domain` e `Infrastructure`.
- [x] PostgreSQL configurado via Entity Framework Core/Npgsql.
- [x] Migration inicial manual com tabelas `users`, `refresh_tokens`, `spaces`, `space_users` e `audit_logs`.
- [x] Docker Compose com serviços `api` e `postgres`.
- [x] Cadastro real de cliente em `POST /auth/register/customer`.
- [x] Cadastro real de gestor de espaço em `POST /auth/register/space-admin`.
- [x] Login real com JWT em `POST /auth/login`.
- [x] Refresh token em `POST /auth/refresh-token`.
- [x] Logout com revogação de refresh token em `POST /auth/logout`.
- [x] Endpoint autenticado `GET /auth/me`.
- [x] Roles modeladas: `customer`, `space_admin`, `space_manager`, `professional`, `super_admin`.
- [x] Criação real de espaço em `POST /spaces`.
- [x] Atualização dos dados básicos do espaço em `PUT /spaces/{spaceId}`.
- [x] Vínculo automático do usuário gestor ao espaço criado em `space_users`.
- [x] Validação de propriedade/gestão para dashboard e checklist.
- [x] Checklist inicial do gestor em `GET /spaces/{spaceId}/onboarding-checklist`.
- [x] Dashboard inicial do gestor em `GET /spaces/{spaceId}/dashboard`.
- [x] Migration `AddStarterSetupTables` com `services`, `professionals`, `professional_services` e `professional_schedules`.
- [x] Setup inicial real do espaço em `POST /spaces/{spaceId}/starter-setup`.
- [x] Checklist do backend lendo serviços, profissionais, vínculos e agenda persistidos.
- [x] Dashboard do gestor exibindo contagem real de serviços e profissionais ativos.
- [x] App Expo integrado com API para login, cadastro de cliente, cadastro de gestor e criação de espaço.
- [x] Tokens do app salvos com `expo-secure-store`.
- [x] Restauração de sessão via token salvo.
- [x] Logout do app limpando tokens locais e chamando a API quando disponível.
- [x] Checklist e dashboard do gestor lendo backend quando a sessão vem da API.
- [x] Botão "Completar configuração" chamando a API local e sincronizando o estado local da sessão para o fluxo da cliente.
- [x] Campos de confirmação de senha adicionados nos cadastros de cliente e gestor.
- [x] Campo CEP adicionado na criação do espaço e enviado para a API.
- [x] Dados iniciais fictícios de espaços, serviços, profissionais e bloqueios removidos da vitrine local.
- [x] Placeholders visuais adicionados para espaço/profissional quando não houver imagem real.
- [x] Fallback local apenas para desenvolvimento quando a API estiver indisponível.

## Validações executadas

- [x] `npx tsc --noEmit`
- [x] `npm run lint`
- [x] `.NET SDK 10.0.107` instalado via Homebrew e `dotnet build backend/src/PsiAgenda.Api/PsiAgenda.Api.csproj` executado com sucesso.
- [x] Docker CLI, Docker Compose, Docker Buildx e Colima instalados via Homebrew.
- [x] Docker daemon iniciado via Colima.
- [x] `docker compose up --build -d` executado com API e PostgreSQL ativos.
- [x] `GET http://localhost:3001/health` retornou `{"status":"ok","service":"psi-agenda-api"}`.
- [x] Migration inicial aplicada no PostgreSQL e tabelas criadas.
- [x] Fluxo real validado via API: cadastro de gestor, criação de espaço, listagem do espaço do gestor e checklist.
- [x] Bateria HTTP da API executada com 34 verificações e 0 falhas: saúde, autenticação, autorização, refresh/logout, cliente, gestor, espaço, checklist, dashboard, atualização e ownership.
- [x] Nova bateria HTTP da fase 3 executada com 20 verificações e 0 falhas: cadastro de gestor, cadastro de cliente, criação do espaço, checklist antes/depois, criação de procedimentos, alocação de profissional, vínculo profissional-serviço, agenda, idempotência e dashboard.
- [x] Teste curto após revisão da especificação: health, cadastro de gestor, criação de espaço com CEP, setup inicial 8/8 e dashboard com 2 serviços/1 profissional.
- [x] Logs da API sem erro novo após a bateria HTTP.
- [x] Persistência confirmada no PostgreSQL após testes: `users`, `spaces`, `space_users`, `refresh_tokens`, `audit_logs`, `services`, `professionals`, `professional_services` e `professional_schedules`.
- [x] Expo aberto no iPhone 17 Pro via `npx expo start --ios --port 8083`.
- [x] Screenshots reais do simulador validados: boas-vindas, login, cadastro do gestor, criação de espaço, checklist e painel do gestor.
- [x] Fluxo visual no app web validado com API local ativa: criação de conta gestora, criação do espaço, setup completo, dashboard com 2 serviços/1 profissional, entrada como cliente, seleção do espaço, procedimento, profissional, horário, pagamento no local e confirmação do pedido `NA-00001`.
- [x] Fluxo completo no iPhone 17 Pro validado via plugin Computador: cadastro de gestor, criação de espaço, checklist 8/8, painel do gestor, versão cliente e agendamento confirmado.
- [x] Screenshot do agendamento confirmado salvo em `artifacts/browser-booking-success.png`.
- [x] Screenshot final do iPhone 17 Pro salvo em `artifacts/iphone-17-pro-final.png`.
- [x] Screenshot do teste final com Computador salvo em `artifacts/computer-use-fase-1-3-booking-success.png`.

## Observações do ambiente local

- [x] O bloqueio anterior do plugin Computador no Simulator foi superado no teste final; a janela do iPhone 17 Pro foi lida pela árvore de acessibilidade e os cliques foram executados pelo plugin.

## Como rodar localmente

1. Rodar `docker compose up --build -d`.
2. Conferir `GET http://localhost:3001/health`.
3. No app, usar `EXPO_PUBLIC_API_URL=http://localhost:3001` se precisar sobrescrever a URL padrão.
4. Rodar `npx expo start --ios --port 8083`.
5. Validar o fluxo completo sem fallback local: cadastro de gestor, criação de espaço, setup, painel e agendamento como cliente.

## Próxima fase sugerida

- Persistir agendamentos e pagamentos no backend.
- Criar endpoints públicos de busca/detalhe do espaço para a versão cliente carregar diretamente da API após reiniciar o app.
- Substituir o setup rápido por telas CRUD completas de serviços, profissionais, agenda, pagamento e cancelamento.
