# Guía de aprendizaje: utilidades de datos

## ¿Qué se construyó?

TrackFlow necesita organizar productos, envíos y transportistas. El proyecto contiene tipos para describir esos datos y funciones pequeñas para trabajar con ellos.

- `src/types/models.ts` define la forma de cada dato. Por ejemplo, un producto siempre tiene un SKU, un peso, una categoría y un almacén.
- `src/utils/collections.ts` filtra listas y crea listas ordenadas sin cambiar las originales.
- `src/utils/search.ts` busca productos y envíos. La búsqueda binaria necesita que los productos estén ordenados por peso.
- `src/utils/transformations.ts` calcula costos, puntajes y reportes. Un transportista es candidato si su puntaje es al menos 50; entre los candidatos se elige el de menor costo.
- `src/utils/validations.ts` comprueba las reglas descritas en el briefing y devuelve si los datos son válidos y una lista de errores.
- `src/data/sample-data.ts` tiene datos de ejemplo. La página de prueba usa esos datos para ejecutar las funciones.

## Probar la página

Necesitas Node.js y npm instalados. Primero compila TypeScript a JavaScript:

```bash
npx --yes --package typescript tsc -p tsconfig.json
```

Después, inicia un servidor web local:

```bash
npx --yes --package http-server http-server . -p 3000 -a 0.0.0.0
```

Abre `http://localhost:3000/index-prueba-utilidades-datos.html`. La página permite probar filtros, búsquedas, ordenamientos, reportes, validaciones y la selección de transportista.

Para comprobar los tipos sin generar JavaScript, ejecuta:

```bash
npx --yes --package typescript tsc --noEmit -p tsconfig.json
```

## Ideas importantes

- Una función de filtro recibe una lista y devuelve otra lista con los elementos que cumplen el criterio.
- Ordenar una copia con `[...lista]` evita modificar los datos que recibió la función.
- La búsqueda lineal revisa los elementos uno por uno. La búsqueda binaria descarta la mitad de la lista en cada paso, pero solo funciona si esa lista ya está ordenada.
- El costo se forma con tarifa base, peso y distancia; después se aplica el recargo de prioridad: 0 % para Standard, 30 % para Express y 60 % para Same-day.
- Los validadores siguen únicamente las reglas especificadas para cada entidad. Un promedio de distancia sin envíos devuelve `0`.