# Psi Agenda Online

Aplicativo Expo + API ASP.NET Core para uma psicóloga que atende clientes online. Esta cópia reaproveita o fluxo de agendamento do app original: catálogo, escolha de consulta, seleção da psicóloga, horários disponíveis, confirmação, reagendamento, cancelamento e histórico.

O app também possui um fallback local para o protótipo: se a API não estiver rodando, a vitrine inicial da psicóloga e a marcação de consultas continuam funcionando com os dados de demonstração em `src/data/initial-owner-config.ts`.

## Requisitos

- Node.js compatível com Expo SDK 55.
- npm.
- Docker Desktop para PostgreSQL e API em container.
- .NET SDK 10 para build local do backend.
- Expo Go no celular, ou simulador iOS/Android.

## Instalar dependências

```bash
npm install
```

## Subir API e PostgreSQL

O caminho mais simples para desenvolvimento local é subir tudo com Docker:

```bash
docker compose up --build -d
curl http://localhost:3001/health
```

A API fica em `http://localhost:3001` e o PostgreSQL em `localhost:5432`.

Para rodar a API fora do Docker:

```bash
dotnet restore backend/src/PsiAgenda.Api/PsiAgenda.Api.csproj
dotnet run --project backend/src/PsiAgenda.Api/PsiAgenda.Api.csproj
```

Em ambiente `Development`, as migrations são aplicadas automaticamente na inicialização da API.

## Configurar URL da API no app

Sem configuração extra, o app usa a API publicada em `https://felicio.app`.

Para desenvolvimento local, defina `EXPO_PUBLIC_API_URL` no bundle Expo. Reinicie o servidor Expo depois de mudar essa variável.

```bash
EXPO_PUBLIC_API_URL=http://localhost:3001 npx expo start
```

No emulador Android, use `http://10.0.2.2:3001` para apontar para a API local rodando no host.

Não coloque segredos em variáveis `EXPO_PUBLIC_`; elas entram no bundle do app.

## Rodar o app

```bash
npx expo start
```

Depois escolha:

- `i` para simulador iOS.
- `a` para emulador Android.
- `w` para web.
- QR Code para Expo Go em dispositivo físico.

## Verificações

```bash
npm run verify
npx expo install --check
npm run backend:build
```

`npm run verify` roda lint e TypeScript. O build do backend valida os projetos .NET e deve continuar passando depois de mudanças em API, contratos ou migrations.

## Estrutura principal

- `src/app`: rotas Expo Router.
- `src/screens`: telas por fluxo.
- `src/contexts`: estado de autenticação, booking e configuração da psicóloga.
- `src/data/initial-owner-config.ts`: vitrine inicial de consultas online e agenda da psicóloga.
- `src/services/api-client.ts`: cliente HTTP centralizado.
- `backend/src/PsiAgenda.Api`: API, auth, CORS, healthcheck e endpoints herdados do projeto original.

## Fluxos do MVP

- Cliente: cadastro/login, busca de atendimento, marcação de consulta online, reagendamento, cancelamento, histórico, pagamento combinado e avaliação.
- Psicóloga: dashboard, consultório, tipos de consulta, agenda, horários, bloqueios, pagamentos, notificações e políticas.
- Psicóloga: agenda própria, bloqueios, conclusão de consulta e não comparecimento.

## Backend

Veja [backend/README.md](backend/README.md) para endpoints, Docker, migrations e notas de escopo da API.
