# Especificação do Produto — App de Agendamento de Serviços de Beleza

## 1. Visão geral

Este projeto tem como objetivo criar um aplicativo mobile-first para agendamento de serviços presenciais, começando pelo caso de uso de uma manicure/salão de beleza.

A cliente poderá escolher um espaço, selecionar serviços, escolher uma profissional, visualizar horários disponíveis, revisar o agendamento, realizar o pagamento e receber a confirmação.

O produto deve ser construído inicialmente com dados mockados, mas a arquitetura definitiva do MVP robusto será baseada em app React Native consumindo uma API própria, com backend em ASP.NET Core Web API, banco PostgreSQL, autenticação real, agenda validada no servidor, reserva temporária de horário e integração futura com pagamento real.

---

## 2. Objetivo do projeto

Criar uma plataforma simples, moderna e eficiente para conectar clientes a espaços de beleza, permitindo agendamentos rápidos, organizados e sem conflito de horários.

O MVP deve resolver os seguintes problemas:

- Cliente não sabe quais horários estão disponíveis.
- Espaços fazem controle manual por WhatsApp, papel ou planilha.
- Profissionais podem ter conflito de agenda.
- Serviços têm durações e preços diferentes.
- Cliente pode querer combinar mais de um serviço no mesmo atendimento.
- Espaço precisa organizar profissionais, serviços e horários.
- Pagamento ou reserva precisa ser controlado antes da confirmação final.

---

## 3. Onde queremos chegar

A visão final é ter um app completo de agendamento para serviços locais, permitindo que diferentes tipos de espaços utilizem a plataforma.

Exemplos de negócios suportados futuramente:

- Manicure e pedicure.
- Salão de beleza.
- Barbearia.
- Clínica de estética.
- Massagem.
- Sobrancelha e cílios.
- Depilação.
- Consultórios e atendimentos por horário.

A plataforma deve evoluir para ter:

- App da cliente.
- Painel do espaço/loja.
- Painel da profissional.
- Agenda inteligente.
- Pagamento online.
- Reserva temporária de horário.
- Notificações e lembretes.
- Histórico de agendamentos.
- Avaliações.
- Gestão de serviços, profissionais e horários.

---

## 3.1 Decisão técnica oficial do MVP robusto

Para o produto deixar de ser apenas um protótipo visual e se tornar um app confiável, a arquitetura oficial será baseada em **API própria + banco de dados relacional**.

O app mobile não deve acessar o banco diretamente e não deve concentrar regras críticas apenas no front-end. Toda regra sensível de agenda, pagamento, permissão, conflito de horário e confirmação de agendamento deve ficar no backend.

### 4.1 Stack oficial escolhida

```text
App mobile:
React Native + Expo + TypeScript

Backend/API:
ASP.NET Core Web API em .NET 10

Banco de dados:
PostgreSQL

ORM:
Entity Framework Core

Cache/reservas temporárias:
Redis

Autenticação:
JWT + Refresh Token

Storage de imagens:
Cloudflare R2, AWS S3 ou Azure Blob Storage

Push notification:
Firebase Cloud Messaging ou Expo Notifications

Pagamento inicial:
Mercado Pago para Pix no MVP

Pagamento futuro:
Mercado Pago, Pagar.me, Asaas, Iugu ou solução com split quando virar marketplace

Deploy:
Docker + Azure, AWS, Render, Railway ou VPS Linux
```

### 4.2 Justificativa da decisão

A escolha por **ASP.NET Core Web API + PostgreSQL** foi feita porque o projeto precisa de robustez, consistência transacional e segurança para lidar com agenda e pagamento.

A API será responsável por:

- Autenticação e autorização.
- Cadastro de clientes.
- Cadastro de gestores.
- Criação e configuração de espaços.
- Cadastro de profissionais.
- Cadastro de serviços.
- Vínculo profissional-serviço.
- Horários de funcionamento.
- Agenda individual das profissionais.
- Bloqueios e exceções.
- Busca de disponibilidade.
- Reserva temporária de horário.
- Confirmação de agendamento.
- Cancelamento e reagendamento.
- Integração com pagamento.
- Webhooks de pagamento.
- Notificações.
- Logs e auditoria.

O banco PostgreSQL será responsável por armazenar dados relacionais do produto:

- Usuários.
- Perfis e permissões.
- Clientes.
- Espaços.
- Gestores do espaço.
- Profissionais.
- Serviços.
- Agendas.
- Bloqueios.
- Agendamentos.
- Pagamentos.
- Avaliações.
- Notificações.
- Logs.

### 4.3 Por que a API é obrigatória

A agenda é uma regra crítica. Duas clientes podem tentar agendar o mesmo horário ao mesmo tempo. Por isso, a disponibilidade não pode ser validada apenas no app.

Fluxo incorreto:

```text
Cliente A vê 14:00 livre no app
Cliente B vê 14:00 livre no app
As duas confirmam
Agenda fica duplicada
```

Fluxo correto:

```text
Cliente A escolhe 14:00
App chama a API
API cria reserva temporária no servidor
Cliente B tenta escolher 14:00
API nega porque existe reserva ativa
Cliente A paga ou confirma
API converte reserva em agendamento confirmado
```

### 4.4 Regra de ouro da arquitetura

```text
O front-end exibe e coleta dados.
A API valida regras de negócio.
O banco garante consistência.
O Redis ajuda com locks e reservas temporárias.
O gateway confirma pagamentos por webhook.
```

### 4.5 Componentes obrigatórios do backend

```text
AuthModule
UsersModule
CustomersModule
SpacesModule
SpaceAdminsModule
ProfessionalsModule
ServicesModule
SchedulesModule
AvailabilityModule
AppointmentsModule
PaymentsModule
NotificationsModule
AuditLogsModule
```

### 4.6 Tabelas principais do banco

```text
users
roles
user_roles
customers
spaces
space_admins
professionals
services
professional_services
space_opening_hours
professional_schedules
professional_breaks
blocked_times
appointments
appointment_services
appointment_status_history
payments
payment_webhooks
notifications
reviews
audit_logs
refresh_tokens
```

### 4.7 Tipos de usuário

```text
customer
space_admin
professional
super_admin
```

#### customer

Cliente que busca espaços e agenda atendimentos.

#### space_admin

Dono ou gestor do espaço. Pode configurar o espaço pelo próprio app.

#### professional

Profissional que realiza atendimentos e visualiza a própria agenda.

#### super_admin

Administrador da plataforma. Pode visualizar e administrar dados globais do produto.

### 4.8 Cadastro de usuário e criação do espaço

O app deve permitir que o próprio gestor crie sua conta e configure seu espaço sem intervenção manual no banco.

Fluxo de cadastro de gestor:

```text
Abrir app
↓
Escolher "Tenho um espaço"
↓
Criar usuário gestor
↓
Confirmar e-mail/telefone, se aplicável
↓
Criar espaço
↓
Sistema cria vínculo user → space_admin → space
↓
Abrir checklist inicial do gestor
```

Ao criar um espaço, o backend deve criar:

```text
1. Registro em users
2. Perfil/role space_admin
3. Registro em spaces
4. Registro em space_admins vinculando o usuário ao espaço
5. Checklist inicial de configuração
```

O espaço só deve aparecer para clientes quando estiver:

```text
active = true
published = true
onboarding_completed = true
```

### 4.9 Checklist obrigatório para publicar espaço

Antes de aparecer no app da cliente, o gestor precisa concluir:

```text
1. Dados básicos do espaço
2. Endereço/localização
3. Pelo menos 1 serviço ativo
4. Pelo menos 1 profissional ativa
5. Pelo menos 1 vínculo profissional-serviço
6. Horário de funcionamento do espaço
7. Agenda da profissional
8. Regra de pagamento
9. Política de cancelamento
```

### 4.10 Estratégia de reserva temporária

No MVP robusto, a reserva temporária deve funcionar assim:

```text
Cliente escolhe data e horário
↓
API valida disponibilidade no banco
↓
API cria appointment com status pending_payment ou reserved
↓
API define expires_at = agora + 10 minutos
↓
Horário fica indisponível para outras clientes
↓
Se pagar ou confirmar pagamento no local permitido: status confirmed
↓
Se expirar: status expired e horário é liberado
```

No início, a expiração pode ser controlada pelo banco e por um Worker Service. Em versão mais robusta, usar Redis para locks temporários.

### 4.11 Pagamento escolhido para o MVP

Para o MVP, a ordem recomendada é:

```text
1. Pagamento no local
2. Pix online via Mercado Pago
3. Cartão de crédito/débito
4. Sinal/entrada
5. Split de pagamento, somente em fase marketplace
```

A tela de configuração do gestor deve permitir:

```text
Permitir pagamento no local: sim/não
Exigir pagamento antecipado: sim/não
Exigir sinal: sim/não
Tipo de sinal: percentual ou valor fixo
Tempo de expiração da reserva: exemplo 10 minutos
Métodos aceitos: Pix, cartão, dinheiro no local
```

### 4.12 Segurança mínima obrigatória

```text
JWT access token
Refresh token
Hash de senha com BCrypt ou Argon2
Permissão por role
Validação de ownership do espaço
Rate limit em endpoints sensíveis
Logs de auditoria
Validação de webhook do gateway de pagamento
Transações no banco para criação/confirmação de agendamento
Proteção contra conflito de agenda
Tratamento LGPD básico
```

Exemplo de regra obrigatória:

```text
Um gestor do Espaço A não pode editar serviços, profissionais, agenda ou pagamentos do Espaço B.
```


---

## 4. Escopo do MVP cliente

O MVP cliente terá o seguinte fluxo principal:

```text
Home
↓
Detalhe do espaço
↓
Selecionar serviços
↓
Escolher profissional
↓
Escolher data e horário
↓
Revisar agendamento
↓
Pagamento
↓
Agendamento confirmado
```

---

## 5. Telas principais do app cliente

### 5.1 HomeScreen

Objetivo: permitir que a cliente encontre espaços ou serviços rapidamente.

Funcionalidades:

- Saudação personalizada.
- Campo de busca por espaço ou serviço.
- Filtro visual.
- Categorias horizontais.
- Lista de espaços próximos.
- Espaços favoritos.
- Estado vazio de agendamentos.
- Bottom tab navigation.

Categorias iniciais:

- Psicoterapia.
- Avaliação inicial.
- Orientação.
- Mais procuradas.
- Mais.

Espaços mockados:

- Psi Agenda Online.
- Consultório Sereno.
- Clínica Escuta.

---

### 5.2 SpaceDetailsScreen

Objetivo: apresentar os detalhes do espaço selecionado.

Funcionalidades:

