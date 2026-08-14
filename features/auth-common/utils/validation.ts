/**
 * Validaciones client-side que espejan las reglas del Auth Service backend
 * (política de Identity + DataAnnotations de los request DTOs).
 *
 * Contrato del backend (coppAddresdBack):
 * - Política de contraseñas: min 8, dígito, minúscula, mayúscula, no
 *   alfanumérico.
 * - CreateUserRequest: Email requerido + formato válido; Password requerido +
 *   min 8; FirstName/LastName requeridos + max 100.
 * - CreateRoleRequest: Name requerido + max 100; Description max 500.
 *
 * Los errores del backend llegan como 400 `{ message }`, a veces con varias
 * reglas de Identity en un solo string separado por ", ".
 */

/** Lista de reglas de contraseña incumplidas, en el orden del backend. */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Debe tener al menos 8 caracteres");
  }
  if (!/\d/.test(password)) {
    errors.push("Debe incluir un número");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Debe incluir una minúscula");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Debe incluir una mayúscula");
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("Debe incluir un carácter especial (ej. @, #, !)");
  }

  return errors;
}

export interface UserValidationValues {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** En edición el backend no actualiza la contraseña: no se valida. */
  isEditing?: boolean;
}

export interface UserFieldErrors {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida el form de usuario. Devuelve un Record por campo con el mensaje de
 * error (string vacío = campo válido). Para la contraseña se unen todas las
 * reglas incumplidas con saltos de línea (se renderizan bajo el input).
 */
export function validateUserForm(values: UserValidationValues): UserFieldErrors {
  const errors: UserFieldErrors = {
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  };

  const email = values.email.trim();
  if (!email) {
    errors.email = "Email es requerido";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Email inválido";
  }

  if (!values.isEditing) {
    const passwordErrors = validatePassword(values.password);
    if (passwordErrors.length > 0) {
      errors.password = passwordErrors.join("\n");
    }
  }

  const firstName = values.firstName.trim();
  if (!firstName) {
    errors.firstName = "El nombre es requerido";
  } else if (firstName.length > 100) {
    errors.firstName = "El nombre no puede superar los 100 caracteres";
  }

  const lastName = values.lastName.trim();
  if (!lastName) {
    errors.lastName = "El apellido es requerido";
  } else if (lastName.length > 100) {
    errors.lastName = "El apellido no puede superar los 100 caracteres";
  }

  return errors;
}

export interface RoleValidationValues {
  name: string;
  description: string;
}

export interface RoleFieldErrors {
  name: string;
  description: string;
}

/** Valida el form de rol (Create/UpdateRoleRequest). */
export function validateRoleForm(values: RoleValidationValues): RoleFieldErrors {
  const errors: RoleFieldErrors = { name: "", description: "" };

  const name = values.name.trim();
  if (!name) {
    errors.name = "El nombre del rol es requerido";
  } else if (name.length > 100) {
    errors.name = "El nombre del rol no puede superar los 100 caracteres";
  }

  if (values.description.trim().length > 500) {
    errors.description = "La descripción no puede superar los 500 caracteres";
  }

  return errors;
}

/**
 * Divide un mensaje de error del backend en una lista. Los 400 de Identity
 * pueden traer varias reglas en un solo string separado por ", "; los
 * mensajes custom (ej. "Email ya está registrado") quedan como un solo item.
 */
export function splitBackendErrors(message: string): string[] {
  return message
    .split(", ")
    .map((item) => item.trim())
    .filter(Boolean);
}
