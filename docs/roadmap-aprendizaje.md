# Roadmap de aprendizaje de ciberseguridad (de cero a experto)

Documento maestro de contenido de CyberLab. Cada **módulo** (ID `M##`) se convierte en una unidad de la plataforma: teoría condensada + laboratorios + retos + evaluación. Los módulos se construyen uno a uno con el proceso de la sección 5.

Convenciones: **Nivel** = Principiante (P) · Intermedio (I) · Avanzado (A) · Experto (E). **Lab** = práctica guiada. **Reto** = ejercicio sin guía en contenedor aislado. Los temas listados son el *alcance mínimo*; la investigación de cada módulo puede ampliarlo.

---

## 1. Perfiles y rutas

El núcleo (Etapas 0–3) es común. Desde la Etapa 4 el estudiante elige una o varias rutas:

| Ruta | Rol objetivo | Módulos clave |
|---|---|---|
| Red Team / Pentester | Pentester, Red Team operator | M14–M26, M30 |
| Blue Team / SOC | Analista SOC, Detection engineer, Threat hunter | M27–M34 |
| DFIR | Forense digital, respuesta a incidentes | M31–M33 |
| Application Security | AppSec engineer, Bug bounty | M14–M18, M35–M37 |
| Cloud / DevSecOps | Cloud security engineer | M38–M41 |
| Reversing / Malware / Vuln research | Analista de malware, Exploit developer | M42–M46 |
| GRC / Arquitectura | Security architect, CISO track | M47–M52 |

---

## 2. Etapa 0 – Fundamentos de computación (P)

- **M01 Cómo funciona una computadora y un SO.** Arquitectura (CPU, memoria, almacenamiento), procesos, hilos, memoria virtual, syscalls, sistemas de archivos, permisos, usuarios/grupos, servicios.
- **M02 Linux para seguridad.** Shell (bash), coreutils, pipes/redirecciones, permisos y ACL, SUID/SGID, capabilities, systemd, cron, gestión de paquetes, logs (journald/syslog), `ssh`, editores (vim/nano), tmux. Lab: administrar una VM y endurecerla básicamente.
- **M03 Windows y Active Directory (fundamentos).** Registro, servicios, NTFS, UAC, tokens, PowerShell, WMI, Event Log, GPO, conceptos de dominio, Kerberos/NTLM a nivel conceptual.
- **M04 Redes fundamentales.** Modelo OSI/TCP-IP, Ethernet, ARP, IP v4/v6, subnetting/CIDR, NAT, enrutamiento, TCP/UDP (handshake, flags, estados), ICMP, DNS, DHCP, HTTP/HTTPS, TLS, SMTP/IMAP, VPN, VLAN, firewalls, proxies, wireless (802.11). Lab: Wireshark y tcpdump sobre tráfico real.
- **M05 Programación y scripting.** Python (automatización, sockets, requests, parsing), Bash, PowerShell; nociones de C (punteros, memoria, stack/heap), JavaScript y SQL. Git y control de versiones. Lab: escribir un port scanner y un parser de logs.
- **M06 Criptografía aplicada (base).** Hash, MAC, cifrado simétrico/asimétrico, modos (ECB/CBC/GCM), firmas, PKI y certificados, TLS 1.3, KDF (Argon2, scrypt, PBKDF2), gestión de claves, errores comunes. Introducción a criptografía post-cuántica.
- **M07 Bases de datos y web (fundamentos).** HTTP en profundidad (métodos, headers, cookies, CORS, CSP), sesiones, APIs REST/GraphQL, SQL/NoSQL, arquitectura web moderna.

## 3. Etapa 1 – Fundamentos de seguridad (P)

- **M08 Conceptos y principios de seguridad.** Tríada CIA, AAA, defensa en profundidad, mínimo privilegio, zero trust, modelado de amenazas, riesgo (amenaza/vulnerabilidad/impacto), tipos de actores y motivaciones. Vocabulario (CVE, CWE, CVSS, EPSS, KEV).
- **M09 Marcos y estándares (visión general).** MITRE ATT&CK, Cyber Kill Chain, Diamond Model, NIST CSF 2.0, NIST SP 800-53/61/115, ISO/IEC 27001/27002, CIS Controls v8, OWASP (Top 10, ASVS, WSTG, API Top 10), PTES, OSSTMM.
- **M10 Ética, legalidad y profesionalismo.** Autorización, alcance (scope), reglas de enganche, divulgación responsable, leyes (CFAA, GDPR, leyes locales de delitos informáticos), reporting, confidencialidad, NDA, responsabilidad profesional.
- **M11 Montaje del laboratorio.** Virtualización (VirtualBox/VMware/Proxmox), redes de laboratorio aisladas, Kali/Parrot, objetivos vulnerables, Docker, snapshots, buenas prácticas de aislamiento.
- **M12 Higiene de seguridad personal y OPSEC básica.** Gestores de contraseñas, MFA/passkeys, cifrado de disco, backups, phishing awareness, privacidad, navegación segura.
- **M13 Ingeniería social y factor humano.** Phishing, pretexting, vishing, smishing, tailgating, psicología de la influencia, entrenamiento de concienciación, métricas.