- Imagem principal do espaço.
- Botão voltar.
- Botão compartilhar.
- Botão favorito.
- Nome do espaço.
- Status aberto/fechado.
- Avaliação.
- Endereço.
- Horário de funcionamento.
- Preço inicial.
- Abas: Sobre, Serviços, Profissionais e Avaliações.
- Lista resumida de serviços.
- Lista de profissionais.
- Botão fixo “Agendar agora”.
- Botão de contato.

---

### 5.3 ServiceSelectionScreen

Objetivo: permitir que a cliente selecione um ou mais serviços.

Funcionalidades:

- Lista de serviços disponíveis.
- Seleção múltipla de serviços.
- Checkbox por serviço.
- Cálculo automático do tempo total.
- Cálculo automático do valor total.
- Resumo fixo da fatura no rodapé.
- Botão “Continuar”.
- Bloqueio do botão caso nenhum serviço esteja selecionado.

Serviços mockados:

| Serviço | Duração | Preço |
|---|---:|---:|
| Manicure | 40 min | R$ 35,00 |
| Pedicure | 50 min | R$ 45,00 |
| Esmaltação em gel | 60 min | R$ 60,00 |
| Alongamento de unhas | 120 min | R$ 120,00 |
| Remoção de gel | 30 min | R$ 25,00 |
| Decoração simples | 20 min | R$ 15,00 |

Regra principal:

```text
Tempo total = soma das durações dos serviços selecionados
Valor total = soma dos preços dos serviços selecionados
```

Exemplo:

```text
Manicure + Pedicure
40 min + 50 min = 90 min
R$ 35,00 + R$ 45,00 = R$ 80,00
```

---

### 5.4 ProfessionalSelectionScreen

Objetivo: permitir que a cliente escolha uma profissional compatível com os serviços selecionados.

Funcionalidades:

- Resumo do espaço.
- Resumo dos serviços selecionados.
- Opção “Qualquer profissional disponível”.
- Lista de profissionais compatíveis.
- Radio button para seleção.
- Próximo horário disponível por profissional.
- Botão “Continuar”.
- Bloqueio do botão caso nenhuma opção seja escolhida.

Profissionais mockadas:

| Profissional | Avaliação | Experiência | Serviços |
|---|---:|---:|---|
| Ana Silva | 4,9 | 7 anos | Manicure, Pedicure, Esmaltação em gel, Alongamento |
| Júlia Santos | 4,8 | 5 anos | Manicure, Pedicure, Esmaltação em gel |
| Camila Oliveira | 4,7 | 6 anos | Manicure, Pedicure |
| Larissa Gomes | 4,9 | 8 anos | Manicure, Pedicure, Esmaltação em gel, Alongamento |

Regra principal:

```text
A profissional só pode aparecer como compatível se atender todos os serviços selecionados.
```

Exemplo:

```text
Serviços selecionados: Manicure + Pedicure
Profissional precisa atender Manicure e Pedicure.
```

---

### 5.5 CalendarSelectionScreen

Objetivo: permitir que a cliente selecione data e horário disponível.

Funcionalidades:

- Resumo da profissional selecionada.
- Resumo dos serviços.
- Lista horizontal de dias.
- Grid de horários disponíveis.
- Indicação de horários indisponíveis.
- Horário inicial e final já calculado.
- Resumo fixo do agendamento no rodapé.
- Botão “Continuar”.

Regra principal:

```text
O calendário só deve mostrar horários com tempo contínuo suficiente para o atendimento.
```

Exemplo:

```text
Serviços: Manicure + Pedicure
Tempo total: 1h30min
Horário selecionado: 14:00
Horário final: 15:30
```

Estados dos horários:

- Disponível.
- Selecionado.
- Indisponível.

---

### 5.6 AppointmentReviewScreen

Objetivo: permitir que a cliente revise todos os dados antes do pagamento.

Funcionalidades:

- Revisão da profissional.
- Revisão do espaço.
- Revisão da data.
- Revisão do horário.
- Revisão dos serviços.
- Tempo total.
- Total do agendamento.
- Informações importantes.
- Política de cancelamento.
- Botão “Ir para pagamento”.

Informações importantes iniciais:

- Chegar com 10 minutos de antecedência.
- Cancelamentos com até 24h de antecedência são gratuitos.
- Após este prazo, poderá haver cobrança de taxa.

---

### 5.7 PaymentScreen

Objetivo: permitir que a cliente escolha a forma de pagamento e confirme o agendamento.

Funcionalidades:

- Resumo do agendamento.
- Seleção da forma de pagamento.
- Resumo financeiro.
- Política de pagamento do espaço.
- Ambiente seguro.
- Botão “Confirmar pagamento”.

Métodos de pagamento no MVP:

- Pix.
- Cartão de crédito.
- Cartão de débito.
- Pagamento no local.

Regra inicial do MVP:

```text
O espaço pode permitir pagamento no local.
Para pagamentos online, o sistema deve futuramente criar uma reserva temporária até a confirmação do pagamento.
```

Resumo mockado:

```text
Subtotal: R$ 80,00
Taxa de serviço: R$ 0,00
Total: R$ 80,00
```

---

### 5.8 BookingSuccessScreen

Objetivo: mostrar que o agendamento foi confirmado com sucesso.

Funcionalidades:

- Mensagem de sucesso.
- Check verde.
- Confetes decorativos.
- Resumo do agendamento.
- Espaço.
- Profissional.
- Serviços agendados.
- Pagamento confirmado.
- Código do pedido.
- Ações rápidas.
- Botão “Concluir”.

Ações rápidas:

- Adicionar ao calendário.
- Compartilhar.
- Ver meus agendamentos.
- Falar com o espaço.

Exemplo de pedido:

```text
Pedido #12345
Pagamento confirmado via Pix
Valor pago: R$ 80,00
```

---

## 6. Funcionalidades principais do MVP

### 6.1 Cliente

- Visualizar espaços.
- Buscar espaço ou serviço.
- Filtrar por categoria.
- Favoritar espaço.
- Ver detalhes do espaço.
- Ver serviços disponíveis.
- Selecionar múltiplos serviços.
- Ver soma de tempo e preço em tempo real.
- Escolher profissional.
- Escolher qualquer profissional disponível.
- Escolher data e horário.
- Revisar agendamento.
- Escolher pagamento.
- Confirmar agendamento.
- Ver confirmação final.
- Ver meus agendamentos futuramente.

---

### 6.2 Espaço/Gestor

Estas funcionalidades entram no painel administrativo nas próximas fases:

- Cadastrar espaço.
- Editar dados do espaço.
- Cadastrar serviços.
- Definir preço dos serviços.
- Definir duração média dos serviços.
- Cadastrar profissionais.
- Vincular profissionais a serviços.
- Definir expediente do espaço.
- Definir expediente das profissionais.
- Bloquear horários.
- Ver agenda do dia.
- Ver lista de agendamentos.
- Confirmar, cancelar ou concluir atendimento.
- Configurar política de cancelamento.
- Configurar formas de pagamento.

---

### 6.3 Profissional

Funcionalidades futuras:

- Ver agenda própria.
- Bloquear horários próprios.
- Confirmar atendimento.
- Marcar atendimento como concluído.
- Ver histórico.
- Ver avaliações.

---

## 7. Regras de negócio

### 7.1 Serviço

Cada serviço deve possuir:

- Nome.
- Descrição.
- Preço.
- Duração em minutos.
- Status ativo/inativo.
- Profissionais habilitadas.

Regra:

```text
Um serviço sem preço, duração ou profissional habilitada não deve aparecer para a cliente.
```

---

### 7.2 Seleção de múltiplos serviços

A cliente pode selecionar mais de um serviço.

Regra:

```text
O valor total e o tempo total devem ser recalculados sempre que um serviço for adicionado ou removido.
```

---

### 7.3 Compatibilidade da profissional

Regra:

```text
A profissional só pode ser selecionada se atender todos os serviços escolhidos.
```

Exemplo:

```text
Cliente escolheu: Manicure + Pedicure + Alongamento
Profissional precisa atender os três serviços.
```

---

### 7.4 Disponibilidade de horário

A disponibilidade deve considerar:

- Horário de funcionamento do espaço.
- Horário de trabalho da profissional.
- Serviços selecionados.
- Tempo total do atendimento.
- Agendamentos confirmados.
- Reservas temporárias.
- Bloqueios manuais.
- Intervalo entre atendimentos.
- Folgas.
- Feriados.

Regra:

```text
O app só deve mostrar horários em que exista um bloco contínuo livre suficiente para o atendimento completo.
```

---

### 7.5 Confirmação de agendamento

Antes de confirmar o agendamento, o backend deve validar novamente se o horário continua disponível.

Motivo:

```text
Duas clientes podem tentar agendar o mesmo horário ao mesmo tempo.
```

Fluxo correto:

```text
Cliente escolhe horário
↓
Sistema valida disponibilidade
↓
Sistema cria reserva temporária
↓
Cliente paga ou confirma pagamento no local
↓
Sistema valida novamente
↓
Sistema confirma o agendamento
```

---

### 7.6 Reserva temporária

Para pagamentos online, deve existir reserva temporária.

Regra sugerida:

```text
Reserva temporária de 10 minutos.
Se o pagamento for aprovado, o agendamento é confirmado.
Se o pagamento expirar, o horário é liberado.
```

Status possíveis:

- pending_payment.
- confirmed.
- expired.
- cancelled.
- completed.
- no_show.

---

### 7.7 Cancelamento

Regra inicial do MVP:

```text
A cliente pode cancelar gratuitamente até 24h antes do atendimento.
Após esse prazo, o espaço pode aplicar taxa ou exigir contato manual.
```

---

## 8. Modelo de dados sugerido

### 8.1 User

```ts
export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'space_owner' | 'professional' | 'admin';
};
```

---

### 8.2 Space

```ts
export type Space = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  whatsapp?: string;
  rating?: number;
  reviewsCount?: number;
  openingHours: OpeningHour[];
  paymentPolicy?: string;
  cancellationPolicy?: string;
  active: boolean;
};
```

---

### 8.3 Service

```ts
export type Service = {
  id: string;
  spaceId: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  durationMinutes: number;
  bufferAfterMinutes?: number;
  active: boolean;
};
```

---

### 8.4 Professional

```ts
export type Professional = {
  id: string;
  spaceId: string;
  name: string;
  photoUrl?: string;
  specialty?: string;
  experienceYears?: number;
  rating?: number;
  reviewsCount?: number;
  active: boolean;
};
```

---

### 8.5 ProfessionalService

```ts
export type ProfessionalService = {
  professionalId: string;
  serviceId: string;
};
```

---

### 8.6 ProfessionalSchedule

```ts
export type ProfessionalSchedule = {
  id: string;
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
};
```

---

