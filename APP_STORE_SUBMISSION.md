# App Store Submission

Checklist para enviar o Psi Agenda Online para TestFlight e App Store.

## Antes do build

- Confirmar que `https://felicio.app/api/health` responde `200`.
- Confirmar que `.env.prod` no servidor usa senha forte de PostgreSQL e `Jwt__SigningKey` forte.
- Criar uma conta demo permanente para App Review:
  - cliente com agendamento visivel;
  - psicologa/administradora com consultorio publicado.
- Apos o deploy do backend, confirmar as URLs web publicas. O App Store Connect pode usar as URLs `/api/...` enquanto o proxy do dominio nao encaminhar as rotas raiz para o backend:
  - `https://felicio.app/privacy`
  - `https://felicio.app/terms`
  - `https://felicio.app/support`
  - `https://felicio.app/api/privacy`
  - `https://felicio.app/api/terms`
  - `https://felicio.app/api/support`

## App Store Connect

- Nome na loja: `Psi Agenda Online`.
- App criado no App Store Connect com App ID `6782610386`.
- Bundle ID iOS: `com.thidevs.psiagenda`.
- SKU: `psi-agenda-ios`.
- Idioma principal: `Portuguese (Brazil)`.
- Status em 2026-06-21:
  - contrato atualizado do Apple Developer Program aceito;
  - Bundle ID `com.thidevs.psiagenda` registrado em Certificates, Identifiers & Profiles;
  - app `Psi Agenda Online` criado no App Store Connect;
  - o aviso de trader status ainda apareceu na tela de Apps e precisa ser validado pelo Account Holder antes do envio para revisao, caso continue visivel.
- Privacy Policy URL configurada no App Store Connect: `https://felicio.app/api/privacy` (HTTP 200 em 2026-06-21).
- Support URL configurada na versao iOS 1.0: `https://felicio.app/api/support` (HTTP 200 em 2026-06-21).
- Terms URL publica disponivel em `https://felicio.app/api/terms` (HTTP 200 em 2026-06-21).
- Declarar App Privacy de forma consistente com o app:
  - nome;
  - e-mail;
  - telefone;
  - localizacao quando solicitada;
  - fotos/videos enviados pela administradora;
  - informacoes sensiveis/de saude relacionadas a consultas;
  - identificadores de conta;
  - historico de agendamentos e pagamentos combinados.
- Informar que os dados nao sao usados para tracking.
- Preencher contato de review, conta demo e notas explicando:
  - pagamentos sao combinados fora do app para consulta pessoa-a-pessoa em tempo real;
  - o app nao processa cartao, Pix ou assinatura;
  - a exclusao de conta fica no Perfil.
- Enviar de 1 a 10 screenshots iPhone mostrando app em uso, nao so login/splash.

## Comandos

```bash
npm run verify
npm run backend:build
npx expo-doctor
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --latest
```

Use TestFlight antes da revisao final da App Store.

## EAS Update

- Projeto Expo: `@thidevs/psi-agenda`.
- Project ID: `d2421580-1638-4f2d-aa3f-15d6f2b2a661`.
- `expo-updates` instalado e `updates.url` configurado para `https://u.expo.dev/d2421580-1638-4f2d-aa3f-15d6f2b2a661`.
- `runtimeVersion` usa a politica `appVersion`, entao updates OTA so sao aplicados em builds com a mesma versao do app.
- Channels remotos criados:
  - `production` ligado a branch `production`;
  - `preview` ligado a branch `preview`.

Publicar OTA depois de existir um build instalado no mesmo channel:

```bash
npx eas-cli@latest update --channel production --message "Atualizacao inicial"
```
