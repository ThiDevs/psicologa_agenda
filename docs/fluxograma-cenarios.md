# Fluxograma dos cenários possíveis

Atualizado em 2026-06-21.

Este documento resume os caminhos possíveis do sistema atual em Mermaid. Ele complementa `docs/fluxo-sistema-atual.md`.

## 1. Entrada no app

```mermaid
flowchart TD
  Start["Usuário abre o app"] --> Hydrate["AuthProvider hidrata sessão"]
  Hydrate --> Session{"Sessão válida?"}

  Session -- "Não" --> Platform{"Plataforma web?"}
  Platform -- "Sim" --> Landing["LandingScreen"]
  Platform -- "Não" --> HomeGuest["HomeScreen visitante"]

  Session -- "Sim" --> Role{"Papel / perfil"}
  Role -- "space_admin ou space_manager" --> OwnerDashboard["Painel da psicóloga"]
  Role -- "professional" --> ProfessionalAgenda["Agenda profissional"]
  Role -- "cliente" --> CustomerHome["HomeScreen autenticado"]
  Role -- "perfil de atendimento ativo" --> OwnerSpace{"Consultório selecionado?"}
  OwnerSpace -- "Sim" --> OwnerDashboard
  OwnerSpace -- "Não" --> LoadSpaces["Busca /spaces/my"]
  LoadSpaces --> HasOwnerSpace{"Encontrou consultório?"}
  HasOwnerSpace -- "Sim" --> OwnerDashboard
  HasOwnerSpace -- "Não" --> CustomerHome
```

## 2. Cadastro, login e sessão expirada

```mermaid
flowchart TD
  Guest["Visitante"] --> ChooseAuth{"Ação"}
  ChooseAuth -- "Entrar" --> Login["/login"]
  ChooseAuth -- "Criar conta" --> RoleSelection["/register-role-selection"]

  Login --> LoginApi["POST /api/auth/login"]
  LoginApi --> LoginOk{"Login OK?"}
  LoginOk -- "Sim" --> SaveTokens["Salva access + refresh token"]
  LoginOk -- "Não" --> LoginError["Mostra erro"]

  RoleSelection --> Role{"Perfil escolhido"}
  Role -- "Cliente" --> CustomerRegister["/customer-register"]
  Role -- "Psicóloga dona/admin" --> OwnerRegister["/space-owner-register"]
  Role -- "Profissional vinculada" --> ProfessionalRegister["/professional-register"]

  CustomerRegister --> RegisterCustomer["POST /api/auth/register/customer"]
  OwnerRegister --> RegisterOwner["POST /api/auth/register/space-admin"]
  ProfessionalRegister --> RegisterProfessional["POST /api/auth/register/professional"]

  RegisterCustomer --> RegisterOk{"Cadastro OK?"}
  RegisterOwner --> RegisterOk
  RegisterProfessional --> RegisterOk
  RegisterOk -- "Não" --> RegisterError["Mostra erro"]
  RegisterOk -- "Sim" --> SaveTokens

  SaveTokens --> NextRoute{"Próxima rota"}
  NextRoute -- "Cliente" --> Home["/"]
  NextRoute -- "Psicóloga dona/admin" --> CreateSpace["/create-space"]
  NextRoute -- "Profissional" --> Home

  ApiCall["Chamada autenticada"] --> Unauthorized{"401?"}
  Unauthorized -- "Não" --> ApiResult["Segue fluxo"]
  Unauthorized -- "Sim" --> Refresh["POST /api/auth/refresh-token"]
  Refresh --> RefreshOk{"Refresh OK?"}
  RefreshOk -- "Sim" --> Retry["Repete chamada original"]
  RefreshOk -- "Não" --> Expire["Limpa sessão e avisa expiração"]
```

## 3. Fluxo de agendamento da cliente