### 8.7 Appointment

```ts
export type AppointmentStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type Appointment = {
  id: string;
  code: string;
  customerId: string;
  spaceId: string;
  professionalId?: string;
  anyProfessional: boolean;
  startDateTime: string;
  endDateTime: string;
  totalDurationMinutes: number;
  subtotal: number;
  serviceFee: number;
  total: number;
  status: AppointmentStatus;
  createdAt: string;
};
```

---

### 8.8 AppointmentService

```ts
export type AppointmentService = {
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
};
```

---

### 8.9 Payment

```ts
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'pay_on_site';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'not_required';

export type Payment = {
  id: string;
  appointmentId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  paidAt?: string;
  provider?: string;
  providerTransactionId?: string;
};
```

---

### 8.10 BlockedTime

```ts
export type BlockedTime = {
  id: string;
  professionalId: string;
  startDateTime: string;
  endDateTime: string;
  reason?: string;
};
```

---

## 9. Configurações necessárias

### 9.1 Configurações do espaço

O espaço deve poder configurar:

- Nome.
- Descrição.
- Fotos.
- Endereço.
- Telefone.
- WhatsApp.
- Horário de funcionamento.
- Política de cancelamento.
- Política de pagamento.
- Formas de pagamento aceitas.
- Tempo mínimo de antecedência para agendamento.
- Tempo mínimo para cancelamento.
- Intervalo entre atendimentos.
- Permitir ou não pagamento no local.
- Exigir ou não pagamento antecipado.
- Valor de sinal, se houver.

---

### 9.2 Configurações de serviço

Cada serviço deve permitir configurar:

- Nome.
- Categoria.
- Descrição.
- Preço.
- Duração média.
- Tempo de intervalo após o serviço.
- Profissionais habilitadas.
- Status ativo/inativo.
- Permitir agendamento online.

---

### 9.3 Configurações de profissional

Cada profissional deve permitir configurar:

- Nome.
- Foto.
- Especialidade.
- Serviços que atende.
- Horário de trabalho.
- Pausas.
- Folgas.
- Bloqueios manuais.
- Status ativo/inativo.

---

### 9.4 Configurações de pagamento

O sistema deve permitir configurar:

- Pix.
- Cartão de crédito.
- Cartão de débito.
- Pagamento no local.
- Pagamento antecipado obrigatório.
- Pagamento parcial/sinal.
- Taxa de serviço.
- Webhook de confirmação de pagamento.
- Tempo de expiração da reserva.

---

## 10. Dados mockados que precisam ser removidos futuramente

Durante o MVP visual, os dados abaixo estarão mockados. Eles devem ser substituídos por API e banco de dados nas fases seguintes.

### 10.1 Dados da cliente

Mock atual:

```text
Nome: Gabriela
```

Substituir por:

```text
Usuário autenticado vindo da API/Auth.
```

---

### 10.2 Espaços

Mock atual:

```text
Psi Agenda Online
Consultório Sereno
Clínica Escuta
```

Substituir por:

```text
GET /spaces
GET /spaces/{id}
```

---

### 10.3 Categorias

Mock atual:

```text
Unhas
Cabelo
Estética
Massagem
Mais
```

Substituir por:

```text
GET /categories
```

---

### 10.4 Serviços

Mock atual:

```text
Manicure, Pedicure, Esmaltação em gel, Alongamento, Remoção de gel, Decoração simples
```

Substituir por:

```text
GET /spaces/{spaceId}/services
```

---

### 10.5 Profissionais

Mock atual:

```text
Ana Silva, Júlia Santos, Camila Oliveira, Larissa Gomes
```

Substituir por:

```text
GET /spaces/{spaceId}/professionals
POST /professionals/search-compatible
```

---

### 10.6 Horários disponíveis

Mock atual:

```text
09:00 - 10:30
09:30 - 11:00
10:00 - 11:30
14:00 - 15:30
```

Substituir por:

```text
POST /availability/search
```

Payload sugerido:

```json
{
  "spaceId": "space_1",
  "professionalId": "professional_1",
  "serviceIds": ["service_1", "service_2"],
  "date": "2026-05-25"
}
```

---

### 10.7 Pagamento

Mock atual:

```text
Pix aprovado automaticamente.
Cartão simulado.
Pagamento no local simulado.
```

Substituir por:

```text
POST /payments/create
POST /payments/webhook
GET /payments/{id}
```

---

### 10.8 Confirmação de pedido

Mock atual:

```text
Pedido #12345
```

Substituir por:

```text
POST /appointments/confirm
GET /appointments/{id}
```

---

## 11. Endpoints sugeridos

### 11.1 Espaços

```http
GET /spaces
GET /spaces/{id}
POST /spaces
PUT /spaces/{id}
```

---

### 11.2 Serviços

```http
GET /spaces/{spaceId}/services
POST /spaces/{spaceId}/services
PUT /services/{id}
DELETE /services/{id}
```

---

### 11.3 Profissionais

```http
GET /spaces/{spaceId}/professionals
POST /spaces/{spaceId}/professionals
PUT /professionals/{id}
DELETE /professionals/{id}
POST /professionals/search-compatible
```

---

### 11.4 Disponibilidade

```http
POST /availability/search
```

---

### 11.5 Agendamentos

```http
POST /appointments/reserve
POST /appointments/confirm
GET /appointments/{id}
GET /customers/{customerId}/appointments
GET /spaces/{spaceId}/appointments
POST /appointments/{id}/cancel
POST /appointments/{id}/complete
```

---

### 11.6 Pagamentos

```http
POST /payments/create
GET /payments/{id}
POST /payments/webhook
POST /payments/{id}/refund
```

---

## 12. Arquitetura sugerida do front-end

```text
src/
  app/
    navigation/
      AppNavigator.tsx
      CustomerStack.tsx
      BottomTabs.tsx
  screens/
    customer/
      HomeScreen.tsx
      SpaceDetailsScreen.tsx
      ServiceSelectionScreen.tsx
      ProfessionalSelectionScreen.tsx
      CalendarSelectionScreen.tsx
      AppointmentReviewScreen.tsx
      PaymentScreen.tsx
      BookingSuccessScreen.tsx
    owner/
      OwnerDashboardScreen.tsx
      ManageServicesScreen.tsx
      ManageProfessionalsScreen.tsx
      SpaceScheduleScreen.tsx
  components/
    common/
    cards/
    forms/
    booking/
  contexts/
    BookingContext.tsx
    AuthContext.tsx
  data/
    mockSpaces.ts
    mockServices.ts
    mockProfessionals.ts
    mockAvailability.ts
  types/
    space.ts
    service.ts
    professional.ts
    appointment.ts
    payment.ts
  utils/
    formatCurrency.ts
    formatDuration.ts
    availability.ts
```

---

## 13. Contexto global do agendamento

O app deve manter o estado da jornada da cliente em um contexto global.

```ts
export type BookingState = {
  selectedSpace: Space | null;
  selectedServices: Service[];
  selectedProfessional: Professional | null;
  anyProfessional: boolean;
  selectedDate: string | null;
  selectedTimeSlot: TimeSlot | null;
  paymentMethod: PaymentMethod | null;
  totalDurationMinutes: number;
  subtotal: number;
  serviceFee: number;
  total: number;
};
```

Funções recomendadas:

```ts
selectSpace(space: Space): void;
toggleService(service: Service): void;
selectProfessional(professional: Professional): void;
selectAnyProfessional(): void;
selectDate(date: string): void;
selectTimeSlot(slot: TimeSlot): void;
selectPaymentMethod(method: PaymentMethod): void;
resetBooking(): void;
```

---

## 14. Fases do projeto adaptadas à arquitetura robusta

A partir da decisão técnica oficial, o projeto deve evoluir de protótipo para produto real usando **React Native + API ASP.NET Core + PostgreSQL**.

---

## Fase 1 — Protótipo visual navegável com mocks

Objetivo:

Criar o app cliente com as 8 telas principais usando dados mockados, sem backend ainda, mas já respeitando o fluxo real do produto.

Entregas:

- Setup do projeto React Native com Expo e TypeScript.
- React Navigation configurado.
- HomeScreen.
- SpaceDetailsScreen.
- ServiceSelectionScreen.
- ProfessionalSelectionScreen.
- CalendarSelectionScreen.
- AppointmentReviewScreen.
- PaymentScreen.
- BookingSuccessScreen.
- Componentes reutilizáveis.
- Dados mockados organizados em arquivos separados.
- Estilo visual consistente.

Critério de aceite:

```text
A cliente consegue percorrer o fluxo inteiro de agendamento usando dados mockados, da Home até a tela de sucesso.
```

---

## Fase 2 — Estado compartilhado, autenticação visual e fluxo dinâmico local

Objetivo:

Substituir telas isoladas por um fluxo funcional usando estado compartilhado, preparando o app para integração com API.

Entregas:

- AuthContext mockado.
- BookingContext.
- OwnerConfigContext local/mockado.
- LoginScreen mockada.
- RegisterRoleSelectionScreen.
- CustomerRegisterScreen mockada.
- SpaceOwnerRegisterScreen mockada.
- CreateSpaceScreen mockada.
- OwnerOnboardingChecklistScreen mockada.
- Fluxo cliente usando dados do contexto.
- Seleção real local de serviços.
- Soma real local de preço.
- Soma real local de duração.
- Filtro local de profissionais compatíveis.
- Seleção real de data e horário.
- Revisão usando dados escolhidos anteriormente.
- Pagamento mockado usando método selecionado.
- Tela de sucesso usando dados reais do contexto.

Critério de aceite:

```text
O app diferencia cliente e gestor visualmente, e todas as telas refletem as escolhas anteriores sem dados fixos duplicados.
```

---

## Fase 3 — Backend base, banco PostgreSQL, autenticação real e cadastro do espaço

Objetivo:

Criar a fundação real do produto: API, banco, autenticação, cadastro de usuário, criação de espaço e vínculo do usuário administrador do espaço.

Stack obrigatória da fase:

```text
ASP.NET Core Web API em .NET 10
PostgreSQL
Entity Framework Core
JWT + Refresh Token
Docker Compose para ambiente local
```

Entregas backend:

- Criação do projeto ASP.NET Core Web API.
- Configuração do PostgreSQL.
- Configuração do Entity Framework Core.
- Migrations iniciais.
- Estrutura de camadas: API, Application, Domain, Infrastructure.
- Cadastro de usuário cliente.
- Cadastro de usuário gestor.
- Login real.
- Refresh token.
- Roles: customer, space_admin, professional, super_admin.
- Endpoint para criar espaço.
- Criação automática do vínculo `space_admin`.
- Endpoint para buscar dados do espaço do gestor logado.
- Endpoint para atualizar dados básicos do espaço.
- Validação de ownership do espaço.
- Logs básicos.

