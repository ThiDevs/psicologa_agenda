# Tasks - refinamento profissional

Data: 2026-05-29

## Contexto da auditoria

- Documentacao consultada antes da edicao: https://docs.expo.dev/versions/v55.0.0/
- Expo SDK local: `expo ~55.0.26`, React `19.2.0`, React Native `0.83.6`.
- Checks executados nesta rodada:
  - [x] `npm run verify`
  - [x] `npx expo install --check`
  - [x] `npm run backend:build`

## Alteracoes concluidas nesta rodada

- [x] Removido o risco de artefatos `.NET` versionados: `backend/**/bin/` e `backend/**/obj/` foram adicionados ao `.gitignore`, e 228 arquivos gerados sairam do indice do Git.
- [x] A rota inicial agora respeita `isHydratingSession` e mostra um carregamento neutro antes de decidir entre boas-vindas, cliente, gestor ou profissional.
- [x] O cliente HTTP agora tenta refresh uma vez em `401` autenticado, repete a chamada original quando o refresh funciona e limpa a sessao com erro claro quando a sessao expirou.
- [x] O README principal deixou de ser template e documenta backend, Expo Go, `EXPO_PUBLIC_API_URL`, dispositivos/simuladores e verificacoes.
- [x] `package.json` ganhou `typecheck`, `verify` e `backend:build`.
- [x] O timezone de negocio passou a vir de `BusinessClock` (`TimeZoneId` + `UtcOffset`) com padrao `America/Sao_Paulo`/`-03:00`.
- [x] O login por perfil agora valida o perfil real retornado pela API e limpa a sessao quando a escolha nao bate.
- [x] `backend/README.md` foi atualizado para o escopo da fase 5, endpoints atuais, Docker, migrations, healthcheck e limites sem Pix financeiro.

## P0 - reduzir risco imediato

- [x] Remover artefatos gerados do .NET que estao versionados.
  - Evidencia: `git ls-files backend/src/**/bin backend/src/**/obj | wc -l` retornou 228 arquivos, cerca de 21 MB.
  - Aceite: `backend/**/bin/` e `backend/**/obj/` entram no `.gitignore`, os arquivos gerados saem do git, e `dotnet build backend/src/NailsAgenda.Api/NailsAgenda.Api.csproj` continua passando.

- [x] Usar `isHydratingSession` na rota inicial para evitar flash de tela errada.
  - Evidencia: `AuthContext` expoe `isHydratingSession`, mas `src/app/index.tsx` decide a tela somente por `user`.
  - Aceite: enquanto a sessao e restaurada, o app mostra um estado neutro de carregamento; usuarios com token salvo nao veem rapidamente a tela de boas-vindas.

- [x] Tratar expiracao do access token durante chamadas autenticadas.
  - Evidencia: `restoreAuthSession` tenta refresh em 401, mas o `request` central nao faz retry em chamadas autenticadas normais.
  - Aceite: uma chamada autenticada com access token expirado tenta refresh uma vez; se funcionar, repete a chamada original; se falhar, limpa sessao e retorna erro claro.

## P1 - qualidade de entrega

- [x] Trocar o README de template por um guia real do produto.
  - Incluir: como rodar API/PostgreSQL, como rodar Expo Go primeiro, variavel `EXPO_PUBLIC_API_URL`, diferenca entre web/simulador/dispositivo fisico e comandos de verificacao.
  - Aceite: uma pessoa nova consegue subir backend e app sem depender dos arquivos de status das fases.

- [x] Adicionar scripts de verificacao ao `package.json`.
  - Sugestao: `typecheck`, `verify`, `backend:build`.
  - Aceite: `npm run verify` roda lint e TypeScript; o README referencia os comandos.

- [ ] Criar a primeira base de testes automatizados.
  - Frontend: funcoes de formato, fluxo de `BookingContext`, mensagens/erros do `api-client`.
  - Backend: autenticacao, refresh token, disponibilidade, reserva, cancelamento/reagendamento.
  - Aceite: os testes entram no fluxo de verificacao local e cobrem pelo menos um caminho feliz e um erro por area critica.

- [ ] Padronizar contrato de erro e status HTTP entre endpoints.
  - Evidencia: `AuthEndpoints` retorna 401 para `UnauthorizedAccessException`, enquanto `SpaceEndpoints` usa 403.
  - Aceite: regras claras para 400, 401, 403 e 404; frontend continua exibindo mensagens amigaveis.

- [x] Tornar timezone de negocio configuravel.
  - Evidencia: `SpaceService` usa offset fixo `-3`.
  - Aceite: timezone/offset vem de configuracao, com padrao local seguro para desenvolvimento.

## P2 - produto e manutencao

- [ ] Separar arquivos grandes depois que houver testes.
  - Evidencia: `SpaceService.cs` tem 2745 linhas, `OwnerManagementScreens.tsx` 1410, `api-client.ts` 899 e `OwnerConfigContext.tsx` 807.
  - Aceite: separar por dominios sem mudar comportamento; testes e checks continuam passando.

- [x] Revisar login por perfil.
  - Evidencia: a tela de login permite selecionar perfil, mas o backend autentica pelo usuario real e a rota inicial usa `user.role`.
  - Aceite: remover a selecao se ela for apenas visual, ou mostrar erro claro quando o perfil escolhido nao bate com o usuario autenticado.

- [x] Atualizar `backend/README.md` para fase 5.
  - Evidencia: o arquivo ainda descreve "Backend da fase 3" e lista poucos endpoints.
  - Aceite: documentar endpoints atuais, migrations, Docker, healthcheck e escopo sem Pix financeiro.

- [ ] Criar checklist manual de QA por fluxo.
  - Incluir: cliente, gestor, profissional, API offline, token expirado, horario indisponivel, cancelamento, reagendamento e avaliacao.
  - Aceite: cada release local aponta quais fluxos foram testados e com qual ambiente.

## P3 - melhorias cautelosas

- [ ] Avaliar migracao gradual de icones.
  - Evidencia: o app usa `@expo/vector-icons` e `expo-symbols`; a diretriz atual do Expo favorece APIs mais novas para alguns cenarios.
  - Aceite: manter visual atual ate haver ganho claro; qualquer migracao deve ser incremental e validada em iOS, Android e web.

- [ ] Melhorar mascaras e validacoes de formulario no app.
  - Alvos iniciais: telefone, CEP, UF, dinheiro e horarios.
  - Aceite: inputs reduzem erro antes de chamar API, sem bloquear formatos validos usados no Brasil.

- [ ] Planejar Pix online somente quando houver provedor definido.
  - Aceite: manter pagamento no local como padrao; nao simular confirmacao financeira real sem webhook validado.

## Novas tasks criadas nesta rodada

- [ ] Cobrir o retry de refresh token com teste automatizado no frontend.
  - Aceite: simular `401` em chamada autenticada, sucesso em `/auth/refresh-token`, repeticao da chamada original e limpeza de sessao quando o refresh falha.

- [ ] Adicionar teste de configuracao do `BusinessClock` no backend.
  - Aceite: validar que `America/Sao_Paulo` e fallback `-03:00` sao aplicados no calculo de horarios passados.

- [ ] Criar teste manual guiado para sessao expirada no app.
  - Aceite: checklist cobre app aberto com access token expirado, refresh token valido, refresh token invalido e API offline.

- [ ] Adicionar CI local/remote para impedir novo versionamento de `backend/**/bin` e `backend/**/obj`.
  - Aceite: uma verificacao falha se `git ls-files 'backend/src/**/bin/*' 'backend/src/**/obj/*'` retornar qualquer arquivo.
