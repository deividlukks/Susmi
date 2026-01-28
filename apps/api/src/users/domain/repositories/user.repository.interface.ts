import { UserEntity } from '../entities/user.entity';

/**
 * User Repository Interface
 *
 * APLICA DIP: Domínio define interface, infraestrutura implementa.
 */
export interface IUserRepository {
  /**
   * Busca usuário por ID
   */
  findById(id: string): Promise<UserEntity | null>;

  /**
   * Busca usuário por email
   */
  findByEmail(email: string): Promise<UserEntity | null>;

  /**
   * Cria novo usuário
   */
  create(user: UserEntity): Promise<UserEntity>;

  /**
   * Atualiza usuário
   */
  update(user: UserEntity): Promise<UserEntity>;

  /**
   * Verifica se email já existe
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Busca ou cria usuário (para OAuth)
   */
  findOrCreate(data: {
    id: string;
    email: string;
    name?: string;
  }): Promise<UserEntity>;
}
