# Blocare site-uri

Platformă pentru blocarea site-urilor ilegale. Next.js 16, Prisma 7, Better Auth, Flowable, RustFS (S3).

## Pornire

``` shell
docker compose up -d
npm install
npm run db:migrate
npm run db:generate
npm run seed:admin
npm run dev
```

Verificări: `npm run typecheck` și `npm run lint`.

## Structura

În `src/app` fiecare rută are propriile foldere private:

- `_actions` – server actions ale rutei
- `_components` – componentele folosite doar acolo
- `_hooks` – hook-urile folosite doar acolo

Tot ce este comun stă direct în `src`:

- `actions` – server actions folosite de mai multe rute
- `components/ui` – shadcn, `components/common` – piese generale, `components/layout` – schelet
- `hooks` – hook-uri generale
- `lib` – logica de business, împărțită pe domenii (mai jos)

## Unde este folosit fiecare lucru

| Tema | Locul |
| --- | --- |
| Better Auth (server, plugin admin) | `src/lib/auth/auth.ts` |
| Better Auth (client) | `src/lib/auth/auth-client.ts` |
| Sesiune și utilizator curent | `src/lib/auth/session.ts` |
| Rute Better Auth | `src/app/api/auth/[...all]/route.ts` |
| Protecție rute după cookie | `src/proxy.ts` |
| RBAC: roluri și permisiuni | `src/lib/rbac/permissions.ts` |
| RBAC: verificare în actions | `src/lib/rbac/require-permission.ts` |
| RBAC: ce cazuri vede fiecare rol | `src/lib/rbac/case-access.ts` |
| Flowable: client REST | `src/lib/flowable/client.ts` |
| Flowable: proces (deploy, start, ștergere) | `src/lib/flowable/process.ts` |
| Flowable: sarcini | `src/lib/flowable/tasks.ts`, `task-keys.ts` |
| Flowable: utilizatori și grupuri | `src/lib/flowable/identity.ts` |
| RustFS: client S3 | `src/lib/storage/rustfs-client.ts` |
| URL presemnate (încărcare și descărcare) | `src/lib/storage/presigned-urls.ts` |
| Reguli fișiere (tip, mărime, semnătură) | `src/lib/storage/file-rules.ts` |
| Operații pe obiecte (verificare, citire, ștergere) | `src/lib/storage/objects.ts` |
| Descărcare fișier de caz | `src/app/api/files/[id]/route.ts` |

## Roluri și permisiuni

Fiecare utilizator are un singur rol, care este și grupul lui în Flowable.

| Rol | Permisiuni |
| --- | --- |
| initiator | `case:create`, `case:readOwn`, `note:create`, `file:upload` |
| asp | `case:readAll`, `task:claim`, `task:decide`, `note:create`, `file:upload` |
| anr | `case:readAll`, `task:claim`, `task:decide`, `note:create`, `file:upload` |
| isp | `case:readApproved`, `task:claim`, `task:execute`, `note:create`, `file:upload` |
| admin | `case:readAll`, `task:release`, `note:create`, `file:upload`, `process:manage`, gestionarea utilizatorilor |

Un utilizator cu rolul `user` nu are nicio permisiune până când adminul îi atribuie un rol în Admin, Utilizatori.

## Încărcarea fișierelor

Limita este de 25 MB pentru orice fișier.

- Anexe la caz: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`
- Lista de domenii: doar `.xlsx`
- Procesul BPMN (admin): `.xml` sau `.bpmn`

Fluxul anexelor cu URL presemnat:

1. Browserul cere un URL (`requestAttachmentUpload`), serverul verifică numele și mărimea.
2. Browserul trimite fișierul direct în RustFS cu `PUT`.
3. Browserul confirmă (`confirmAttachmentUpload`); serverul verifică mărimea reală, extensia și semnătura fișierului, apoi îl înregistrează.

Descărcarea trece prin `/api/files/[id]`: se verifică accesul, apoi urmează o redirecționare către un URL presemnat valabil 60 de secunde.

---
CORS-ul bucket-ului se setează automat din `BETTER_AUTH_URL`.
