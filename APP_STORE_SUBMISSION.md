# App Store Submission

Checklist para enviar o Psi Agenda Online para TestFlight e App Store.

## Antes do build

- Confirmar que `https://felicio.app/api/health` responde `200`.
- Confirmar que `.env.prod` no servidor usa senha forte de PostgreSQL e `Jwt__SigningKey` forte.
- Criar uma conta demo permanente para App Review:
  - cliente com agendamento visivel;
  - psicologa/administradora com consultorio publicado.
- Apos o deploy do backend, confirmar as URLs web publicas:
  - `https://felicio.app/privacy`
  - `https://felicio.app/terms`
  - `https://felicio.app/support`

## App Store Connect

- Criar o app com o bundle id `com.thidevs.psiagendaonline`.
- Preencher Privacy Policy URL com `https://felicio.app/privacy`.
- Preencher Support URL com `https://felicio.app/support`.
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
