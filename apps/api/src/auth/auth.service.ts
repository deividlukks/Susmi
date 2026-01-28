import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async checkEmail(email: string) {
        const user = await this.usersService.findByEmail(email);

        if (!user) {
            return {
                exists: false,
                message: 'Email não encontrado. Deseja criar uma conta?',
            };
        }

        return {
            exists: true,
            userName: user.name || undefined,
            message: 'Email encontrado. Digite sua senha para continuar.',
        };
    }

    async login(loginDto: LoginDto) {
        const user = await this.usersService.findByEmail(loginDto.email);
        if (!user) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const isPasswordValid = await this.usersService.validatePassword(user, loginDto.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            accessToken: this.jwtService.sign(payload),
        };
    }

    async register(registerDto: RegisterDto) {
        const existingUser = await this.usersService.findByEmail(registerDto.email);
        if (existingUser) {
            throw new ConflictException('Email já cadastrado');
        }

        const user = await this.usersService.create({
            email: registerDto.email,
            password: registerDto.password,
            name: registerDto.name,
        });

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            accessToken: this.jwtService.sign(payload),
        };
    }

    async validateToken(token: string) {
        try {
            const payload = this.jwtService.verify(token);
            const user = await this.usersService.findById(payload.sub);
            return user;
        } catch {
            throw new UnauthorizedException('Token inválido');
        }
    }
}
