# Easy Production

Sistema MES ligero (Manufacturing Execution System) destinado a talleres y maquilas.

**Objetivo de esta iteración (Prompt 0):**
- Crear los documentos base (fuente de verdad) y el scaffolding mínimo del repositorio.
- **Sin UI, sin páginas, sin repositorios ni stores, sin backend, sin auth.**

**Stack objetivo (futuro):**
- Next.js App Router + TypeScript (strict)
- Tailwind
- Zustand
- TanStack Query
- React Hook Form + Zod
- IndexedDB (Dexie) para outbox/cache opcional
- Backend objetivo: AWS Lambda + MongoDB Atlas (NO implementar en esta iteración)

## Qué contiene esta rama
- `docs/` con arquitectura, modelo de datos, modelo de eventos, plan offline y coding standards
- Configuración TypeScript estricta mínima (`tsconfig.json`)
- Estructura básica de carpetas en `src/` (sin lógica de negocio)

## Cómo validar rápidamente
1. Instalar dependencias: `npm install`
2. Verificar build TypeScript: `npm run build`

> Nota: detener al terminar esta tarea. No avanzar a fases de UI/Backend en esta iteración.
