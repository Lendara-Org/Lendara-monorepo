# AGENTS.md — Lendara Sandbox

> Contexto y reglas del proyecto para el equipo y sus asistentes de IA (Claude Code, Cursor, Codex, Copilot…).
> Léelo completo antes de cualquier tarea.
>
> - **Idioma:** con el equipo, en **español**. Código, nombres, comentarios, commits, títulos y descripciones de PR,
>   en **inglés**.
> - **Notas personales:** cada persona puede tener su propio `CLAUDE.local.md` (está en `.gitignore`). Lo que vale para
>   todo el equipo va aquí.
> - Si cambias una decisión, una convención o descubres una trampa nueva, **actualiza este archivo en el mismo PR**.

---

## 1. Qué es Lendara

Lendara es una **rampa de moneda local → USDC embebible sobre Stellar**, para **Costa Rica (CRC), Argentina (ARS) y
Chile (CLP)**. Posicionamiento: **"el Stripe Checkout de Stellar"**. (Brasil/BRL se quitó el 2026-10-11.)

Este repo es el **sandbox**: un anchor de Lendara en **Stellar testnet** con **rieles fiat simulados**. No se mueve dinero
real y no requiere licencias.

Un integrador puede:
1. Entrar al dashboard y crear un proyecto con su API key de prueba.
2. Embeber el widget en su app en pocas líneas.
3. Simular un pago en CRC, ARS o CLP y ver llegar USDC de testnet a la wallet del usuario.
4. Forzar escenarios con **tarjetas de prueba** (aprobado, KYC rechazado, pago no recibido, demorado), como en Stripe.

**Equipo:** Anouk Rímola (Costa Rica), Elisa Araya y Karen Giannetto (Argentina).

**Contexto:** hackathon de Stellar en Chile (cierre 12 de octubre de 2026), luego Meridian 2026 y grants de Stellar
(Instawards, SCF).

### Fuera de alcance

Dinero real, mainnet, licencias y cumplimiento regulatorio real, KYC real, proveedores de pago reales, contratos de
Soroban (salvo decisión explícita).

### Sandbox vs. producción (importante para el copy y las docs)

- El sandbox **emite su propio activo de prueba llamado `USDC`** (issuer
  `GBVIQ7QVTTJ4NLFTYYFPEKWYJWAMKDAOFYSR52ZGWJFSGTSVOO5H47B5`, `status = "test"` en `stellar.toml`). No es el USDC de
  Circle y no tiene valor. Una cuenta necesita trustline a **ese emisor exacto** (hay muchos "USDC" en testnet).
- En producción Lendara **no emitiría USDC** (solo Circle lo hace): recibiría moneda local y entregaría USDC de Circle
  desde su inventario, cobrando comisión.
- Nunca afirmar en copy público algo que no sea verificable: nada de "construido sobre Stellar Anchor Platform" (es
  falso, el anchor es propio en Go), nada de "el primer anchor con colones", nada de métricas, clientes ni partners
  inventados, no nombrar competidores.

---

## 2. Dos públicos, dos caras de la API

| Público | Qué consume | Autenticación |
|---|---|---|
| **Wallets de Stellar** | Endpoints SEP: `stellar.toml` (SEP-1), SEP-10, SEP-24 | SEP-10 (JWT) |
| **Apps y dApps que no son wallets** | API `/v1` + `@lendara/ramp` (servidor) + `@lendara/widget` (navegador) | API key del proyecto |

**Ambas caras comparten el mismo modelo de transacción y la misma máquina de estados. No dupliques lógica.**

---

## 3. Arquitectura del monorepo

```
lendara/
├── apps/
│   ├── api/       # Go: SEP-1/10/24, /v1, /widget-api, simulador fiat, worker de pagos Stellar
│   ├── web/       # Next.js: landing (/es, /en), /docs, /dashboard y /widget/[id]
│   └── demo/      # Next.js: app de ejemplo que integra Lendara
├── packages/
│   ├── sdk/       # npm @lendara/ramp: cliente de servidor para /v1 (tipos desde openapi.yaml)
│   └── widget/    # npm @lendara/widget: loader que abre /widget en modal (iframe) o popup
├── openapi.yaml   # Contrato de la API: FUENTE DE VERDAD
├── docker-compose.yml, Makefile, .env.example, README.md
```