```mermaid
flowchart TD
  Catalog["Home / catálogo"] --> PublicApi["GET /api/public/spaces"]
  PublicApi --> CatalogOk{"Catálogo carregou?"}
  CatalogOk -- "Não" --> LocalCatalog["Mostra erro e usa dados locais se existirem"]
  CatalogOk -- "Sim" --> SpaceList["Lista consultórios publicados"]
  LocalCatalog --> SpaceList

  SpaceList --> OpenSpace["Cliente abre consultório"]
  OpenSpace --> DetailsApi["GET /api/public/spaces/{spaceId}"]
  DetailsApi --> DetailsOk{"Detalhes carregaram?"}
  DetailsOk -- "Não" --> DetailsFallback["Mostra detalhes locais disponíveis"]
  DetailsOk -- "Sim" --> SpaceDetails["Detalhe do consultório"]
  DetailsFallback --> SpaceDetails

  SpaceDetails --> Schedule["Agendar agora"]
  Schedule --> Services["Selecionar consultas"]
  Services --> HasServices{"Tem consulta selecionada?"}
  HasServices -- "Não" --> Services
  HasServices -- "Sim" --> Professionals["Selecionar psicóloga"]

  Professionals --> Compatible{"Existe psicóloga compatível?"}
  Compatible -- "Não" --> NoProfessional["Ajustar consultas ou configurar vínculos"]
  Compatible -- "Sim" --> ChooseProfessional{"Escolha"}
  ChooseProfessional -- "Profissional específica" --> Calendar["Selecionar data e horário"]
  ChooseProfessional -- "Qualquer profissional" --> Calendar

  Calendar --> AvailabilityApi["POST /api/availability/search"]
  AvailabilityApi --> AvailabilityOk{"API retornou horários?"}
  AvailabilityOk -- "Não" --> LocalAvailability["Calcula disponibilidade local"]
  LocalAvailability --> HasLocalSlots{"Há horários locais?"}
  HasLocalSlots -- "Não" --> NoSlots["Escolher outra data/profissional/consulta"]
  HasLocalSlots -- "Sim" --> PickSlot["Escolher horário"]
  AvailabilityOk -- "Sim" --> PickSlot

  PickSlot --> Review["Revisar agendamento"]
  Review --> Payment["Escolher forma combinada"]
  Payment --> Auth{"Cliente autenticada?"}
  Auth -- "Não" --> LoginOrRegister["Entrar ou criar conta"]
  LoginOrRegister --> Payment
  Auth -- "Sim" --> ReserveApi["POST /api/appointments/reserve"]

  ReserveApi --> ReserveOk{"Reserva na API OK?"}
  ReserveOk -- "Não" --> LocalReserve["Tenta reserva local de demonstração"]
  LocalReserve --> LocalReserveOk{"Reserva local OK?"}
  LocalReserveOk -- "Não" --> ReserveError["Mostra erro"]
  LocalReserveOk -- "Sim" --> Success["Tela de sucesso"]
  ReserveOk -- "Sim" --> InitialStatus{"Status inicial"}

  InitialStatus -- "Pagamento online" --> PendingPayment["reserved na API / pending_payment no app"]
  InitialStatus -- "Pagamento no atendimento + aceite manual" --> PendingConfirmation["pending_confirmation"]
  InitialStatus -- "Pagamento no atendimento + automático" --> Confirmed["confirmed + sala online"]

  PendingPayment --> Success
  PendingConfirmation --> Success
  Confirmed --> Success
```

## 4. Cenários depois do agendamento

```mermaid
flowchart TD
  Appointment["Cliente abre detalhe do agendamento"] --> Details["GET /api/customers/me/appointments/{id}"]
  Details --> Status{"Status atual"}

  Status -- "confirmed" --> ConfirmedActions["Entrar na sala / reagendar / cancelar"]
  Status -- "pending_confirmation" --> WaitingActions["Reagendar / cancelar / aguardar aceite"]
  Status -- "reserved" --> ReservedActions["Hoje pode aparecer como Reservado no detalhe"]
  Status -- "completed" --> Review{"Já avaliou?"}
  Status -- "cancelled / expired / no_show / rejected" --> Closed["Apenas consulta do histórico"]

  ConfirmedActions --> CustomerChange{"Cliente altera?"}
  WaitingActions --> CustomerChange
  CustomerChange -- "Cancelar" --> CancelApi["POST /api/customers/me/appointments/{id}/cancel"]
  CustomerChange -- "Reagendar" --> RescheduleApi["POST /api/customers/me/appointments/{id}/reschedule"]
  CustomerChange -- "Não" --> Details

  CancelApi --> CancelRules{"Política permite e não é passado/fechado?"}
  CancelRules -- "Sim" --> Cancelled["cancelled + notificações"]
  CancelRules -- "Não" --> ChangeError["Mostra erro"]

  RescheduleApi --> RescheduleRules{"Política permite e novo horário livre?"}
  RescheduleRules -- "Sim" --> Rescheduled["Atualiza data/profissional + notificações"]
  RescheduleRules -- "Não" --> ChangeError

  Review -- "Não" --> ReviewApi["POST /api/customers/me/appointments/{id}/review"]
  Review -- "Sim" --> ReviewDone["Mostra avaliação enviada"]
  ReviewApi --> ReviewOk{"Nota válida e ainda sem avaliação?"}
  ReviewOk -- "Sim" --> ReviewCreated["Avaliação salva + notifica dona/admin"]
  ReviewOk -- "Não" --> ChangeError
```