## 4. Etapas 2–12 – Especialización

### Etapa 2 – Hacking web y de aplicaciones (I)
- **M14 Reconocimiento y OSINT.** Pasivo vs activo; WHOIS, DNS (subdominios, zone transfer), certificados (CT logs), Shodan/Censys, Google dorking, GitHub/secretos expuestos, redes sociales, metadatos, wayback; herramientas: amass, subfinder, theHarvester, Maltego, recon-ng. Marco legal del OSINT.
- **M15 Escaneo y enumeración.** Nmap (NSE, evasión básica), masscan, descubrimiento de hosts/servicios, banner grabbing, enumeración SMB/SNMP/LDAP/DNS/NFS/SMTP, escáneres de vulnerabilidades (Nessus/OpenVAS/Nuclei) y su interpretación; falsos positivos.
- **M16 Seguridad web I – OWASP Top 10.** Inyección (SQLi, NoSQLi, command injection, LDAP, SSTI), XSS (reflejado/almacenado/DOM), CSRF, broken access control/IDOR, autenticación y sesiones rotas, misconfiguration, componentes vulnerables, SSRF, deserialización insegura, file upload, path traversal/LFI/RFI, XXE. Herramientas: Burp Suite, ZAP, sqlmap, ffuf, gobuster.
- **M17 Seguridad web II – avanzado.** Request smuggling, cache poisoning/deception, race conditions, prototype pollution, OAuth/OIDC/SAML/JWT, CORS/CSP bypass, clickjacking, WebSockets, lógica de negocio, WAF bypass, HTTP/2-3, técnicas de PortSwigger Research.
- **M18 Seguridad de APIs (REST, GraphQL, gRPC) y móvil.** OWASP API Top 10, BOLA/BFLA, mass assignment, rate limiting, introspección GraphQL; Android/iOS: OWASP MASVS/MASTG, análisis estático/dinámico, Frida, objection, pinning bypass, almacenamiento inseguro.
- **M19 Bug bounty y metodología de caza.** Plataformas, scope, flujo de trabajo, automatización de recon, redacción de reportes, ética y expectativas realistas.

### Etapa 3 – Ataque a infraestructura y redes (I–A)
- **M20 Explotación y Metasploit / frameworks.** Ciclo de explotación, payloads, shells (reverse/bind), listeners, meterpreter, post-explotación básica, pivoting simple, manejo de exploits públicos (ExploitDB, CVE PoCs) con criterio.
- **M21 Ataques de contraseñas y autenticación.** Hashes (NTLM, bcrypt, etc.), hashcat/John, wordlists y reglas, password spraying, credential stuffing, MFA bypass (AiTM, fatiga), gestores y secretos.
- **M22 Escalada de privilegios Linux y Windows.** Enumeración (linpeas/winpeas), misconfigs de servicios, SUID, sudo, kernel, tokens, DLL hijacking, unquoted paths, AlwaysInstallElevated, GTFOBins/LOLBAS.
- **M23 Active Directory ofensivo.** Enumeración (BloodHound, LDAP), Kerberoasting, AS-REP roasting, pass-the-hash/ticket, delegación, ADCS (ESC1–ESC16), DCSync, GPO abuse, trusts, persistencia, movimiento lateral; mitigaciones y tiering.
- **M24 Redes y wireless.** MITM (ARP/DNS spoofing), sniffing, ataques a VLAN/STP, IPv6 (RA/mitm6), Wi-Fi (WPA2/WPA3, evil twin, PMKID), Bluetooth/BLE, protocolos legacy, segmentación.
- **M25 Post-explotación, pivoting y evasión.** Tunelización (chisel, ligolo, SSH), C2 (conceptos y frameworks de laboratorio), técnicas de evasión de AV/EDR a nivel conceptual, AMSI/ETW, LOLBins, limpieza y trazas.
- **M26 Red Team y adversary emulation.** Planificación, TTPs con ATT&CK, Purple Teaming, C2 infra, phishing ops, ejercicios físicos, reglas de enganche, informes ejecutivos; TIBER/CBEST como referencia.

