import * as bcrypt from 'bcrypt';

/**
 * Password Utility - Centraliza lógica de hash de senhas
 *
 * ELIMINA DUPLICAÇÃO: Lógica de bcrypt estava em 2+ lugares
 * APLICA SRP: Separar responsabilidade de criptografia do UserService
 */
export class PasswordUtil {
  private static readonly SALT_ROUNDS = 10;

  /**
   * Gera hash de uma senha
   * @param password - Senha em texto plano
   * @returns Hash da senha
   */
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compara senha com hash
   * @param password - Senha em texto plano
   * @param hash - Hash armazenado
   * @returns true se senha é válida
   */
  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Valida força da senha
   * @param password - Senha a validar
   * @returns true se senha é forte
   */
  static validateStrength(password: string): boolean {
    // Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return minLength && hasUpperCase && hasLowerCase && hasNumber;
  }
}
