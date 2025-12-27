# TODOs y notas técnicas

- Removí `@types/dexie` de `devDependencies` porque la versión solicitada no existe en npm (causaba `ETARGET`). Si más tarde es necesario, agregar la versión correcta o mantener un `types.d.ts` local.
- Agregar shim `fake-indexeddb` y configuración de tests para ejecutar pruebas que dependan de Dexie en Node (opcional, siguiente iteración).
- Agregar tests adicionales para repositorios (unit + integration con fake-indexeddb). **Estado:** agregados tests de agregación (Vitest) y pasan ✅.
- Añadir linter y pipeline CI.
- Considerar publicar tipos propios para dexie si la comunidad no mantiene el paquete de tipos.