## 5. Onboarding e publicação da psicóloga dona/admin

```mermaid
flowchart TD
  OwnerAccount["Conta space_admin"] --> CreateSpace["/create-space"]
  CreateSpace --> Cep{"CEP informado?"}
  Cep -- "Sim" --> ViaCep["Busca ViaCEP e preenche endereço"]
  Cep -- "Não" --> ManualAddress["Endereço manual"]
  ViaCep --> Location
  ManualAddress --> Location{"Usar localização atual?"}
  Location -- "Sim" --> ExpoLocation["expo-location salva coordenadas"]
  Location -- "Não" --> SubmitSpace
  ExpoLocation --> SubmitSpace["POST /api/spaces"]

  SubmitSpace --> SpaceOk{"Consultório criado?"}
  SpaceOk -- "Não" --> SpaceError["Mostra erro"]
  SpaceOk -- "Sim" --> Checklist["Checklist inicial"]

  Checklist --> Complete{"Checklist completo?"}
  Complete -- "Não" --> NextItem{"Próximo item faltante"}
  NextItem -- "Serviços" --> Services["/manage-services"]
  NextItem -- "Profissionais/vínculos" --> Professionals["/manage-professionals"]
  NextItem -- "Funcionamento" --> OpeningHours["/space-opening-hours"]
  NextItem -- "Agenda profissional" --> ProfessionalSchedule["/professional-schedule"]
  NextItem -- "Pagamento" --> PaymentSettings["/payment-settings"]
  NextItem -- "Cancelamento" --> CancellationPolicy["/cancellation-policy"]
  NextItem -- "Dados básicos" --> CreateSpace

  Services --> Checklist
  Professionals --> Checklist
  OpeningHours --> Checklist
  ProfessionalSchedule --> Checklist
  PaymentSettings --> Checklist
  CancellationPolicy --> Checklist

  Complete -- "Sim" --> StarterSetup["POST /api/spaces/{spaceId}/starter-setup"]
  StarterSetup --> PublishOk{"Publicação OK?"}
  PublishOk -- "Não" --> PublishError["Mostra erro e continua no checklist"]
  PublishOk -- "Sim" --> Published["published + onboardingCompleted"]
  Published --> ActivateProfile["Ativa perfil de atendimento"]
  ActivateProfile --> OwnerDashboard["Painel da psicóloga"]
```

## 6. Gestão do consultório e agenda da dona/admin

```mermaid
flowchart TD
  OwnerDashboard["Painel da psicóloga"] --> Shortcut{"Atalho"}
  Shortcut -- "Consultas" --> ManageServices["Criar/editar consultas"]
  Shortcut -- "Psicólogas" --> ManageProfessionals["Criar/editar psicólogas e vínculos"]
  Shortcut -- "Agenda" --> OwnerAgenda["Agenda do consultório"]
  Shortcut -- "Configurações" --> BookingSettings["Aceitar agendamentos / aceite manual"]
  Shortcut -- "Fotos" --> Photos["Galeria pública"]
  Shortcut -- "Notificações" --> Notifications["Regras de notificação"]
  Shortcut -- "Bloqueios" --> Blocks["Bloqueios manuais"]

  ManageServices --> SyncPublication["Backend reavalia checklist/publicação"]
  ManageProfessionals --> SyncPublication
  BookingSettings --> OwnerDashboard
  Photos --> OwnerDashboard
  Notifications --> OwnerDashboard
  Blocks --> OwnerAgenda

  SyncPublication --> PublishedState{"Checklist completo?"}
  PublishedState -- "Sim" --> Published["Consultório publicado"]
  PublishedState -- "Não" --> Draft["Consultório rascunho/despublicado"]
  Published --> OwnerDashboard
  Draft --> OwnerDashboard

  OwnerAgenda --> AppointmentStatus{"Pedido na agenda"}
  AppointmentStatus -- "pending_confirmation" --> Decision{"Decisão"}
  Decision -- "Aceitar" --> ConfirmApi["POST confirm"]
  Decision -- "Recusar" --> RejectApi["POST reject + motivo"]
  AppointmentStatus -- "confirmed ou reserved" --> CloseAction{"Encerrar?"}
  CloseAction -- "Concluir" --> CompleteApi["POST complete"]
  CloseAction -- "Falta" --> NoShowApi["POST no-show"]
  CloseAction -- "Não" --> OwnerAgenda

  ConfirmApi --> Confirmed["confirmed + sala online + notificações"]
  RejectApi --> Rejected["rejected + motivo + notificação"]
  CompleteApi --> Completed["completed + notificação"]
  NoShowApi --> NoShow["no_show + notificação"]
```

