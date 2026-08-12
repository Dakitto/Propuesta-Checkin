# Propuesta Check-In

Portal de check-in para consejeros con persistencia en Supabase (Postgres) y despliegue en Vercel.

## Requisitos

- Node.js 20+
- Proyecto de Supabase
- (Opcional) cuenta en Vercel para deploy

## Configuracion de base de datos (Supabase/Postgres)

1. Crea un proyecto en Supabase.
2. Abre SQL Editor y ejecuta el script [supabase/schema.sql](supabase/schema.sql).
3. En Supabase, copia:
	- `Project URL`
	- `service_role` key (Settings > API)

## Variables de entorno

Crea `.env.local` en la raiz:

```bash
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
AUTH_SESSION_SECRET=CAMBIA_ESTE_SECRETO
AUTH_ADMIN_USERNAME=admin
AUTH_ADMIN_PASSWORD=CAMBIA_ESTA_CLAVE_ADMIN
AUTH_CHECKER_USERNAME=chequeador
AUTH_CHECKER_PASSWORD=chequeador2026
```

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. En `Settings > Environment Variables`, agrega:
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
3. Redeploy.

## Persistencia actual

La app guarda en Supabase:

- Configuracion (`app_config`)
- Consejeros (`counselors`)
- Eventos (`events`)
- Check-ins (`checkins`)

La sesion de login usa cookie segura `httpOnly` (sin exponer contraseña de admin en UI).

## Roles de acceso

- `admin`: acceso completo (`/checkin`, `/dashboard`, `/admin`).
- `checker` (normal): acceso solo a `/checkin`.

Credencial por defecto para usuario normal:

- Usuario: `chequeador`
- Clave: `chequeador2026`

La clave de admin no se muestra en el login y se configura por variable de entorno:

- `AUTH_ADMIN_PASSWORD`

## Seguridad (RLS)

El script [supabase/schema.sql](supabase/schema.sql) deja activado Row Level Security en todas las tablas y bloquea acceso directo para `anon` y `authenticated`.

- El acceso de la app ocurre por el backend (`/api/portal`) usando `SUPABASE_SERVICE_ROLE_KEY`.
- Si ya habias ejecutado una version anterior del script, vuelve a correr el archivo completo para aplicar `enable row level security`, `revoke` y policies.

## Nota de migracion de schema

La tabla `app_config` ya no usa columnas `username` ni `password`. Si tu base fue creada con una version anterior, puedes quitarlas opcionalmente:

```sql
alter table app_config drop column if exists username;
alter table app_config drop column if exists password;
```