Entregas app:

- Integração do login com API.
- Integração do cadastro de cliente com API.
- Integração do cadastro de gestor com API.
- Integração da criação de espaço com API.
- Tela de checklist inicial lendo status real do backend.
- Armazenamento seguro do token.
- Logout.

Critério de aceite:

```text
Um gestor consegue criar conta, criar o espaço pelo app, ser vinculado como administrador do espaço e acessar o painel do gestor com dados reais vindos da API.
```

---

## Fase 4 — Gestão real do espaço, agenda inteligente e reserva temporária

Objetivo:

Substituir os mocks operacionais por dados reais configurados pelo gestor no próprio app, incluindo serviços, profissionais, horários, disponibilidade e reserva temporária.

Entregas backend:

- CRUD real de serviços.
- CRUD real de categorias de serviço.
- CRUD real de profissionais.
- Vínculo profissional-serviço.
- Upload/cadastro de fotos do espaço, se aplicável.
- Cadastro de horário de funcionamento do espaço.
- Cadastro de agenda individual da profissional.
- Cadastro de pausas, almoço, folgas e exceções.
- Cadastro de bloqueios manuais.
- Configuração de política de cancelamento.
- Configuração de regras de pagamento.
- Endpoint de busca de espaços publicados.
- Endpoint de detalhes do espaço.
- Endpoint de busca de serviços do espaço.
- Endpoint de busca de profissionais compatíveis.
- Endpoint `POST /availability/search`.
- Algoritmo real de disponibilidade.
- Consideração de duração total dos serviços.
- Consideração de buffer entre atendimentos.
- Consideração de agendamentos existentes.
- Consideração de reservas ativas.
- Consideração de bloqueios e folgas.
- Endpoint `POST /appointments/reserve`.
- Criação de reserva temporária com `expires_at`.
- Worker Service para expirar reservas vencidas.
- Proteção contra conflito de agenda usando transação no banco.

Entregas app gestor:

- OwnerDashboardScreen com dados reais.
- SpaceSettingsScreen integrada.
- ManageServicesScreen integrada.
- CreateEditServiceScreen integrada.
- ManageProfessionalsScreen integrada.
- CreateEditProfessionalScreen integrada.
- ProfessionalServicesScreen integrada.
- SpaceOpeningHoursScreen integrada.
- ProfessionalScheduleScreen integrada.
- BlockedTimesScreen integrada.
- BookingRulesSettingsScreen integrada.
- PaymentSettingsScreen integrada.
- CancellationPolicyScreen integrada.
- OwnerAgendaScreen integrada.
- AppointmentsManagementScreen integrada.

Entregas app cliente:

- Home consumindo espaços reais.
- Detalhe do espaço consumindo dados reais.
- Seleção de serviços reais.
- Seleção de profissionais reais compatíveis.
- Calendário consumindo disponibilidade real da API.
- Criação de reserva temporária antes do pagamento.

Critério de aceite:

```text
O gestor configura serviços, profissionais, horários, pagamentos e cancelamentos pelo próprio app. A cliente vê esses dados reais e só consegue selecionar horários realmente disponíveis, sem conflito de agenda.
```

---

## Fase 5 — MVP final pronto para produção

Objetivo:

Finalizar o produto para uso real por pelo menos um espaço de beleza, com pagamento, notificações, segurança, publicação e operação mínima confiável.

Entregas app cliente:

- Login/cadastro real.
- Perfil da cliente.
- Busca de espaços reais.
- Fluxo completo de agendamento real.
- Meus agendamentos.
- Detalhe do agendamento.
- Cancelamento conforme política.
- Reagendamento conforme política.
- Favoritos.
- Histórico de pagamentos.
- Avaliação de atendimento.

Entregas app gestor:

- Dashboard operacional.
- Cadastro e edição do espaço.
- Gestão de fotos.
- Gestão de serviços.
- Gestão de categorias.
- Gestão de profissionais.
- Gestão de vínculos profissional-serviço.
- Configuração de funcionamento.
- Configuração de agenda por profissional.
- Bloqueios e exceções.
- Configuração de pagamentos.
- Configuração de sinal/entrada.
- Configuração de cancelamento.
- Configuração de notificações.
- Agenda diária/semanal.
- Gestão de agendamentos.
- Detalhe do agendamento.
- Marcar concluído/não compareceu.

Entregas app profissional:

- Agenda própria.
- Detalhe do atendimento.
- Bloqueio próprio, se permitido pelo gestor.
- Marcar atendimento como concluído.
- Marcar não comparecimento.

Entregas backend/produto:

- Pagamento no local configurável.
- Pix online via Mercado Pago.
- Webhook de pagamento.
- Reserva temporária com expiração.
- Confirmação automática após pagamento aprovado.
- Cancelamento e reagendamento respeitando política do espaço.
- Notificações básicas.
- Logs e auditoria.
- Tratamento de erros.
- Loading states.
- Empty states.
- Permissões por perfil.
- Rate limit em endpoints sensíveis.
- Validação de webhook.
- Política de privacidade.
- Termos de uso.
- Adequação LGPD básica.
- Build Android.
- Build iOS.
- Deploy da API.
- Banco PostgreSQL em ambiente de produção.
- Backup básico do banco.
- Monitoramento básico.

Critério de aceite final:

```text
Um gestor consegue criar uma conta, cadastrar seu espaço, configurar serviços, profissionais, horários, pagamentos e cancelamentos pelo próprio app. Uma cliente consegue encontrar esse espaço, agendar um atendimento real, pagar ou reservar conforme regra configurada e receber a confirmação sem conflito de agenda.
```

---

## 15. Backlog pós-MVP

Funcionalidades futuras:

- Avaliações reais.
- Cupons.
- Programa de fidelidade.
- Pacotes mensais.
- Assinatura para espaços.
- Split de pagamento entre espaço e profissional.
- Comissão automática.
- Chat interno.
- Lista de espera.
- Reagendamento inteligente.
- Notificações avançadas.
- Relatórios financeiros.
- Controle de no-show.
- Campanhas promocionais.
- Marketplace com busca por localização.
- Mapa de espaços próximos.
- Integração WhatsApp.

---

## 16. Prioridades técnicas

A ordem técnica recomendada é:

```text
1. Criar app React Native com navegação.
2. Criar as 8 telas com mocks.
3. Criar BookingContext.
4. Remover dados duplicados das telas.
5. Criar backend ASP.NET Core Web API (.NET 10).
6. Criar banco PostgreSQL com Entity Framework Core.
7. Criar painel administrativo.
8. Integrar app com API.
9. Implementar disponibilidade real no backend.
10. Implementar reserva temporária com banco e Worker Service, evoluindo para Redis.
11. Implementar pagamento.
12. Preparar MVP para produção.
```

---

## 17. Stack recomendada definitiva

### 17.1 Front-end mobile

```text
React Native
Expo
TypeScript
React Navigation
@expo/vector-icons
react-native-safe-area-context
react-native-gesture-handler
react-native-reanimated
```

### 17.2 Backend/API

```text
ASP.NET Core Web API em .NET 10
Entity Framework Core
PostgreSQL
JWT Authentication
Refresh Token
Worker Service para expiração de reservas
Redis para cache/locks temporários em versão robusta
Docker
```

### 17.3 Banco de dados

Banco oficial escolhido:

```text
PostgreSQL
```

Motivos:

- Bom suporte a dados relacionais.
- Bom custo para produto novo.
- Boa integração com .NET e Entity Framework Core.
- Suporte a JSON quando necessário.
- Possibilidade futura de uso de PostGIS para busca por localização.
- Boa escolha para SaaS/multiespaço.

### 17.4 Pagamento

Ordem recomendada:

```text
1. Pagamento no local
2. Pix online via Mercado Pago
3. Cartão de crédito/débito
4. Sinal/entrada
5. Split de pagamento apenas em fase marketplace
```

A API deve receber webhooks do gateway e nunca confiar apenas no retorno visual do app.

### 17.5 Notificações

```text
Firebase Cloud Messaging ou Expo Push Notifications
E-mail transacional
WhatsApp futuramente
```

### 17.6 Storage de imagens

```text
Cloudflare R2
AWS S3
Azure Blob Storage
```

Uso previsto:

- Fotos do espaço.
- Fotos das profissionais.
- Imagens de serviços.
- Documentos futuros, se necessário.

### 17.7 Deploy

```text
Docker
API em Azure, AWS, Render, Railway ou VPS Linux
PostgreSQL gerenciado ou containerizado em ambiente controlado
Redis gerenciado ou containerizado
CI/CD futuramente
```

---

## 18. Riscos principais

### 18.1 Conflito de agenda

Risco:

```text
Duas clientes agendam o mesmo horário ao mesmo tempo.
```

Solução:

```text
Validação no backend com transação no banco de dados e reserva temporária.
```

---

### 18.2 Pagamento confirmado mas horário indisponível

Risco:

```text
Pagamento é aprovado, mas o horário já foi ocupado.
```

Solução:

```text
Criar reserva temporária antes do pagamento e bloquear o slot até expirar ou confirmar.
```

---

### 18.3 Duração incorreta dos serviços

Risco:

```text
Serviços duram mais que o previsto e afetam a agenda.
```

Solução:

```text
Permitir configuração de duração média e buffer após atendimento.
```

---

### 18.4 Espaços sem configuração correta

Risco:

```text
Serviços aparecem sem profissional disponível.
```

Solução:

```text
Não exibir serviços incompletos para clientes.
```

---

## 19. Definição de MVP final

O MVP final será considerado pronto quando:

- Cliente conseguir agendar de ponta a ponta.
- Espaço conseguir cadastrar serviços e profissionais.
- Sistema calcular disponibilidade corretamente.
- Sistema impedir conflito de agenda.
- Sistema confirmar pagamento ou pagamento no local.
- Cliente receber tela de confirmação.
- Espaço conseguir visualizar o agendamento.
- Agendamento tiver status controlado.
- Dados mockados principais tiverem sido removidos.

---

## 20. Resumo executivo

Este app deve começar como um protótipo visual de agendamento para manicure, mas evoluir para uma plataforma completa de agendamento para serviços locais.

O coração do produto é a agenda inteligente:

```text
Serviços selecionados → duração total → profissionais compatíveis → horários disponíveis → reserva → pagamento → confirmação
```

A prioridade é entregar um fluxo simples e confiável, evitando conflito de horários e deixando a experiência da cliente rápida, clara e profissional.
---

## 15. Atualização obrigatória — Telas de cadastro, autenticação e gestão dinâmica pelo app

Esta seção complementa a especificação original e define todas as telas necessárias para que o app deixe de depender de dados mockados e passe a ser configurado diretamente pelo gestor do espaço dentro do próprio aplicativo.