## 7. Profissional vinculada por e-mail

```mermaid
flowchart TD
  ProfessionalUser["Usuária professional ou perfil de atendimento"] --> ProfessionalAgenda["/professional-agenda"]
  ProfessionalAgenda --> LinkCheck["Backend procura Professional.Email == User.Email"]
  LinkCheck --> Linked{"Profissional ativa encontrada?"}
  Linked -- "Não" --> LinkError["Mostra erro: e-mail ainda não vinculado"]
  Linked -- "Sim" --> LoadAppointments["GET /api/professionals/me/appointments"]

  LoadAppointments --> DayList["Lista atendimentos do dia"]
  DayList --> Appointment{"Status do atendimento"}
  Appointment -- "pending_confirmation" --> WaitOwner["Aguardar aceite da dona/admin"]
  Appointment -- "confirmed" --> ProfessionalActions["Entrar na sala / concluir / falta"]
  Appointment -- "reserved" --> ProfessionalActions
  Appointment -- "cancelled / expired / completed / no_show / rejected" --> ReadOnly["Somente histórico"]

  ProfessionalActions --> Action{"Ação"}
  Action -- "Entrar na sala" --> Room["Abre onlineRoomUrl"]
  Action -- "Concluir" --> Complete["POST /api/professionals/me/appointments/{id}/complete"]
  Action -- "Falta" --> NoShow["POST /api/professionals/me/appointments/{id}/no-show"]

  ProfessionalAgenda --> Block["Criar bloqueio"]
  Block --> BlockApi["POST /api/professionals/me/blocked-times"]
  BlockApi --> Availability["Novo bloqueio passa a afetar disponibilidade"]
```

## 8. Estados do agendamento

```mermaid
stateDiagram-v2
  [*] --> reserved: pix/cartão/débito combinado
  [*] --> pending_confirmation: pay_on_site + aceite manual
  [*] --> confirmed: pay_on_site + automático

  reserved --> expired: worker após expiresAt
  reserved --> cancelled: cliente cancela

  pending_confirmation --> confirmed: dona/admin aceita
  pending_confirmation --> rejected: dona/admin recusa com motivo
  pending_confirmation --> cancelled: cliente cancela

  confirmed --> cancelled: cliente cancela
  confirmed --> completed: dona/admin ou profissional conclui
  confirmed --> no_show: dona/admin ou profissional registra falta
  reserved --> reserved: cliente reagenda
  pending_confirmation --> pending_confirmation: cliente reagenda
  confirmed --> confirmed: cliente reagenda

  completed --> completed: cliente avalia e cria review

  expired --> [*]
  cancelled --> [*]
  rejected --> [*]
  no_show --> [*]
  completed --> [*]
```

## Cenários de erro mais comuns

```mermaid
flowchart TD
  Operation["Operação do app"] --> Api{"API responde?"}
  Api -- "Não" --> Offline["Mostra mensagem de indisponibilidade"]
  Offline --> Fallback{"Existe fallback local?"}
  Fallback -- "Sim" --> LocalFlow["Usa catálogo/disponibilidade/reserva local"]
  Fallback -- "Não" --> Stop["Fluxo para na tela com erro"]

  Api -- "Sim" --> Auth{"401?"}
  Auth -- "Sim" --> Refresh["Tenta refresh token"]
  Refresh --> RefreshOk{"Refresh OK?"}
  RefreshOk -- "Sim" --> Retry["Repete operação"]
  RefreshOk -- "Não" --> Logout["Limpa sessão e pede login"]

  Auth -- "Não" --> Permission{"403?"}
  Permission -- "Sim" --> Forbidden["Mostra falta de permissão"]
  Permission -- "Não" --> Rule{"400/404 regra de negócio?"}
  Rule -- "Sim" --> BusinessError["Mostra mensagem da API"]
  Rule -- "Não" --> Success["Segue fluxo normal"]
```