### Etapa 4 – Defensa, detección y respuesta (I–A)
- **M27 Fundamentos de Blue Team y SOC.** Estructura de un SOC (L1/L2/L3), flujo de alertas, SIEM, EDR/XDR, SOAR, NDR, métricas (MTTD/MTTR), playbooks, gestión de casos.
- **M28 Logging y telemetría.** Windows Event IDs clave, Sysmon, auditd, logs de red (Zeek, NetFlow, firewalls, proxies), cloud logs, normalización (ECS/OCSF), retención.
- **M29 SIEM y Detection Engineering.** Splunk/Elastic/Sentinel, consultas (SPL/KQL/EQL), reglas Sigma, YARA, Suricata/Snort, mapeo a ATT&CK, pruebas de detección (Atomic Red Team), tuning de falsos positivos, detección como código.
- **M30 Threat Hunting.** Hipótesis, hunting basado en TTP/IOC/anomalías, baselines, análisis de datos (Jupyter/KQL), frameworks (TaHiTI, PEAK).
- **M31 Respuesta a incidentes.** Ciclo NIST 800-61 / SANS, preparación, contención, erradicación, recuperación, lecciones aprendidas, comunicación en crisis, ransomware playbook, tabletop exercises.
- **M32 Forense digital.** Cadena de custodia, adquisición (disco/memoria), análisis de sistemas de archivos, artefactos Windows (Prefetch, ShimCache, Amcache, MFT, registros, LNK), Linux, navegadores, timelines (Plaso), Volatility, Autopsy, KAPE, forense de red.
- **M33 Cyber Threat Intelligence.** Ciclo de inteligencia, IOC vs TTP, MISP, STIX/TAXII, Diamond Model, atribución y sus límites, informes de inteligencia, fuentes abiertas y comerciales.
- **M34 Hardening y gestión de vulnerabilidades.** CIS Benchmarks, STIG, baseline Linux/Windows, parcheo, gestión de activos, priorización (CVSS+EPSS+KEV), SBOM, gestión de configuración.

### Etapa 5 – Application Security y desarrollo seguro (A)
- **M35 Secure SDLC y modelado de amenazas.** STRIDE, PASTA, LINDDUN, DFDs, OWASP SAMM/BSIMM, requisitos de seguridad (ASVS), security champions.
- **M36 Revisión de código y análisis automatizado.** SAST/DAST/IAST/SCA, Semgrep, CodeQL, revisión manual orientada a patrones, secretos en repos, fuzzing a nivel de aplicación.
- **M37 Seguridad de la cadena de suministro.** Dependencias, typosquatting, SBOM (SPDX/CycloneDX), SLSA, firmado (Sigstore), CI/CD hardening, ataques históricos (SolarWinds, xz, etc.).

### Etapa 6 – Cloud, contenedores y DevSecOps (A)
- **M38 Seguridad en la nube (AWS/Azure/GCP).** Modelo de responsabilidad compartida, IAM, políticas, almacenamiento expuesto, metadata services (IMDSv2), logging (CloudTrail etc.), CSPM, ataques típicos (escalada IAM, SSRF→credenciales), Prowler/ScoutSuite/Pacu.
- **M39 Contenedores y Kubernetes.** Namespaces/cgroups/seccomp/AppArmor, escapes, imágenes seguras, RBAC, network policies, admission control (OPA/Kyverno), runtime security (Falco), CIS Kubernetes, ataques a clústeres.
- **M40 Infraestructura como código y DevSecOps.** Terraform/CloudFormation scanning (Checkov, tfsec), pipelines seguros, gestión de secretos (Vault), policy as code.
- **M41 Zero Trust, identidad y SSO.** IAM/IGA/PAM, federación, MFA resistente a phishing (FIDO2/passkeys), ZTNA, microsegmentación.

### Etapa 7 – Ingeniería inversa, malware y vulnerability research (A–E)
- **M42 Ensamblador y arquitectura (x86-64, ARM).** Registros, stack, calling conventions, ELF/PE, linking/loaders.
- **M43 Ingeniería inversa.** Ghidra/IDA/radare2, depuradores (gdb/pwndbg, x64dbg, WinDbg), decompilación, ofuscación, anti-debug, reversing en .NET/Java/Go/Rust.
- **M44 Análisis de malware.** Análisis estático y dinámico, sandboxing, unpacking, familias (ransomware, stealers, loaders, RATs), comportamiento de red, YARA, informes.
- **M45 Explotación binaria.** Buffer overflow, format strings, ROP, protecciones (ASLR, DEP/NX, canaries, CFI, PIE), heap exploitation, use-after-free, kernel exploitation, shellcoding.
- **M46 Vulnerability research y fuzzing.** AFL++/libFuzzer, análisis diferencial de parches (patch diffing), triage de crashes, divulgación coordinada, CVE.

