# Status da Fase 2

## Concluido

- AuthContext com entrada visual por perfil: cliente, gestor e profissional.
- BookingContext com estado compartilhado do fluxo de agendamento.
- OwnerConfigContext com configuracao local do espaco, servicos, profissionais, horarios, favoritos e agendamentos.
- Home usando espacos publicados e busca/filtro dinamicos.
- Detalhe do espaco usando dados do contexto.
- Selecao de servicos sem pre-selecao fixa, com total e duracao recalculados.
- Selecao de profissionais filtrando compatibilidade por servicos.
- Calendario calculando horarios por funcionamento, agenda profissional, bloqueios e duracao total.
- Revisao, pagamento e sucesso usando as escolhas reais da jornada.
- Fluxo do gestor: cadastro, criacao de espaco, checklist inicial, publicacao local e painel do gestor.
- Tela starter do Expo removida da navegacao.

## Validado no iPhone 17 Pro

- Cliente: entrada, Home, detalhe, servicos, profissional, horario, revisao, pagamento e confirmacao.
- Gestor: criar conta, criar espaco, checklist, completar configuracao local, abrir painel e publicar espaco.
- Cliente apos publicacao: novo espaco do gestor aparece na Home como espaco publicado.

## Proximos passos da Fase 3

- Integrar AuthContext com API real e JWT/refresh token.
- Persistir usuarios, espacos, servicos, profissionais e agenda no PostgreSQL.
- Substituir configuracao local por endpoints da API ASP.NET Core.
- Criar reserva temporaria real no servidor antes do pagamento.
