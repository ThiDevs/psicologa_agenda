import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

const SITE_URL = 'https://psi.felicio.app';
const SITE_NAME = 'Psi Agenda Online';
const SITE_DESCRIPTION =
  'Agenda online para psicólogas e pacientes organizarem consultas, horários e cuidado clínico em um só lugar.';
const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

export default function Html({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#FAF8F5" />
        <meta name="description" content={SITE_DESCRIPTION} />

        <title>{SITE_NAME}</title>
        <link rel="canonical" href={SITE_URL} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/og-image.png" />

        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={SITE_NAME} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE_URL} />
        <meta property="og:image:secure_url" content={OG_IMAGE_URL} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Consultório online iluminado com notebook aberto para teleconsulta." />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_NAME} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE_URL} />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