### Etapa 8 – Gobierno, riesgo y arquitectura (A–E)
- **M47 Gestión de riesgos.** Metodologías (ISO 27005, NIST RMF, FAIR), registro de riesgos, apetito, tratamiento, métricas.
- **M48 Cumplimiento y auditoría.** ISO 27001, SOC 2, PCI DSS 4.0, HIPAA, GDPR/leyes locales, NIS2/DORA, auditorías y evidencias.
- **M49 Arquitectura de seguridad.** Diseño seguro de redes/sistemas, segmentación, SABSA, patrones de referencia, seguridad en la nube híbrida, OT/ICS (Purdue, IEC 62443).
- **M50 Continuidad y resiliencia.** BCP/DRP, backups inmutables, RTO/RPO, ejercicios de crisis.
- **M51 Seguridad de IA/ML y LLMs.** OWASP Top 10 LLM, prompt injection, data poisoning, model extraction, MITRE ATLAS, seguridad de agentes y de la cadena de suministro de modelos, uso de IA en ataque y defensa.
- **M52 Liderazgo y comunicación.** Reportes técnicos y ejecutivos, presupuesto, cultura de seguridad, gestión de equipos, carrera y certificaciones.

### Temas transversales (módulos cortos o apéndices)
IoT/embedded/hardware hacking (UART/JTAG/SPI, firmware), OT/ICS/SCADA, seguridad automotriz y médica, seguridad física, privacidad e ingeniería de privacidad, criptografía avanzada (ZK, protocolos, PQC), blockchain/smart contracts, seguridad de correo (SPF/DKIM/DMARC), DoS/DDoS (defensa), anti-fraude.

---

## 5. Proceso para construir cada módulo

Cada módulo se desarrolla con este flujo (skill `build-module`):

1. **Investigación profunda y actual.** Fuentes primarias: estándares oficiales (NIST, MITRE, OWASP, RFCs, CIS), documentación de herramientas, investigación de PortSwigger/Project Zero/Mandiant/Microsoft/CrowdStrike, informes anuales (Verizon DBIR, M-Trends), CVEs/KEV recientes, charlas (DEF CON, Black Hat, USENIX), papers. Registrar fuente + fecha en `content/modules/<id>/fuentes.md`.
2. **Síntesis condensada.** Teoría en capas: *Resumen en 5 min → Concepto → Cómo funciona → Cómo se ataca → Cómo se defiende → Errores comunes → Referencias*. Sin relleno; ejemplos concretos; diagramas.
3. **Laboratorios y retos.** Mínimo: 2 labs guiados + 3 retos de dificultad creciente (con skill `add-challenge`), todos en contenedores aislados. Pistas escalonadas y writeup oficial.
4. **Evaluación.** Quiz (preguntas con explicación) + reto final. Criterios de dominio por módulo.
5. **Metadatos.** Nivel, prerrequisitos, tiempo estimado, herramientas (`add-tool`), mapeo a ATT&CK/OWASP/NIST/certificaciones, fecha de última revisión.
6. **Revisión.** Exactitud técnica, ética (sin guía operativa contra objetivos reales; todo en laboratorio), seguridad de los retos (`security-reviewer`).
7. **Mantenimiento.** Cada módulo tiene `ultima_revision`; revisión al menos cada 6 meses o ante cambios mayores (nuevas CVEs, versiones de estándares).

## 6. Orden de construcción propuesto en la app

1. **Sprint 0:** modelo de datos de módulos/lecciones (ver `docs/architecture.md`), renderizado Markdown, progreso.
2. **Primeros módulos (cimientos):** M08, M10, M11, M02, M04 (con su primer lab/reto).
3. **Web ofensiva:** M07 → M14 → M15 → M16 (primer bloque de retos reales).
4. Luego Etapa 3 y la ruta Blue Team en paralelo; después especializaciones según demanda.

## 7. Alineación con certificaciones (orientativa, verificar vigencia al construir cada módulo)

Fundamentos: CompTIA Security+/Network+, ISC2 CC. Ofensiva: eJPT, PNPT, OSCP, CPTS, OSEP, OSWE, CRTO. Defensa: Security+, CySA+, BTL1, GCIH, GCIA, GCFA, GCFE. Cloud: AWS/Azure/GCP Security. GRC: CISSP, CISM, CISA, CRISC. Malware/RE: GREM. Las certificaciones son una referencia de cobertura, no el objetivo del contenido.
