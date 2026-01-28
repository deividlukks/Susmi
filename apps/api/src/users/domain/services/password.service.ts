import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * Password Service - Domain Service
 *
 * RESPONSABILIDADE: Gestão de senhas (hashing, validação)
 * Elimina violação SRP - separado do UsersService
 */
@Injectable()
export class PasswordService {
    private readonly SALT_ROUNDS = 10;

    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }

    async validate(password: string, hash: string | null): Promise<boolean> {
        if (!hash) {
            return false;
        }
        return bcrypt.compare(password, hash);
    }

    async validateUser(user: { passwordHash: string | null }, password: string): Promise<boolean> {
        return this.validate(password, user.passwordHash);
    }

    isStrongPassword(password: string): boolean {
        // Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número
        const minLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);

        return minLength && hasUpperCase && hasLowerCase && hasNumber;
    }

    generateRandomPassword(length: number = 12): string {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }

        return password;
    }
}
