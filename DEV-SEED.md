# Ejecutar `seedDemoData()`

Este proyecto usa Dexie (IndexedDB) para storage local — por lo tanto el `seedDemoData()` está pensado para ejecutarse en un entorno con IndexedDB (p. ej. navegador o Playground con shim).

Pasos para probar manualmente:

1. Construir el paquete TypeScript: `npm run build`.
2. En un entorno con IndexedDB disponible (por ejemplo, console de devtools de una app que importe `easy-production`):

```js
import { seedDemoData, db } from 'easy-production/dist';

// Llamar al seed (ejemplo en consola del navegador):
seedDemoData({ trackingMode: 'hybrid' })
  .then((r) => console.log('Seed complete', r))
  .catch((err) => console.error(err));
```

Notas:
- Si necesitas ejecutar seed en Node (CI), deberás proveer un shim para IndexedDB (por ejemplo `fake-indexeddb`) y ajustar la configuración de tests.
- `seedDemoData()` borra tablas relevantes y crea datos demo: products, operations, routingVersion (snapshot), workCenters, operators y productionOrder.