- **Landing, docs, dashboard y widget son una sola app Next.js** (`apps/web`) con distintas rutas.
- **El widget no es una app aparte**: es `/widget/[id]` en `apps/web`. `packages/widget` solo lo abre y reenvía eventos.
- **`apps/api` (Go) no está en el workspace de pnpm.** El workspace incluye `apps/web`, `apps/demo` y `packages/*`. El
  `Makefile` raíz orquesta todo.
- **`openapi.yaml` se escribe antes de implementar.** De él se generan los tipos y el servidor de Go (`oapi-codegen`,
  strict server) y los tipos de TS (`openapi-typescript`). Tras cambiarlo: `make codegen` (el CI falla si el código
  generado no está al día).

### URLs en vivo

| Qué | URL |
|---|---|
| Web (landing, docs, dashboard, widget) | https://lendara-monorepo-fixh.vercel.app |
| Demo | https://lendara-monorepo.vercel.app |
| API | https://lendaraweb-production.up.railway.app (el servicio de Railway se llama "lendara/web" pero es la API) |
| npm | `@lendara/ramp`, `@lendara/widget` (el scope `@lendara` tiene también `@lendara/sdk`, de otro producto: **no tocarlo**) |

---

## 4. Stack

### Backend (`apps/api`)
- **Go 1.27** con `net/http` y código generado por `oapi-codegen` (strict server). Middleware propio: logging, CORS,
  recover, auth.
- **PostgreSQL 17** con `pgx` + **`sqlc`** (SQL tipado, sin ORM). Migraciones con **`goose`**.
- **Stellar:** `github.com/stellar/go-stellar-sdk` v0.7.x (`github.com/stellar/go` está archivado). Para SEP-10 usar los
  helpers del SDK; **no implementar criptografía a mano**.
- JWT con `github.com/golang-jwt/jwt/v5`. Logging con `log/slog`. Config por variables de entorno, falla rápido si falta
  algo obligatorio.
- Herramientas Go fijadas en `apps/api/tools.mod` (goose, golangci-lint, govulncheck, oapi-codegen, sqlc), se corren con
  `go tool -modfile=tools.mod …`. Nada que instalar globalmente.
- Horizon testnet: `https://horizon-testnet.stellar.org`. Passphrase: `Test SDF Network ; September 2015`.

### Frontend (`apps/web`, `apps/demo`)
- **Next.js 16** (App Router), **React 19**, **TypeScript estricto**, **Tailwind CSS 4**.
- ⚠️ Next 16 cambia APIs respecto a versiones anteriores: lee `apps/web/AGENTS.md` y la guía en
  `node_modules/next/dist/docs/` antes de escribir código de Next.
- ESLint 9 (los plugins de Next no soportan ESLint 10).
- Docs con páginas propias en TSX (sin Fumadocs; decisión del 2026-10-11 para no sumar dependencias).

### Paquetes (`packages/*`)
- TypeScript sin dependencias de runtime, compilados con `tsc` a `dist/` (ignorado por git).
- En el monorepo `exports` apunta a `src/*.ts`; `publishConfig.exports` apunta a `dist`. **Publicar siempre con pnpm**:
  `pnpm --filter @lendara/ramp publish --no-git-checks` (subir la versión antes; npm no acepta repetirla).
- Tests con `node --test` (sin dependencias de test).

---

## 5. Reglas para trabajar (personas y asistentes de IA)

### 5.1 Git y PRs
- **Ramas:** `<tipo>/<scope>-<descripcion-corta>` (ej. `feat/api-sep10`, `docs/web-docs`).
- **Flujo:** features → **`develop`** (squash). `develop` → `main` solo para releases (merge commit). La rama por
  defecto en GitHub es `develop`.
- **Conventional Commits** con scope **obligatorio**: tipos `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`;
  scopes `api`, `web`, `sdk`, `widget`, `demo`, `repo`. El hook de commit (commitlint) y el CI (título del PR) lo validan.
  Ejemplo: `feat(api): add SEP-24 deposit interactive endpoint`.
- **Un PR por funcionalidad**, con **commits separados por capa** (api, web, demo, repo…). Un PR puede pasar de 400
  líneas si es una sola funcionalidad coherente; no mezcles temas no relacionados.