O objetivo é permitir que o próprio dono/gestor cadastre o espaço, crie o usuário administrador do espaço, configure serviços, profissionais, agenda, pagamentos, cancelamentos e regras operacionais sem depender de intervenção manual no banco de dados.

---

## 16. Perfis de usuário e permissões

O sistema deve trabalhar com perfis diferentes de acesso.

### 16.1 Perfis principais

| Perfil | Descrição | Permissões principais |
|---|---|---|
| `customer` | Cliente que agenda serviços | Buscar espaços, agendar, pagar, cancelar, reagendar, favoritar e avaliar |
| `space_admin` | Administrador principal do espaço | Configurar espaço, serviços, profissionais, agenda, pagamentos e políticas |
| `space_manager` | Gestor operacional do espaço | Gerenciar agenda, profissionais, serviços e agendamentos, conforme permissão |
| `professional` | Profissional que realiza atendimentos | Ver agenda própria, bloquear horários, concluir atendimento, ver histórico |
| `system_admin` | Administrador da plataforma | Gerenciar espaços, usuários, suporte, auditoria e configurações globais |

### 16.2 Regra de criação do usuário admin do espaço

Quando um novo espaço for cadastrado pelo app, o sistema deve obrigatoriamente criar ou vincular um usuário administrador para esse espaço.

Fluxo recomendado:

```text
Usuário escolhe “Sou dono/gestor de um espaço”
↓
Cria conta de usuário
↓
Valida e-mail/telefone
↓
Cadastra dados básicos do espaço
↓
Sistema cria o Space
↓
Sistema vincula o usuário criado como `space_admin` do Space
↓
Usuário entra no painel do gestor
↓
Usuário completa configurações obrigatórias
```

### 16.3 Regras de permissão

- Um `space_admin` pode gerenciar somente os espaços vinculados a ele.
- Um `professional` só pode ver a própria agenda e os atendimentos atribuídos a ela.
- Um `customer` não pode acessar telas administrativas.
- Um `system_admin` pode visualizar e administrar todos os espaços da plataforma.
- Um espaço pode ter mais de um usuário gestor.
- Toda ação administrativa importante deve registrar auditoria: quem alterou, quando alterou e qual dado foi alterado.

---

## 17. Telas de autenticação e cadastro

Estas telas são obrigatórias para que o app seja dinâmico e multiusuário.

### 17.1 WelcomeScreen

Objetivo: primeira tela de entrada do app.

Funcionalidades:

- Apresentar o app.
- Botão “Entrar”.
- Botão “Criar conta”.
- Opção de continuar como cliente, se permitido.

---

### 17.2 LoginScreen

Objetivo: autenticar cliente, profissional, gestor ou admin.

Campos:

- E-mail ou telefone.
- Senha.

Ações:

- Entrar.
- Esqueci minha senha.
- Criar conta.

Regras:

- Após login, redirecionar conforme perfil:
  - `customer` → HomeScreen.
  - `space_admin` ou `space_manager` → OwnerDashboardScreen.
  - `professional` → ProfessionalAgendaScreen.
  - `system_admin` → SystemAdminDashboardScreen.

---

### 17.3 RegisterRoleSelectionScreen

Objetivo: permitir que o usuário escolha o tipo de cadastro.

Opções:

- “Quero agendar serviços” → cadastro de cliente.
- “Tenho um espaço/loja” → cadastro de gestor e espaço.
- “Sou profissional” → cadastro profissional por convite ou vínculo.

---

### 17.4 CustomerRegisterScreen

Objetivo: criar conta de cliente.

Campos:

- Nome completo.
- E-mail.
- Telefone/WhatsApp.
- Senha.
- Confirmar senha.
- Aceite dos termos de uso e política de privacidade.

Resultado:

```text
Criar usuário com role = customer
```

---

### 17.5 SpaceOwnerRegisterScreen

Objetivo: criar conta do dono/gestor do espaço.

Campos:

- Nome completo do responsável.
- E-mail.
- Telefone/WhatsApp.
- CPF, opcional para MVP.
- Senha.
- Confirmar senha.
- Aceite dos termos.

Resultado:

```text
Criar usuário com role = space_admin pendente de criação do espaço
```

Após concluir, redirecionar para CreateSpaceScreen.

---

### 17.6 CreateSpaceScreen

Objetivo: criar o espaço/loja pelo próprio gestor.

Campos obrigatórios:

- Nome do espaço.
- Categoria principal.
- Descrição curta.
- Telefone.
- WhatsApp.
- Endereço.
- Cidade.
- Estado.
- Bairro.
- CEP.

Campos opcionais:

- Instagram.
- Site.
- Foto de capa.
- Logo/foto do espaço.

Resultado esperado:

```text
Criar Space
Vincular usuário logado como space_admin do Space
Criar configurações padrão do espaço
Redirecionar para OwnerOnboardingChecklistScreen
```

---

### 17.7 OwnerOnboardingChecklistScreen

Objetivo: orientar o gestor a completar as configurações mínimas para publicar o espaço.

Checklist obrigatório:

- Dados do espaço preenchidos.
- Pelo menos 1 serviço ativo cadastrado.
- Pelo menos 1 profissional ativa cadastrada.
- Pelo menos 1 profissional vinculada a 1 serviço.
- Horário de funcionamento configurado.
- Horário da profissional configurado.
- Política de cancelamento configurada.
- Forma de pagamento configurada.

Regra:

```text
O espaço só pode ficar visível para clientes quando os itens mínimos obrigatórios estiverem completos.
```

---

### 17.8 ForgotPasswordScreen

Objetivo: recuperar acesso.

Campos:

- E-mail ou telefone.

Ações:

- Enviar código de recuperação.
- Validar código.
- Criar nova senha.

---

### 17.9 InviteProfessionalScreen

Objetivo: permitir que o gestor convide uma profissional para acessar o app.

Campos:

- Nome da profissional.
- E-mail ou telefone.
- Serviços que ela poderá atender.
- Permissão para editar a própria agenda: sim/não.

Resultado:

```text
Criar convite
Enviar link por WhatsApp/e-mail
Ao aceitar, criar usuário com role = professional vinculado ao Space
```

---

## 18. Telas administrativas do gestor pelo próprio app

Estas telas devem ficar disponíveis no painel do gestor e permitem configurar o app dinamicamente, sem mexer em código ou banco manualmente.

---

## 18.1 OwnerDashboardScreen

Objetivo: tela inicial do gestor.

Deve mostrar:

- Agendamentos de hoje.
- Próximo atendimento.
- Receita estimada do dia.
- Quantidade de atendimentos confirmados.
- Atendimentos aguardando pagamento.
- Atalhos rápidos:
  - Serviços.
  - Profissionais.
  - Agenda.
  - Bloquear horário.
  - Configurações.

---

## 18.2 SpaceSettingsScreen

Objetivo: editar dados principais do espaço.

Campos:

- Nome do espaço.
- Descrição.
- Categoria principal.
- Telefone.
- WhatsApp.
- Instagram.
- Site.
- Status do espaço:
  - Aberto.
  - Fechado temporariamente.
  - Oculto no app.
  - Em configuração.

Regras:

- Espaço oculto não aparece para clientes.
- Espaço em configuração aparece somente para gestores.
- Espaço fechado pode aparecer, mas não deve permitir novos horários, conforme configuração.

---

## 18.3 SpacePhotosScreen

Objetivo: gerenciar fotos do espaço.

Funcionalidades:

- Adicionar foto de capa.
- Adicionar galeria de fotos.
- Remover fotos.
- Definir foto principal.
- Reordenar fotos.

Regras:

- A primeira foto deve ser usada nos cards da Home.
- A foto de capa deve aparecer em SpaceDetailsScreen.

---

## 18.4 SpaceAddressLocationScreen

Objetivo: configurar endereço e localização.

Campos:

- CEP.
- Rua.
- Número.
- Complemento.
- Bairro.
- Cidade.
- Estado.
- Latitude.
- Longitude.
- Referência.

Funcionalidades:

- Buscar endereço pelo CEP.
- Ajustar localização no mapa futuramente.

---

## 18.5 SpaceContactSocialScreen

Objetivo: configurar canais de contato.

Campos:

- Telefone principal.
- WhatsApp.
- Instagram.
- E-mail comercial.
- Site.
- Link de localização.

Uso no app cliente:

- Botão “Contato”.
- Botão “Falar com o espaço”.
- Informações no detalhe do espaço.

---

## 18.6 BusinessStatusScreen

Objetivo: controlar se o espaço está operando.

Opções:

- Aberto normalmente.
- Fechado hoje.
- Fechado por período.
- Pausar novos agendamentos.
- Ocultar espaço temporariamente.

Regras:

- Se “pausar novos agendamentos” estiver ativo, horários futuros não devem aparecer para clientes.
- Agendamentos já confirmados devem continuar visíveis.

---

## 18.7 ManageServicesScreen

Objetivo: listar e gerenciar serviços do espaço.

Funcionalidades:

- Listar serviços.
- Buscar serviço.
- Filtrar por categoria.
- Criar serviço.
- Editar serviço.
- Ativar/inativar serviço.
- Duplicar serviço.
- Reordenar serviços.

Cada item deve mostrar:

- Nome.
- Categoria.
- Preço.
- Duração.
- Status ativo/inativo.
- Quantidade de profissionais habilitadas.

---

## 18.8 CreateEditServiceScreen

Objetivo: criar ou editar um serviço.

Campos obrigatórios:

- Nome do serviço.
- Categoria.
- Preço.
- Duração média em minutos.
- Status ativo/inativo.

Campos opcionais:

- Descrição.
- Tempo de intervalo após atendimento.
- Imagem/ícone do serviço.
- Permitir agendamento online.
- Exigir pagamento antecipado para este serviço.
- Preço promocional.

Vínculos:

- Selecionar profissionais que realizam esse serviço.

Regras:

- Serviço sem preço não pode ser publicado.
- Serviço sem duração não pode ser publicado.
- Serviço sem profissional habilitada não deve aparecer para clientes.
- Serviço inativo não aparece no fluxo de agendamento.

---

## 18.9 ServiceCategoriesScreen

Objetivo: gerenciar categorias de serviços do espaço.

Exemplos:

- Unhas.
- Cabelo.
- Estética.
- Massagem.
- Sobrancelha.

Funcionalidades:

- Criar categoria.
- Editar categoria.
- Reordenar categorias.
- Ativar/inativar categoria.

---

## 18.10 ServiceProfessionalsScreen

Objetivo: configurar quais profissionais atendem determinado serviço.

Funcionalidades:

