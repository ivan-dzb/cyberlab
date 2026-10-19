## Solución

1. Inicia sesión con `ana` / `ana2024`. Verás dos facturas: `/facturas/1042` y `/facturas/1043`.
2. El identificador es un número consecutivo en la URL. Prueba otros valores:

   ```bash
   curl -s -H "Cookie: sid=<tu-cookie>" http://<tu-sesion>.lab.localhost:8081/facturas/1001
   ```

3. La factura `1001` pertenece a dirección y su nota interna contiene la bandera. El servidor la entrega aunque no sea de `ana`.

## Qué aprendiste

- Autenticación («¿quién eres?») no es autorización («¿puedes ver esto?»).
- Los identificadores secuenciales hacen trivial recorrer todos los recursos. Se pueden automatizar con un script o con herramientas como Burp Intruder.
- Es un caso de **control de acceso roto** (OWASP A01), en su variante IDOR.

## Cómo se evita

Antes de devolver un recurso, el servidor comprueba que pertenece al usuario autenticado:

```js
if (invoice.owner !== user) return res.status(403)
```

Usar identificadores aleatorios (UUID) dificulta adivinarlos, pero la comprobación de propiedad sigue siendo obligatoria.
