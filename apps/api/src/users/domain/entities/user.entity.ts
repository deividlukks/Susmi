/**
 * User Domain Entity
 *
 * Encapsula lógica de negócio do usuário.
 * APLICA SRP: Não lida com password hash (delegado para PasswordUtil).
 */
export class UserEntity {
  constructor(
    public readonly id: string,
    private email: string,
    private name: string | null,
    private avatarUrl: string | null,
    private passwordHash: string | null,
    public readonly role: 'USER' | 'ADMIN',
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  // Domain Behaviors

  /**
   * Atualiza nome do usuário
   */
  updateName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Nome não pode ser vazio');
    }
    this.name = newName.trim();
  }

  /**
   * Atualiza avatar
   */
  updateAvatar(newAvatarUrl: string | null): void {
    this.avatarUrl = newAvatarUrl;
  }

  /**
   * Atualiza hash da senha
   * @internal Usado apenas pelo repository após hash
   */
  setPasswordHash(hash: string): void {
    this.passwordHash = hash;
  }

  /**
   * Verifica se usuário tem senha configurada
   */
  hasPassword(): boolean {
    return this.passwordHash !== null;
  }

  /**
   * Verifica se é admin
   */
  isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  /**
   * Valida se email é válido (formato básico)
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Getters

  getEmail(): string {
    return this.email;
  }

  getName(): string | null {
    return this.name;
  }

  getAvatarUrl(): string | null {
    return this.avatarUrl;
  }

  getPasswordHash(): string | null {
    return this.passwordHash;
  }

  /**
   * Converte entidade para objeto plano (sem senha)
   */
  toPlainObject(includePasswordHash = false) {
    const obj: any = {
      id: this.id,
      email: this.email,
      name: this.name,
      avatarUrl: this.avatarUrl,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    if (includePasswordHash) {
      obj.passwordHash = this.passwordHash;
    }

    return obj;
  }
}
