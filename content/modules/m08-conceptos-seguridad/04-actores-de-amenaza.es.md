---
titulo: Actores de amenaza y motivaciones
tiempo_min: 20
ultima_revision: 2026-10-18
---

## Resumen (5 min)

Defender bien exige saber **contra quién** y **por qué**. Un estudiante curioso, una banda de ransomware y un servicio de inteligencia estatal tienen recursos, paciencia y objetivos muy distintos; tus controles deben ajustarse al adversario realista.

## Categorías de actores

| Actor | Motivación típica | Recursos / sofisticación | Ejemplo de objetivo |
|---|---|---|---|
| **Cibercriminales** | Dinero | Variable; ecosistema profesional (corredores de acceso, ransomware como servicio) | extorsión, fraude, robo de credenciales |
| **Estados / APT** | Espionaje, sabotaje, influencia | Altos; operaciones largas y sigilosas | gobierno, defensa, infraestructura crítica |
| **Hacktivistas** | Ideología | Bajos–medios | defacement, filtraciones, DDoS |
| **Insiders** (internos) | Dinero, venganza, negligencia | Acceso legítimo ya concedido | exfiltración, sabotaje, errores |
| **Aficionados / *script kiddies*** | Curiosidad, reputación | Bajos; usan herramientas ajenas | escaneos oportunistas |
| **Investigadores** (white/gray hat) | Mejorar seguridad, reconocimiento | Variable | divulgación, *bug bounty* |

La clasificación es una simplificación: los actores se solapan (criminales con apoyo estatal, insiders reclutados).

## Conceptos útiles

- **TTP** (*Tactics, Techniques, Procedures*): cómo opera un actor. **MITRE ATT&CK** es la base de conocimiento estándar para describirlas (la verás en M09).
- **IOC** (indicador de compromiso) vs **TTP**: los IOC (hashes, IPs) caducan rápido; los TTP son más difíciles de cambiar para el atacante.
- **Superficie de ataque**: todos los puntos por donde un actor puede intentar entrar.
- **Oportunismo vs dirigidos**: la mayoría de los ataques son oportunistas (buscan lo fácil), por lo que higiene básica (parches, MFA, backups) bloquea gran parte.
- **Atribución**: identificar al actor es difícil y a menudo incierto; los informes serios expresan niveles de confianza.

## Cómo se aplica

Al modelar riesgos preguntas: ¿quién querría esto? ¿qué capacidad tiene? ¿qué vía usaría? (se formaliza en *modelado de amenazas*, M35). Un pequeño negocio se defiende sobre todo de crimen oportunista; un proveedor de infraestructura crítica debe considerar adversarios avanzados.

## Errores comunes

- "Nadie querría atacarme": los ataques automatizados no discriminan.
- Obsesionarse con el atacante exótico y descuidar el phishing y las credenciales débiles.
- Ignorar al insider, incluido el accidental.
- Atribuir con certeza a partir de un solo indicador.

## Para practicar

Para tres organizaciones (clínica, tienda online, municipio) escribe el actor más probable, su motivación y su vía de entrada más realista.

## Referencias

- [MITRE ATT&CK](https://attack.mitre.org/) (grupos y técnicas)
- Estadísticas de actores y vectores: consultar el último *Verizon DBIR* y *Mandiant M-Trends* (pendiente de incorporar cifras verificadas).