- Título y descripción del PR **en inglés**. La descripción dice qué hace, por qué y cómo se probó.
- **Asistentes de IA:** no hagas `commit`, `push`, `merge`, `rebase` ni crees PRs salvo que la persona lo pida
  explícitamente. Por defecto, deja los cambios en el árbol de trabajo y entrega los comandos de commit sugeridos.

### 5.2 Antes de empezar una tarea
1. Resume en pocas líneas qué vas a hacer y qué archivos vas a tocar.
2. **Pregunta antes de agregar una dependencia** (librería, servicio, herramienta) o tomar una decisión de producto
   abierta.
3. Si algo del plan parece incorrecto o hay una forma claramente mejor, dilo con argumentos antes de desviarte.

### 5.3 Antes de dar algo por terminado
- Corre formateo, lint, typecheck, tests y build de lo que tocaste, y **reporta el resultado real**. No digas que algo
  funciona si no lo verificaste.
- Si tocaste UI, pruébala en el navegador (escritorio y móvil, ~390 px, sin scroll horizontal).
- Si tocaste `openapi.yaml` o SQL: `make codegen`.
- Si cambiaste algo que este archivo describe, actualízalo.

### 5.4 Seguridad
- **Nunca** escribas claves secretas de Stellar (`S…`), API keys reales ni contraseñas en archivos versionados. Todo
  secreto va en variables de entorno; mantén `.env.example` con valores vacíos o falsos.
- **Solo testnet.** Nunca uses mainnet ni su passphrase.
- `gitleaks` corre en el CI con una regla para semillas Stellar `S…`.

### 5.5 SEPs
- No inventes comportamiento: consulta la especificación y cita la sección.
  - SEP-1: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md
  - SEP-10: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
  - SEP-24: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md

---

## 6. Diseño funcional y decisiones del backend

### Máquina de estados (compartida por SEP-24 y `/v1`)

```
incomplete → pending_user_transfer_start → pending_anchor → pending_stellar → completed
                          ↘ expired               ↘ pending_trust
cualquier estado → error (con `message`)
```

- Vive en `apps/api/internal/transaction`. **Las transiciones solo se hacen con `transaction.Store.Transition`**, que
  valida y registra en `transaction_events`. Una transición inválida es un error, nunca un no-op silencioso.
- `transaction.Store.Confirm` guarda la cotización y pasa a `pending_user_transfer_start` en la misma transacción de BD.

### Escenarios del sandbox (por tarjeta de prueba)

| Tarjeta | `SandboxScenario` | Resultado |
|---|---|---|
| `4242 4242 4242 4242` | `approved` | `completed` |
| `4000 0000 0000 0002` | `kyc_rejected` | `error` |
| `4000 0000 0000 9995` | `payment_not_received` | `expired` |
| `4000 0000 0000 0077` | `delayed` | 30 s en `pending_anchor`, luego `completed` |

- El widget traduce la tarjeta a escenario **en el navegador** (`apps/web/src/lib/card.ts`: Luhn, solo Visa, solo
  tarjetas de prueba). **El número de tarjeta nunca se envía**: `POST /widget-api/transaction/simulate-payment` recibe
  `{"scenario": …}`. Se guarda en `transactions.scenario`.
- Paquete `sandbox` (`apps/api/internal/sandbox`): tasas ficticias por 1 USDC **CRC 510, ARS 1000, CLP 950**, comisión
  fija **0.50 USDC**, límites **1–10.000 USDC** después de la comisión. Cálculo con `big.Rat`, redondeo hacia abajo a 7
  decimales. Montos fiat: string decimal con ≤ 2 decimales. (La demo copia las tasas en `apps/demo/src/lib/rates.ts`
  solo para mostrar una estimación: si cambian, actualizar ambos.)

### Worker de pagos (`internal/payment`)
- Goroutine dentro del proceso de la API, cada 2 s. Toma `pending_anchor`/`pending_trust`/`pending_stellar` con
  `next_attempt_at` vencido.
- Sin trustline → `pending_trust` (revisa cada 15 s; a la hora → `error`). Guarda el hash en `pending_stellar` antes de
  enviar, con un `next_attempt_at` propio (10 s) como red de seguridad. Fallo de Horizon al enviar → `error` con
  result codes; fallo al leer la cuenta → reintenta.
