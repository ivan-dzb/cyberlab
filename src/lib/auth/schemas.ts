import { z } from "zod";

export const email = z.string().trim().toLowerCase().email().max(254);
// Mínimo 10 caracteres (NIST SP 800-63B recomienda longitud sobre reglas de composición). Máx. evita DoS por hashing.
export const password = z.string().min(10).max(128);

export const registerSchema = z.object({ email, password, acceptTerms: z.literal(true) });
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