- Selecionar profissionais habilitadas.
- Permitir preço diferente por profissional, opcional.
- Permitir duração diferente por profissional, opcional.

Exemplo:

```text
Serviço: Alongamento de unhas
Ana: atende, R$ 120, 120 min
Júlia: não atende
Larissa: atende, R$ 130, 110 min
```

Para o MVP, pode usar preço e duração padrão do serviço para todas as profissionais.

---

## 18.11 ManageProfessionalsScreen

Objetivo: listar e gerenciar profissionais do espaço.

Funcionalidades:

- Listar profissionais.
- Buscar profissional.
- Criar profissional.
- Editar profissional.
- Ativar/inativar profissional.
- Ver agenda da profissional.
- Vincular serviços.
- Enviar convite de acesso ao app.

Cada item deve mostrar:

- Foto.
- Nome.
- Especialidade.
- Status ativo/inativo.
- Quantidade de serviços atendidos.
- Próximo horário livre.

---

## 18.12 CreateEditProfessionalScreen

Objetivo: criar ou editar uma profissional.

Campos obrigatórios:

- Nome.
- Status ativo/inativo.

Campos opcionais:

- Foto.
- E-mail.
- Telefone/WhatsApp.
- Especialidade.
- Anos de experiência.
- Bio curta.
- Comissão, se aplicável.
- Permitir acesso ao app como profissional.

Vínculos:

- Serviços atendidos.
- Horários de trabalho.

Regras:

- Profissional inativa não aparece para clientes.
- Profissional sem serviço vinculado não aparece no fluxo de agendamento.
- Profissional sem agenda configurada não deve retornar horários disponíveis.

---

## 18.13 ProfessionalServicesScreen

Objetivo: configurar os serviços que a profissional atende.

Funcionalidades:

- Marcar/desmarcar serviços.
- Definir preço personalizado por profissional, opcional.
- Definir duração personalizada por profissional, opcional.
- Definir se aceita agendamento online.

Para o MVP:

```text
Usar preço e duração padrão do serviço.
```

---

## 18.14 SpaceOpeningHoursScreen

Objetivo: configurar horário de funcionamento geral do espaço.

Campos por dia da semana:

- Aberto/fechado.
- Hora de abertura.
- Hora de fechamento.

Exemplo:

```text
Segunda: 08:00 - 19:00
Terça: 08:00 - 19:00
Quarta: 08:00 - 19:00
Quinta: 08:00 - 19:00
Sexta: 08:00 - 19:00
Sábado: 08:00 - 14:00
Domingo: fechado
```

Regra:

```text
Nenhum horário pode ser oferecido fora do funcionamento do espaço.
```

---

## 18.15 ProfessionalScheduleScreen

Objetivo: configurar horário individual da profissional.

Campos por dia da semana:

- Trabalha neste dia: sim/não.
- Hora inicial.
- Hora final.
- Pausa/almoço.

Exemplo:

```text
Ana Silva
Segunda: 09:00 - 18:00
Almoço: 12:00 - 13:00
Terça: 09:00 - 18:00
Quarta: folga
```

Regra:

```text
Horário disponível da cliente = interseção entre horário do espaço e horário da profissional, removendo agendamentos, bloqueios e pausas.
```

---

## 18.16 BreaksAndHolidaysScreen

Objetivo: configurar pausas, feriados e exceções.

Funcionalidades:

- Cadastrar pausa recorrente.
- Cadastrar feriado.
- Cadastrar folga por data.
- Cadastrar horário especial.

Exemplos:

```text
Feriado: 25/12, espaço fechado
Horário especial: 24/12, aberto até 12:00
Pausa recorrente: almoço das 12:00 às 13:00
```

---

## 18.17 BlockedTimesScreen

Objetivo: bloquear horários manualmente.

Funcionalidades:

- Criar bloqueio.
- Editar bloqueio.
- Excluir bloqueio.
- Filtrar por profissional.
- Filtrar por data.

Campos:

- Profissional.
- Data.
- Hora inicial.
- Hora final.
- Motivo.
- Bloqueio recorrente: sim/não, futuro.

Exemplo:

```text
Profissional: Ana Silva
Data: 25/05/2026
Horário: 12:00 até 14:00
Motivo: compromisso pessoal
```

Regra:

```text
Bloqueios removem horários disponíveis imediatamente.
```

---

## 18.18 BookingRulesSettingsScreen

Objetivo: configurar regras gerais de agendamento.

Campos:

- Antecedência mínima para agendar.
- Antecedência máxima para agendar.
- Intervalo padrão entre atendimentos.
- Granularidade dos horários.
- Permitir escolher profissional.
- Permitir “qualquer profissional disponível”.
- Permitir agendamento fora do horário comercial: não para MVP.
- Exigir aprovação manual do gestor: sim/não.

Exemplo:

```text
Antecedência mínima: 2 horas
Antecedência máxima: 30 dias
Intervalo entre atendimentos: 10 min
Grade de horários: a cada 30 min
```

---

## 18.19 PaymentSettingsScreen

Objetivo: configurar formas de pagamento aceitas pelo espaço.

Opções:

- Pix.
- Cartão de crédito.
- Cartão de débito.
- Pagamento no local.
- Pagamento antecipado obrigatório.
- Sinal/entrada.
- Taxa de serviço.
- Tempo de expiração da reserva.

Regras:

- Se pagamento antecipado obrigatório estiver ativo, o cliente precisa pagar antes de confirmar.
- Se pagamento no local estiver ativo, o agendamento pode ser confirmado sem pagamento online.
- Se sinal estiver ativo, o cliente paga parte agora e o restante no local.

---

## 18.20 PixSettingsScreen

Objetivo: configurar recebimento por Pix.

Campos:

- Chave Pix.
- Tipo de chave.
- Nome do recebedor.
- Banco/instituição.
- Ambiente: sandbox/produção, futuro.

Para MVP:

```text
Pode iniciar com Pix manual ou simulado.
```

Para produção:

```text
Integrar com gateway que gere QR Code e webhook de pagamento.
```

---

## 18.21 CardGatewaySettingsScreen

Objetivo: configurar gateway de cartão.

Campos futuros:

- Provedor de pagamento.
- Credenciais.
- Ambiente.
- Split de pagamento, futuro.
- Taxa.

Para o MVP:

```text
Cartão pode ser mockado ou desabilitado até integração real.
```

---

## 18.22 OnsitePaymentSettingsScreen

Objetivo: configurar pagamento no local.

Campos:

- Permitir pagamento no local: sim/não.
- Métodos aceitos no local:
  - Dinheiro.
  - Pix direto.
  - Cartão na maquininha.
- Exibir aviso para cliente.

Exemplo de aviso:

```text
Este espaço permite pagamento no local após o atendimento.
```

---

## 18.23 DepositSettingsScreen

Objetivo: configurar sinal/entrada.

Opções:

- Sem sinal.
- Valor fixo.
- Percentual do total.

Campos:

- Tipo de sinal.
- Valor ou percentual.
- Reembolsável: sim/não.
- Texto exibido para cliente.

Exemplo:

```text
Pagamento de sinal obrigatório: 30%
Restante pago no local.
```

---

## 18.24 CancellationPolicyScreen

Objetivo: configurar política de cancelamento.

Campos:

- Permitir cancelamento pela cliente: sim/não.
- Prazo gratuito de cancelamento.
- Permitir reagendamento: sim/não.
- Prazo mínimo para reagendar.
- Cobrar taxa após prazo: sim/não.
- Texto da política exibido para cliente.

Exemplo:

```text
Cancelamento gratuito até 24h antes.
Após este prazo, entre em contato com o espaço.
```

---

## 18.25 NotificationSettingsScreen

Objetivo: configurar notificações e lembretes.

Opções:

- Lembrete para cliente.
- Lembrete para profissional.
- Notificação de novo agendamento para gestor.
- Notificação de cancelamento.
- Notificação de pagamento aprovado.

Canais futuros:

- Push.
- E-mail.
- WhatsApp.
- SMS.

Para MVP:

```text
Pode usar notificações mockadas ou apenas registrar eventos.
```

---

## 18.26 AppointmentsManagementScreen

Objetivo: listar e gerenciar agendamentos do espaço.

Funcionalidades:

- Lista de agendamentos.
- Filtro por data.
- Filtro por profissional.
- Filtro por status.
- Busca por cliente.
- Alternar visão diária/semanal.

Status:

- Aguardando pagamento.
- Confirmado.
- Cancelado.
- Expirado.
- Concluído.
- Não compareceu.

---

## 18.27 AppointmentDetailsOwnerScreen

Objetivo: visualizar e operar um agendamento específico.

Informações:

- Cliente.
- Contato da cliente.
- Profissional.
- Serviços.
- Data e horário.
- Valor.
- Status do pagamento.
- Status do agendamento.

Ações:

- Confirmar.
- Cancelar.
- Reagendar.
- Marcar como concluído.
- Marcar como não compareceu.
- Falar com cliente.

---

## 18.28 OwnerAgendaScreen

Objetivo: visualizar agenda do espaço.

Modos:

- Dia.
- Semana.
- Mês.
- Por profissional.

Funcionalidades:

- Ver horários ocupados.
- Ver horários livres.
- Criar bloqueio.
- Abrir detalhe do agendamento.
- Filtrar por profissional.

---

## 18.29 CustomerManagementScreen

Objetivo: listar clientes que já agendaram no espaço.

Funcionalidades:

- Buscar cliente.
- Ver histórico de atendimentos.
- Ver faltas/no-show.
- Ver avaliações.
- Abrir contato.

Para MVP, pode entrar na fase final.

---

## 18.30 ReviewsManagementScreen

Objetivo: gerenciar avaliações recebidas.

Funcionalidades:

- Ver avaliações do espaço.
- Ver avaliações por profissional.
- Responder avaliação, futuro.
- Ocultar denúncia, futuro.

---

## 18.31 ReportsDashboardScreen

Objetivo: visualizar indicadores básicos.

Indicadores:

- Receita por período.
- Número de atendimentos.
- Serviços mais agendados.
- Profissionais mais agendadas.
- Cancelamentos.
- No-show.

Para MVP final, pode ser simples.

---

## 19. Telas da profissional

### 19.1 ProfessionalAgendaScreen

Objetivo: agenda própria da profissional.

Funcionalidades:

- Ver atendimentos do dia.
- Ver próximos atendimentos.
- Filtrar por data.
- Abrir detalhe do atendimento.

---

### 19.2 ProfessionalAppointmentDetailsScreen

Objetivo: detalhe do atendimento para a profissional.

Informações:

- Cliente.
- Serviços.
- Data.
- Horário.
- Observações.
- Status.

Ações:

- Marcar como concluído.
- Marcar como não compareceu.
- Solicitar reagendamento, futuro.

