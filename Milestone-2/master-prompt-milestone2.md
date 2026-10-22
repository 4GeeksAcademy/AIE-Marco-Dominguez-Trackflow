# Utilidades de datos para TRACKFLOW

## Rol y objetivo

Quiero que actúes como **programador senior, experto en TypeScript**, y me ayudes a crear un conjunto de **utilidades de datos** para una empresa, **TRACKFLOW**, que se requieren para el día a día.

No se trata de una interfaz completa todavía (eso vendrá después), sino de las **funciones base** que permitirán gestionar, filtrar, ordenar y transformar la información crítica del negocio. Piensa en esto como la **capa lógica** que otros sistemas utilizarán más adelante.

Estas utilidades deben:

- Estar escritas en **TypeScript**.
- Ser **reutilizables** y estar **correctamente tipadas**.
- Poder ejecutarse **tanto en el navegador como en entornos de desarrollo**.

El énfasis está en dominar la manipulación de datos estructurados: colecciones, objetos, búsquedas, ordenamientos y transformaciones.

---

## Contexto: correo del Tech Lead

Para tener mayor contexto, lee el correo que recibí hace unos días de mi Tech Lead:

> **De:** Tech Lead
> **Para:** Tú
> **Asunto:** Funcionalidades base para procesamiento de datos
>
> Hola,
>
> Necesitamos que implementes un conjunto de funciones TypeScript que nos permitan manejar de forma eficiente los datos principales de la empresa. El objetivo es tener utilidades sólidas y bien tipadas que podamos reutilizar en múltiples contextos.
>
> **Lo que necesitamos:**
>
> 1. **Sistema de gestión de colecciones:** Funciones para filtrar, ordenar, buscar y agrupar elementos dentro de arrays. Debes implementar búsqueda lineal para arrays desordenados y búsqueda binaria para arrays ordenados. Asegúrate de manejar correctamente casos vacíos y elementos no encontrados.
> 2. **Modelado de datos con objetos e interfaces:** Define las interfaces TypeScript que representan las entidades principales del negocio. Cada interfaz debe tener tipos explícitos para todas sus propiedades y métodos auxiliares para trabajar con esos datos. Usa objetos literales para representar instancias concretas.
> 3. **Transformaciones y agregaciones:** Implementa funciones que tomen colecciones de objetos y generen reportes simples: contar elementos por categoría, sumar valores numéricos, encontrar máximos y mínimos, calcular promedios. Todo debe estar tipado.
> 4. **Validaciones de negocio:** Crea funciones que validen que los datos cumplan con las reglas específicas de tu empresa antes de ser procesados o almacenados. Por ejemplo, verificar que un elemento tenga todos los campos obligatorios, que los valores numéricos estén dentro de rangos permitidos, o que las fechas sean coherentes.
>
> El código debe ser limpio, con nombres descriptivos, y cada función debe tener una sola responsabilidad. Queremos que esto sea mantenible a largo plazo.
>
> Revisa el documento de contexto de tu empresa para conocer exactamente qué entidades modelar, qué validaciones aplicar y qué reportes generar.
>
> Saludos,
> Tech Lead

---

## Estructura del proyecto

La implementación debe organizarse en archivos TypeScript separados por responsabilidad:

```
src/
├── types/
│   └── models.ts            # Interfaces y tipos
├── utils/
│   ├── collections.ts       # Funciones para arrays
│   ├── search.ts            # Búsquedas lineal y binaria
│   ├── transformations.ts   # Agregaciones y reportes
│   └── validations.ts       # Validaciones de negocio
└── index-prueba-utilidades-datos.html   # Página de prueba
```

Incluye una **página HTML simple con Tailwind CSS** para probar las funciones manualmente.

Como mínimo, el proyecto debe incluir un **comando claro para validar o ejecutar el código TypeScript** durante el desarrollo, por ejemplo:

- `npx tsc --noEmit`
- `npm run typecheck`
- `npx tsx src/demo.ts`

---

## Archivos de referencia

Usarás **dos archivos** principalmente para entender las necesidades de la empresa:

1. **`CONTEXT.es.md`**: para conocer la empresa, a qué se dedica, etc.
2. **`BRIEFING.es.md`** (dentro de la carpeta `Milestone-2`): especifica los nombres de campos, tipos de entidades y reglas de validación.

> ⚠️ Los nombres de campos, tipos de entidades y reglas de validación en la implementación **deben coincidir exactamente** con lo especificado en `BRIEFING.es.md`. Una implementación genérica que ignore el contexto **no será aceptada**.

---

## ❗ Importante

### Backend / Lógica

- [ ] Define las **interfaces TypeScript** para todas las entidades principales de la empresa, tal cual se especifican en `BRIEFING.es.md` (carpeta `Milestone-2`).
- [ ] Implementa **funciones de filtrado** que permitan buscar elementos por uno o más criterios (por ejemplo: por categoría, por rango de precio, por estado, etc.).
- [ ] Implementa **funciones de ordenamiento** que ordenen arrays según diferentes criterios (ascendente, descendente, por múltiples campos).
- [ ] Implementa **búsqueda lineal** para encontrar elementos en arrays desordenados.
- [ ] Implementa **búsqueda binaria** para encontrar elementos en arrays previamente ordenados.
- [ ] Crea **funciones de agregación** que generen reportes: contar elementos por categoría, calcular totales, promedios, máximos y mínimos.
- [ ] Implementa **validaciones de negocio** que verifiquen que los objetos cumplen con las reglas descritas en `BRIEFING.es.md` (carpeta `Milestone-2`) antes de ser procesados.
- [ ] Todas las funciones deben tener **tipos explícitos** en parámetros y valores de retorno.
- [ ] El código debe seguir el **principio de responsabilidad única**: cada función hace una sola cosa.
- [ ] El proyecto incluye un **comando claro** para validar o ejecutar el código TypeScript durante el desarrollo.

### Frontend / Pruebas

- [ ] Crea una **página HTML simple pero profesional con Tailwind CSS** para probar todas las funciones de forma manual.
- [ ] Incluye **botones o controles** para ejecutar diferentes operaciones (filtrar, buscar, ordenar, generar reportes).
- [ ] Muestra los **resultados** de las operaciones en la interfaz de forma clara y profesional.
- [ ] Asegúrate de poder **servirla en local o en Codespaces** con un comando simple como:

```bash
npx http-server . -p 3000 -a 0.0.0.0
```

---

## Calidad de código

- Usa **nombres descriptivos** para variables, funciones e interfaces (`camelCase` para variables y funciones, `PascalCase` para interfaces).
- Cada función debe ser **pura**: trabaja solo con lo que recibe por parámetros, sin modificar variables globales.
- Escribe **comentarios solo cuando sea necesario** para explicar lógica compleja, no para describir código obvio.
- Maneja correctamente los **casos vacíos**: arrays vacíos, elementos no encontrados y valores nulos.
- Usa `const` por defecto y `let` solo cuando el valor vaya a cambiar.
- Mantén la **indentación y el formato consistentes** en todo el código.

---

## Entregable final: `LEARNING.md`

Una vez hayas concluido todas estas tareas, crea un archivo **`LEARNING.md`** dentro de la carpeta `Milestone-2`, donde me expliques, de manera **simple y clara**, todo lo que realizaste, para que este archivo me ayude a aprender.

> Recuerda que **apenas estoy comenzando a aprender a programar**, así que mantén tu explicación lo más sencilla posible.