- Si el proceso se cae (o Horizon no responde) entre guardar el hash y confirmar el envío, la transacción queda
  `pending_stellar` y vuelve a aparecer en el siguiente ciclo. El worker nunca reenvía a ciegas: primero le pregunta a
  Horizon por ese hash (`TransactionDetail`). Si ya se confirmó → `completed`. Si todavía no aparece y no pasaron 5
  minutos (el *time bound* de la transacción original ya venció) → vuelve a esperar. Si pasaron 5 minutos sin
  aparecer → arma y envía un pago nuevo (`pending_stellar → pending_stellar`, único self-loop de la máquina de
  estados).

### SEP-1 / SEP-10 / SEP-24
- `stellar.toml` se genera desde la config, con CORS `*`.
- SEP-10: JWT HS256 con `SEP10_JWT_SECRET` (≥ 32 caracteres), TTL 24 h, `sub` = `G…`, `M…` o `G…:memo`. `client_domain`
  no se soporta. Cuenta existente → umbral medio; inexistente → firma de la master key.
- Auth SEP-24: middleware con lista de operationIDs (`internal/server/auth.go`); sin JWT válido → 403
  `{"type":"authentication_required"}`. Los handlers leen la cuenta con `sep10.SubjectFrom(ctx)`.
- SEP-24: solo depósitos. El `amount` del wallet (en USDC) no se guarda. `more_info_url` = `/widget/<id>` sin token.
  Fechas en UTC.
- La URL interactiva lleva un **token de un solo uso** (hash en BD, 15 min), no el JWT de SEP-10. El widget lo cambia por
  una sesión JWT (`widgetauth`: issuer `<API>/widget-api`, audience `lendara-widget`, 30 min, `sub` = id de transacción).
  Sin sesión válida → 401.

### API `/v1` para integradores
- `POST /v1/projects` (sin auth) devuelve proyecto + API key **una sola vez**. Dashboard sin cuentas de usuario.
- API keys `lnd_test_<128 bits base32>`; en BD solo el **SHA-256** (`api_keys.key_hash`) y un `key_prefix` visible.
  Auth `Bearer` → 401 si falta o es inválida. Paquete `project` (`Store`, `project.WithID` / `project.IDFrom`).
- `POST /v1/sessions` crea un depósito `incomplete` del proyecto; la URL del widget lleva `fiat_currency` y
  `fiat_amount` para prellenar el monto.
- `GET /v1/transactions` (cursor = id de la última transacción, `limit` 1–100) y `GET /v1/transactions/{id}` (otro
  proyecto → 404). Reutilizan el schema `Sep24Transaction`.
- Errores en JSON `{"error": "…"}`.

### Código del backend
- `handlers.New(handlers.Config{...})` recibe todas las dependencias; `server.New(logger, db, handlers, server.Auth{SEP10,
  Widget, APIKey})`.
- `sqlc` genera `internal/db` desde `migrations/` + `internal/db/queries/*.sql` (uuid → `google/uuid`, timestamptz →
  `time.Time`, numeric → `*string`). Estados como `text` + CHECK.
- Errores con contexto (`fmt.Errorf("…: %w", err)`).

---

## 7. Frontend: marca y convenciones

- **Tokens de marca** en `apps/*/src/app/globals.css`: `ink #121621`, `paper #F6F4F4`, `gray #686868`, `crimson #E22366`,
  `wine #7A1B3D`, `error #D7473A`. No uses colores sueltos.
- **Crimson al mínimo**: solo como acento (paso activo, punto de "procesando", foco). Nunca fondo grande ni texto chico.
  Si una sección necesita color, usa **wine**. Los errores usan `error`, nunca crimson.
- Producto financiero: tono **formal**. Tipografías: **Bebas Neue** para titulares (una sola variante, mayúsculas),
  **Inter** para texto, **JetBrains Mono** para montos, hashes, IDs y código (con `tabular-nums`).
- Motion: un solo momento animado en la carga del hero; respetar `prefers-reduced-motion`.
- **Idiomas:** el widget, la demo, las docs y la landing son **es/en**. Copy en español con **tuteo**. El dashboard está
  en inglés.
- **Widget** (`/widget/[id]`): checkout tipo modal con 5 pasos (Monto → Tus datos → Pago → Revisar → Estado). Datos
  personales y tarjeta solo en memoria del navegador; inputs de tarjeta con `autoComplete="off"`. Notifica al padre con
  `postMessage({ transaction })` y `{ type: "lendara:close" }`. Parámetros: `token`, `lang`, `fiat_currency`,
  `fiat_amount`.