---

### 19.3 ProfessionalAvailabilityScreen

Objetivo: permitir que a profissional veja sua disponibilidade.

Funcionalidades:

- Ver horários de trabalho.
- Ver pausas.
- Ver bloqueios.
- Solicitar alteração de horário, se não tiver permissão direta.

---

### 19.4 ProfessionalBlockedTimesScreen

Objetivo: permitir que a profissional bloqueie horários próprios, se o gestor permitir.

Campos:

- Data.
- Hora inicial.
- Hora final.
- Motivo.

Regra:

```text
O gestor pode permitir ou bloquear a edição da própria agenda pela profissional.
```

---

## 20. Telas adicionais da cliente necessárias para o MVP final

### 20.1 CustomerAppointmentsScreen

Objetivo: listar agendamentos da cliente.

Filtros:

- Próximos.
- Concluídos.
- Cancelados.

---

### 20.2 CustomerAppointmentDetailsScreen

Objetivo: visualizar detalhes de um agendamento.

Ações:

- Cancelar.
- Reagendar.
- Falar com espaço.
- Adicionar ao calendário.
- Avaliar após conclusão.

---

### 20.3 RescheduleAppointmentScreen

Objetivo: permitir reagendamento.

Regra:

```text
Só pode reagendar se estiver dentro da política configurada pelo espaço.
```

---

### 20.4 CustomerProfileScreen

Objetivo: editar dados pessoais da cliente.

Campos:

- Nome.
- E-mail.
- Telefone.
- Foto.
- Senha.

---

### 20.5 FavoritesScreen

Objetivo: listar espaços favoritos.

---

### 20.6 PaymentHistoryScreen

Objetivo: listar pagamentos realizados pela cliente.

---

### 20.7 ReviewAppointmentScreen

Objetivo: avaliar atendimento após conclusão.

Campos:

- Nota do espaço.
- Nota da profissional.
- Comentário.

---

## 21. Novos modelos de dados necessários para cadastro e gestão dinâmica

### 21.1 SpaceUser

Representa o vínculo entre um usuário e um espaço.

```ts
export type SpaceUserRole = 'space_admin' | 'space_manager' | 'professional';

export type SpaceUser = {
  id: string;
  spaceId: string;
  userId: string;
  role: SpaceUserRole;
  active: boolean;
  createdAt: string;
};
```

---

### 21.2 SpaceSettings

```ts
export type SpaceSettings = {
  id: string;
  spaceId: string;
  bookingLeadTimeMinutes: number;
  bookingMaxDaysAhead: number;
  slotGranularityMinutes: number;
  defaultBufferAfterMinutes: number;
  allowCustomerChooseProfessional: boolean;
  allowAnyProfessional: boolean;
  requireManualApproval: boolean;
  allowOnlineBooking: boolean;
};
```

---

### 21.3 SpacePaymentSettings

```ts
export type SpacePaymentSettings = {
  id: string;
  spaceId: string;
  allowPix: boolean;
  allowCreditCard: boolean;
  allowDebitCard: boolean;
  allowPayOnSite: boolean;
  requirePrePayment: boolean;
  requireDeposit: boolean;
  depositType?: 'fixed' | 'percentage';
  depositValue?: number;
  serviceFeePercentage: number;
  reservationExpirationMinutes: number;
};
```

---

### 21.4 SpaceCancellationPolicy

```ts
export type SpaceCancellationPolicy = {
  id: string;
  spaceId: string;
  allowCustomerCancel: boolean;
  freeCancelBeforeHours: number;
  allowReschedule: boolean;
  freeRescheduleBeforeHours: number;
  chargeLateCancelFee: boolean;
  lateCancelFee?: number;
  policyText: string;
};
```

---

### 21.5 SpacePhoto

```ts
export type SpacePhoto = {
  id: string;
  spaceId: string;
  url: string;
  type: 'cover' | 'gallery' | 'logo';
  order: number;
  active: boolean;
};
```

---

### 21.6 OpeningHour

```ts
export type OpeningHour = {
  id: string;
  spaceId: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime?: string;
  endTime?: string;
};
```

---

### 21.7 ScheduleException

```ts
export type ScheduleException = {
  id: string;
  spaceId: string;
  professionalId?: string;
  date: string;
  type: 'closed' | 'special_hours' | 'holiday' | 'day_off';
  startTime?: string;
  endTime?: string;
  reason?: string;
};
```

---

### 21.8 AuditLog

```ts
export type AuditLog = {
  id: string;
  userId: string;
  spaceId?: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
```

---

## 22. Dados mockados adicionais que devem ser removidos

Além dos mocks já listados, também devem ser removidos futuramente:

### 22.1 Usuário autenticado

Mock atual:

```text
Cliente fixa: Gabriela
Gestor inexistente
Profissional inexistente como usuário real
```

Substituir por:

```text
Auth real com JWT/session
GET /me
```

---

### 22.2 Espaço admin

Mock atual:

```text
Psi Agenda Online criado manualmente no código
```

Substituir por:

```text
Cadastro via CreateSpaceScreen
POST /spaces
POST /spaces/{id}/users
```

---

### 22.3 Configurações do espaço

Mock atual:

```text
Horário fixo: 08:00 - 19:00
Cancelamento fixo: 24h antes
Pagamento fixo: Pix/cartão/local
Reserva fixa: 10 minutos
```

Substituir por:

```text
GET /spaces/{id}/settings
PUT /spaces/{id}/settings
GET /spaces/{id}/payment-settings
PUT /spaces/{id}/payment-settings
GET /spaces/{id}/cancellation-policy
PUT /spaces/{id}/cancellation-policy
```

---

### 22.4 Agenda da profissional

Mock atual:

```text
Horários disponíveis escritos no front
```

Substituir por:

```text
Horário do espaço + horário da profissional + bloqueios + agendamentos + exceções
POST /availability/search
```

---

## 23. Endpoints adicionais para cadastro e configuração pelo app

### 23.1 Autenticação

```http
POST /auth/register/customer
POST /auth/register/space-owner
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password
GET /auth/me
```

---

### 23.2 Criação e vínculo do espaço

```http
POST /spaces
GET /spaces/my
POST /spaces/{spaceId}/users
GET /spaces/{spaceId}/users
PUT /spaces/{spaceId}/users/{userId}
DELETE /spaces/{spaceId}/users/{userId}
```

---

### 23.3 Configurações do espaço

```http
GET /spaces/{spaceId}/settings
PUT /spaces/{spaceId}/settings
GET /spaces/{spaceId}/photos
POST /spaces/{spaceId}/photos
DELETE /spaces/{spaceId}/photos/{photoId}
GET /spaces/{spaceId}/opening-hours
PUT /spaces/{spaceId}/opening-hours
GET /spaces/{spaceId}/payment-settings
PUT /spaces/{spaceId}/payment-settings
GET /spaces/{spaceId}/cancellation-policy
PUT /spaces/{spaceId}/cancellation-policy
GET /spaces/{spaceId}/notification-settings
PUT /spaces/{spaceId}/notification-settings
```

---

### 23.4 Profissionais e convites

```http
POST /spaces/{spaceId}/professionals
PUT /professionals/{professionalId}
POST /spaces/{spaceId}/professionals/invite
POST /professionals/invites/{inviteId}/accept
GET /professionals/{professionalId}/schedule
PUT /professionals/{professionalId}/schedule
GET /professionals/{professionalId}/services
PUT /professionals/{professionalId}/services
```

---

### 23.5 Bloqueios e exceções

```http
GET /spaces/{spaceId}/blocked-times
POST /spaces/{spaceId}/blocked-times
PUT /blocked-times/{blockedTimeId}
DELETE /blocked-times/{blockedTimeId}
GET /spaces/{spaceId}/schedule-exceptions
POST /spaces/{spaceId}/schedule-exceptions
PUT /schedule-exceptions/{exceptionId}
DELETE /schedule-exceptions/{exceptionId}
```

---

## 24. Arquitetura de telas atualizada

```text
src/
  screens/
    auth/
      WelcomeScreen.tsx
      LoginScreen.tsx
      RegisterRoleSelectionScreen.tsx
      CustomerRegisterScreen.tsx
      SpaceOwnerRegisterScreen.tsx
      CreateSpaceScreen.tsx
      OwnerOnboardingChecklistScreen.tsx
      ForgotPasswordScreen.tsx
    customer/
      HomeScreen.tsx
      SpaceDetailsScreen.tsx
      ServiceSelectionScreen.tsx
      ProfessionalSelectionScreen.tsx
      CalendarSelectionScreen.tsx
      AppointmentReviewScreen.tsx
      PaymentScreen.tsx
      BookingSuccessScreen.tsx
      CustomerAppointmentsScreen.tsx
      CustomerAppointmentDetailsScreen.tsx
      RescheduleAppointmentScreen.tsx
      CustomerProfileScreen.tsx
      FavoritesScreen.tsx
      PaymentHistoryScreen.tsx
      ReviewAppointmentScreen.tsx
    owner/
      OwnerDashboardScreen.tsx
      SpaceSettingsScreen.tsx
      SpacePhotosScreen.tsx
      SpaceAddressLocationScreen.tsx
      SpaceContactSocialScreen.tsx
      BusinessStatusScreen.tsx
      ManageServicesScreen.tsx
      CreateEditServiceScreen.tsx
      ServiceCategoriesScreen.tsx
      ServiceProfessionalsScreen.tsx
      ManageProfessionalsScreen.tsx
      CreateEditProfessionalScreen.tsx
      ProfessionalServicesScreen.tsx
      SpaceOpeningHoursScreen.tsx
      ProfessionalScheduleScreen.tsx
      BreaksAndHolidaysScreen.tsx
      BlockedTimesScreen.tsx
      BookingRulesSettingsScreen.tsx
      PaymentSettingsScreen.tsx
      PixSettingsScreen.tsx
      CardGatewaySettingsScreen.tsx
      OnsitePaymentSettingsScreen.tsx
      DepositSettingsScreen.tsx
      CancellationPolicyScreen.tsx
      NotificationSettingsScreen.tsx
      AppointmentsManagementScreen.tsx
      AppointmentDetailsOwnerScreen.tsx
      OwnerAgendaScreen.tsx
      CustomerManagementScreen.tsx
      ReviewsManagementScreen.tsx
      ReportsDashboardScreen.tsx
    professional/
      ProfessionalAgendaScreen.tsx
      ProfessionalAppointmentDetailsScreen.tsx
      ProfessionalAvailabilityScreen.tsx
      ProfessionalBlockedTimesScreen.tsx
```

---

## 25. Fases atualizadas do projeto até o MVP final com backend e PostgreSQL

