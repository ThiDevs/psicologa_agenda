# Fase 5 - MVP final local sem Pix financeiro

Status: concluida para ambiente local, API Docker e simulador iPhone, exceto a parte financeira Pix conforme pedido.

## Escopo da fase 5 na especificacao

A fase 5 finaliza o MVP para uso real por um espaco de beleza, cobrindo app da cliente, app do gestor, app da profissional, notificacoes, seguranca, auditoria, politicas, operacao basica e preparacao para publicacao.

## Entregue no app da cliente

- [x] Login e cadastro real pela API.
- [x] Busca de espacos publicados reais.
- [x] Fluxo completo de agendamento real com validacao no backend.
- [x] Meus agendamentos com dados vindos da API.
- [x] Detalhe do agendamento.
- [x] Cancelamento conforme politica do espaco.
- [x] Reagendamento conforme politica do espaco.
- [x] Favoritos no app.
- [x] Historico/resumo de pagamentos no local.
- [x] Avaliacao de atendimento apos conclusao.
- [x] Termos de uso e resumo de privacidade/LGPD.
- [x] Estados de loading, vazio e erro nos fluxos principais.

## Entregue no app do gestor

- [x] Dashboard operacional.
- [x] Cadastro e edicao do espaco.
- [x] Gestao de fotos do espaco.
- [x] Gestao de servicos.
- [x] Gestao de profissionais.
- [x] Vinculo de profissional com servicos.
- [x] Configuracao de funcionamento.
- [x] Configuracao de agenda por profissional.
- [x] Bloqueios e excecoes.
- [x] Configuracao de pagamentos sem Pix financeiro.
- [x] Configuracao de cancelamento.
- [x] Configuracao de notificacoes.
- [x] Agenda do gestor com agendamentos reais.
- [x] Detalhe de agendamento.
- [x] Marcar atendimento como concluido.
- [x] Marcar nao comparecimento.

## Entregue no app da profissional

- [x] Cadastro/login real da profissional.
- [x] Vinculo por e-mail com a profissional cadastrada no espaco.
- [x] Agenda propria.
- [x] Detalhe operacional do atendimento.
- [x] Bloqueio proprio de horario.
- [x] Marcar atendimento como concluido.
- [x] Marcar nao comparecimento.

## Entregue no backend/produto

- [x] PostgreSQL com migrations da fase 5.
- [x] Entidades de fotos, notificacoes, avaliacoes e configuracoes de notificacao.
- [x] Cadastro real de cliente, gestor e profissional.
- [x] Permissoes por perfil e validacao de ownership.
- [x] Agenda validada no servidor.
- [x] Reserva/agendamento sem conflito.
- [x] Cancelamento e reagendamento com politica do espaco.
- [x] Pagamento no local configuravel.
- [x] Pix desabilitado por padrao nesta entrega.
- [x] Notificacoes internas basicas.
- [x] Logs de auditoria para acoes sensiveis.
- [x] Rate limit em endpoints sensiveis.
- [x] Tratamento padronizado de erros.
- [x] Docker Compose com API e PostgreSQL.

## Fora desta entrega por pedido/ambiente

- [ ] Pix online via Mercado Pago.
- [ ] Webhook de pagamento Pix.
- [ ] Validacao de webhook Pix.
- [ ] Confirmacao automatica apos pagamento Pix aprovado.
- [ ] Deploy real da API em producao.
- [ ] Banco PostgreSQL gerenciado em producao.
- [ ] Backup automatizado de producao.
- [ ] Monitoramento externo de producao.
- [ ] Publicacao em lojas e builds assinados com credenciais de Apple/Google.

## Testes executados

- [x] `dotnet build backend/src/PsiAgenda.Api/PsiAgenda.Api.csproj`.
- [x] `npx tsc --noEmit`.
- [x] `npm run lint`.
- [x] `docker compose up --build -d`.
- [x] `curl http://localhost:3001/health`.
- [x] Teste HTTP completo da API com criacao de conta, espaco, servico, profissional, agenda, pagamento no local, reserva, reagendamento, conclusao, avaliacao, cancelamento e notificacoes.
- [x] Teste de regressao da API para nao retornar horarios passados no mesmo dia.
- [x] Teste no simulador iPhone 17 Pro com app Expo conectado na API local.

Evidencia do teste final no simulador:

- `artifacts/computer-use-fase-5-final.png`

## Observacoes de UX/teste

- O fluxo principal esta operando com dados reais da API local, sem espacos, servicos ou profissionais mockados.
- O pagamento disponivel para a entrega e o pagamento no local; a UI informa que Pix financeiro ficou fora da fase.
- Durante o teste foi corrigido um problema de horarios passados no mesmo dia: a API agora filtra slots passados e valida cancelamento/reagendamento com comparacao em horario local.
