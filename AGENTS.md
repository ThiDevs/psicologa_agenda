# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing any code.

# Production domain routing

Current Cloudflare Tunnel routes:

- `https://felicio.app/api` routes to the backend API at `http://localhost:3001`.
- `https://felicio.app` routes to the Expo web app at `http://localhost:8081`.

The app must treat `/api` as part of the API root. In production, use
`EXPO_PUBLIC_API_URL=https://felicio.app/api` or the built-in default API base.
Do not send API requests to root paths such as `https://felicio.app/auth/...`,
because those hit the Expo web route instead of the backend.

# Web and mobile visual design standard

All web and mobile screens must follow the current patient home visual language. The target is a
mature, discreet, professional psychology product, not a generic SaaS dashboard or prototype.

Use the patient web home in `src/screens/HomeScreen.tsx` as the source of truth for spacing,
hierarchy, density, colors, typography, cards, navigation, lists, and controls. New or refactored
web and mobile screens should feel like they belong to the same product family.

Mobile screens must follow the same design rules as web, adapted to native mobile constraints:
compact typography, quiet colors, subtle borders, low visual noise, list-first organization,
clear primary actions, and clinical workflow hierarchy. Do not create a separate mobile visual
language with oversized cards, heavy shadows, saturated blocks, or generic app-dashboard styling.

## Typography

- Use `Source Sans 3` on web, with fallbacks to `ui-sans-serif`, `system-ui`, and `sans-serif`.
- Use only font weights `400`, `500`, and `600` on web screens.
- Do not use `700`, `800`, or `900` for the refined web experience.
- Greeting or page title: `24px`, weight `600`, line-height near `1.2`.
- Page subtitle: `14px`, weight `400`.
- Main card titles: `17px`, weight `600`.
- Internal titles, names, and list item titles: `14px` to `15px`, weight `600`.
- Menu, button, tab, and common control text: `14px`, weight `500` or `600` only for emphasis.
- Auxiliary text, descriptions, metadata, dates, and status notes: `12.5px` or `13px`, weight `400`.
- Uppercase labels: `11px`, weight `600`, letter spacing around `0.06em`.
- Important appointment time: `28px`, weight `600`.
- Do not make auxiliary, secondary, status, or explanatory text bold.

## Scale And Density

- Keep the web UI approximately 15% more compact than the earlier large dashboard style.
- Primary and secondary buttons should usually be `38px` to `40px` tall.
- Search fields and segmented mode controls should be around `40px` tall.
- Sidebar items should be about `42px` tall with `18px` icons.
- Use compact card padding, usually `14px` to `16px`.
- Keep related elements close together and avoid large promotional spacing.
- Text must fit its containers on desktop and responsive layouts without overlap.

## Hierarchy

For the patient home and similar patient-facing workflow screens, prioritize content in this order:

1. Next session or the primary clinical action.
2. Open tasks.
3. Emotional check-in.
4. Session preparation.
5. Care timeline.

Discovery features such as "Encontrar psicóloga", metrics, favorites, professional counts, and
catalog filters should remain available, but they are secondary. Do not make them visually compete
with the care workflow.

## Layout And Containers

- Use a calm app shell with a compact sidebar and a main content area.
- Prefer neutral warm white or very light grey surfaces.
- Use cards only when a group truly needs a frame.
- Avoid cards inside cards. Inside cards, prefer simple rows, lists, and dividers.
- Card radius should stay between `6px` and `8px`.
- Avoid strong shadows. Use subtle borders and, at most, very soft shadows.
- Use dividers for lists such as preparation items, tasks, notices, and compact actions.
- Keep the interface quiet and clinical, not promotional.

## Sidebar

- Sidebar should be light, compact, and secondary to the content.
- Keep logo presence modest.
- Nav item height should be around `42px`.
- Nav text should be `14px`, weight `500`.
- Active item should use a soft blue background or subtle side indicator.
- Do not use a saturated filled block for the active item.

## Colors

- Primary blue remains the main brand/action color.
- Use saturated blue only for the primary action, selected states, links, and the current care step.
- The dominant palette should be warm white, very light grey, navy-black text, blue-grey secondary
  text, and neutral borders.
- Use semantic green, orange, and red only for statuses, feedback, and alerts.
- Avoid one-note saturated palettes, decorative gradients, or loud dashboard colors.

## Components

- The next-session card is the main focus but must stay clean and compact.
- The only primary CTA in the session card should be the main action, such as "Entrar na consulta".
- Secondary session actions such as "Remarcar" and "Preparar sessão" should be quieter outline/text
  actions.
- Preparation should be a compact list with a small icon, title, description, checkbox, and dividers.
- Emotional check-in should be compact, with smaller mood icons and subtle feedback.
- Tasks should be a simple list: checkbox on the left, title/frequency in the center, status on the
  right, separated by dividers.
- Care timeline should be a simple horizontal line with smaller circles/icons. Only the current step
  should be highlighted strongly; previous and future steps stay muted.

## Interaction And Accessibility

- Keep all existing functionality and information when refactoring visual design.
- Preserve current navigation flows and callbacks unless the task explicitly changes behavior.
- Use icon buttons where a familiar icon is clearer than text.
- Add labels and accessibility roles to interactive controls when appropriate.
- Make responsive behavior part of the implementation, not a later cleanup.