Estas são as fases definitivas considerando a decisão de arquitetura: **React Native + ASP.NET Core Web API + PostgreSQL + Redis + pagamento Pix via Mercado Pago no MVP**.

### Fase 1 — Protótipo visual navegável com mocks

Objetivo:

Criar o fluxo visual completo da cliente com as 8 telas principais usando dados mockados.

Entregas:

- Setup React Native com Expo e TypeScript.
- Navegação entre telas.
- 8 telas do fluxo da cliente.
- Componentes reutilizáveis.
- Dados mockados separados por domínio.
- Estilo visual consistente.

Critério de aceite:

```text
A cliente consegue simular um agendamento completo da Home até a tela de sucesso.
```

---

### Fase 2 — Estado compartilhado, autenticação visual e fluxo dinâmico local

Objetivo:

Criar a estrutura de estado e iniciar a separação por perfis, ainda com mocks.

Entregas:

- AuthContext mockado.
- BookingContext.
- OwnerConfigContext local/mockado.
- LoginScreen mockada.
- RegisterRoleSelectionScreen.
- CustomerRegisterScreen mockada.
- SpaceOwnerRegisterScreen mockada.
- CreateSpaceScreen mockada.
- OwnerOnboardingChecklistScreen mockada.
- Fluxo cliente usando dados do contexto.
- Seleção real local de serviços, profissional, data e pagamento.
- Painel do gestor funcional localmente com dados temporários.

Critério de aceite:

```text
O app diferencia cliente e gestor visualmente, e o fluxo da cliente usa estado compartilhado sem dados duplicados fixos nas telas.
```

---

### Fase 3 — Backend base, PostgreSQL e cadastro real de usuários/espaços

Objetivo:

Criar a API real, banco de dados e autenticação para sustentar o cadastro de usuários e espaços.

Entregas backend:

- Projeto ASP.NET Core Web API em .NET 10.
- PostgreSQL configurado.
- Entity Framework Core configurado.
- Migrations iniciais.
- Docker Compose para API + PostgreSQL.
- Cadastro real de cliente.
- Cadastro real de gestor.
- Login real.
- JWT + Refresh Token.
- Roles: customer, space_admin, professional, super_admin.
- Criação real de espaço.
- Criação automática/vínculo do usuário `space_admin`.
- Endpoint para checklist inicial do gestor.
- Validação de ownership do espaço.

Entregas app:

- Login integrado com API.
- Cadastro de cliente integrado.
- Cadastro de gestor integrado.
- Criação de espaço integrada.
- Painel do gestor lendo dados reais.
- Armazenamento seguro de token.

Critério de aceite:

```text
Um gestor cria conta, cria o espaço pelo app e acessa o painel como administrador real desse espaço.
```

---

### Fase 4 — Configurações reais do gestor, agenda inteligente e reserva temporária

Objetivo:

Permitir que o gestor configure o app dinamicamente pelo próprio aplicativo e que a cliente agende usando disponibilidade real.

Entregas backend:

- CRUD real de serviços.
- CRUD real de profissionais.
- Vínculo profissional-serviço.
- Configuração de categorias.
- Configuração de fotos do espaço.
- Configuração de horários do espaço.
- Configuração de agenda individual da profissional.
- Configuração de pausas, almoço, folgas e exceções.
- Bloqueios manuais.
- Política de cancelamento.
- Regras de pagamento.
- Busca real de disponibilidade.
- Validação de conflito de agenda.
- Reserva temporária com expiração.
- Worker Service para expirar reservas.
- Transações no banco para criar/confirmar agendamento.

Entregas app gestor:

- OwnerDashboardScreen.
- SpaceSettingsScreen.
- SpacePhotosScreen.
- SpaceAddressLocationScreen.
- ManageServicesScreen.
- CreateEditServiceScreen.
- ManageProfessionalsScreen.
- CreateEditProfessionalScreen.
- ProfessionalServicesScreen.
- SpaceOpeningHoursScreen.
- ProfessionalScheduleScreen.
- BlockedTimesScreen.
- BookingRulesSettingsScreen.
- PaymentSettingsScreen.
- CancellationPolicyScreen.
- OwnerAgendaScreen.
- AppointmentsManagementScreen.

Entregas app cliente:

- Home com espaços reais.
- Detalhe do espaço com dados reais.
- Serviços reais.
- Profissionais reais compatíveis.
- Calendário com disponibilidade real.
- Reserva temporária antes do pagamento.

Critério de aceite:

```text
Dados cadastrados pelo gestor no app são salvos no PostgreSQL via API e aparecem para clientes. O sistema calcula horários disponíveis com base em dados reais e impede conflito.
```

---

### Fase 5 — MVP final pronto para produção

Objetivo:

Finalizar o produto para uso real por um espaço de beleza, com pagamento, segurança, logs, notificações e publicação.

Entregas app cliente:

- Login/cadastro real.
- Perfil da cliente.
- Busca de espaços reais.
- Fluxo completo de agendamento.
- Meus agendamentos.
- Detalhe do agendamento.
- Cancelamento conforme política.
- Reagendamento conforme política.
- Favoritos.
- Histórico de pagamentos.
- Avaliação de atendimento.

Entregas app gestor:

- Dashboard operacional.
- Cadastro e edição do espaço.
- Gestão de fotos.
- Gestão de serviços.
- Gestão de categorias.
- Gestão de profissionais.
- Gestão de vínculos profissional-serviço.
- Configuração de funcionamento.
- Configuração de agenda por profissional.
- Bloqueios e exceções.
- Configuração de pagamentos.
- Configuração de sinal/entrada.
- Configuração de cancelamento.
- Configuração de notificações.
- Agenda diária/semanal.
- Gestão de agendamentos.
- Detalhe do agendamento.
- Marcar concluído/não compareceu.

Entregas app profissional:

- Agenda própria.
- Detalhe do atendimento.
- Bloqueio próprio, se permitido.
- Marcar atendimento como concluído.
- Marcar não comparecimento.

Entregas backend/produto:

- Pagamento no local configurável.
- Pix online via Mercado Pago.
- Webhook de pagamento.
- Reserva temporária com expiração.
- Notificações básicas.
- Logs e auditoria.
- Tratamento de erros.
- Loading states.
- Empty states.
- Permissões por perfil.
- Validação de ownership.
- Rate limit.
- Validação de webhooks.
- Backup básico do PostgreSQL.
- Monitoramento básico.
- Política de privacidade.
- Termos de uso.
- Adequação LGPD básica.
- Build Android.
- Build iOS.

Critério de aceite final:

```text
Um gestor consegue criar uma conta, cadastrar seu espaço, configurar serviços, profissionais, horários, pagamentos e cancelamentos pelo próprio app. Uma cliente consegue encontrar esse espaço, agendar um atendimento real, pagar ou reservar conforme regra configurada e receber a confirmação sem conflito de agenda.
```

---

## 25.1 Endpoints principais da API robusta

### Autenticação

```http
POST /auth/register-customer
POST /auth/register-space-admin
POST /auth/login
POST /auth/refresh-token
POST /auth/logout
GET  /auth/me
```

### Espaços

```http
GET  /spaces
GET  /spaces/{id}
POST /spaces
PUT  /spaces/{id}
POST /spaces/{id}/publish
POST /spaces/{id}/unpublish
GET  /spaces/{id}/onboarding-checklist
```

### Administração do espaço

```http
GET  /admin/spaces/{spaceId}/dashboard
PUT  /admin/spaces/{spaceId}/settings
PUT  /admin/spaces/{spaceId}/address
POST /admin/spaces/{spaceId}/photos
DELETE /admin/spaces/{spaceId}/photos/{photoId}
```

### Serviços

```http
GET  /admin/spaces/{spaceId}/services
POST /admin/spaces/{spaceId}/services
PUT  /admin/spaces/{spaceId}/services/{serviceId}
DELETE /admin/spaces/{spaceId}/services/{serviceId}
POST /admin/spaces/{spaceId}/services/{serviceId}/activate
POST /admin/spaces/{spaceId}/services/{serviceId}/deactivate
```

### Profissionais

```http
GET  /admin/spaces/{spaceId}/professionals
POST /admin/spaces/{spaceId}/professionals
PUT  /admin/spaces/{spaceId}/professionals/{professionalId}
DELETE /admin/spaces/{spaceId}/professionals/{professionalId}
PUT  /admin/spaces/{spaceId}/professionals/{professionalId}/services
```

### Horários, agenda e bloqueios

```http
GET  /admin/spaces/{spaceId}/opening-hours
PUT  /admin/spaces/{spaceId}/opening-hours
GET  /admin/spaces/{spaceId}/professionals/{professionalId}/schedule
PUT  /admin/spaces/{spaceId}/professionals/{professionalId}/schedule
GET  /admin/spaces/{spaceId}/blocked-times
POST /admin/spaces/{spaceId}/blocked-times
DELETE /admin/spaces/{spaceId}/blocked-times/{blockedTimeId}
```

### Disponibilidade e agendamento

```http
POST /availability/search
POST /appointments/reserve
POST /appointments/confirm
POST /appointments/{id}/cancel
POST /appointments/{id}/reschedule
GET  /customers/me/appointments
GET  /admin/spaces/{spaceId}/appointments
GET  /professionals/me/appointments
```

### Pagamentos

```http
POST /payments/create
POST /payments/webhook/mercado-pago
GET  /payments/{id}
POST /payments/{id}/refund
```

### Configurações do gestor

```http
GET /admin/spaces/{spaceId}/payment-settings
PUT /admin/spaces/{spaceId}/payment-settings
GET /admin/spaces/{spaceId}/cancellation-policy
PUT /admin/spaces/{spaceId}/cancellation-policy
GET /admin/spaces/{spaceId}/notification-settings
PUT /admin/spaces/{spaceId}/notification-settings
```

---

## 26. Ordem recomendada de implementação das telas administrativas

Para não travar o projeto, a ordem recomendada é:

```text
1. LoginScreen
2. RegisterRoleSelectionScreen
3. SpaceOwnerRegisterScreen
4. CreateSpaceScreen
5. OwnerOnboardingChecklistScreen
6. OwnerDashboardScreen
7. SpaceSettingsScreen
8. ManageServicesScreen
9. CreateEditServiceScreen
10. ManageProfessionalsScreen
11. CreateEditProfessionalScreen
12. ProfessionalServicesScreen
13. SpaceOpeningHoursScreen
14. ProfessionalScheduleScreen
15. BlockedTimesScreen
16. BookingRulesSettingsScreen
17. PaymentSettingsScreen
18. CancellationPolicyScreen
19. OwnerAgendaScreen
20. AppointmentsManagementScreen
```

Essa ordem cria primeiro a base necessária para o app cliente deixar de depender de mocks.