- **Loader** (`@lendara/widget`): verifica `origin` **y** `source` de cada mensaje.
- El dashboard guarda la API key en `localStorage` (`lendara:api-key`) y llama a `/v1` desde el navegador (es el
  navegador del dueño de la key).
- Las apps web importan los paquetes del workspace como fuente TS: `transpilePackages` en `next.config.ts` y
  `allowImportingTsExtensions` en el `tsconfig`.

---

## 8. Comandos y verificación

```bash
cp .env.example .env && make install && make db-up && make migrate
make setup-testnet   # crea cuentas de testnet y emite USDC de prueba (idempotente); pegar la salida en .env
make dev-api         # http://localhost:8080/health
make dev-web         # http://localhost:3000 (puerto fijo)
make dev-demo        # http://localhost:3001 (necesita LENDARA_API_KEY de un proyecto de la API local)
```

| Antes de entregar | Comando |
|---|---|
| Backend | `make lint-api`, `make test-api` (necesita Postgres arriba), `make build-api` |
| Frontend | `make lint-js`, `make typecheck`, `make test-js`, `make build-js` |
| Contrato | `make lint-openapi`, `make codegen` |
| Todo | `make lint typecheck test build` |

---

## 9. Trampas conocidas

- **pnpm 12** bloquea paquetes publicados hace menos de 1 día (`minimumReleaseAge`): usa la versión anterior. **No**
  agregues excepciones en `pnpm-workspace.yaml`. Los builds de dependencias están bloqueados (`allowBuilds`).
- `openapi-typescript` necesita **TypeScript 5** (no 7).
- `make test-api` necesita Postgres (`make db-up`); si no, falla `TestHealthWithPostgres`. Los tests de integración dejan
  transacciones en la BD local: si corres la API, el worker las mueve a `pending_trust`/`error` (es normal).
- `make vuln-api` usa `apps/api/govulncheck.allow` (excepción revisada: GO-2026-4316, go-chi vía el SDK). Con un Go local
  viejo puede fallar por vulnerabilidades de la stdlib; actualiza Go (el CI usa la última 1.27.x).
- `next dev` reescribe `next-env.d.ts` (rutas `.next/dev/…`): no lo commitees, descarta ese cambio. `apps/*/AGENTS.md` lo
  genera Next y sí se commitea.
- El `Makefile` exporta las variables de `.env` (por eso `PORT=8080` no choca con el puerto 3000 de la web).
- **Railway** a veces no despliega solo tras un merge: usa **"Deploy latest commit"** (no "Redeploy", que repite el commit
  viejo) y verifica en el log que corran las migraciones esperadas. Config en la UI (Config as Code está deprecado):
  Root `/apps/api`, Dockerfile `/apps/api/Dockerfile`, Pre-deploy `/app/goose up`, Healthcheck `/health`. Plan gratis:
  la API y Postgres duermen; el primer request es lento.
- **Vercel:** cada proyecto (web y demo) debe tener *Production Branch* = `develop` (Settings → Environments →
  Production). Si no, `develop` solo genera previews. Las URLs largas `…-anoukrimolas-projects.vercel.app` son previews
  protegidos con login.
- `NEXT_PUBLIC_*` se fija al compilar: redeploy después de cambiarlo.

---

## 10. Estado (actualizado 2026-10-11)

**Hecho y desplegado:** setup del monorepo y CI; SEP-1, SEP-10, SEP-24 (depósito); simulador fiat con escenarios por
tarjeta; worker de pagos con `pending_trust`; widget tipo checkout (es/en); API `/v1` con proyectos y API keys;
`@lendara/ramp` y `@lendara/widget` publicados en npm; demo bilingüe con wallet de prueba y guía de trustline;
dashboard; docs bilingües; landing bilingüe; README.

**Pendiente:**
- Validar con la **Demo Wallet de SDF** (SEP-10 + depósito SEP-24) y con la anchor test suite de SDF; actualizar la
  tabla "Validation" del README.
- Video de 2–3 minutos para la entrega.
- Extras, en orden: webhooks para integradores (HMAC) → retiros SEP-24 → SEP-12 (KYC simulado) → SEP-38 → SEP-31.

**Historia principal que no se recorta:** un dev crea un proyecto → integra el widget → el usuario paga con una tarjeta
de prueba → llegan los USDC a su wallet.
