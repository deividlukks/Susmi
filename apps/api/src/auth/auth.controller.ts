import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CheckEmailDto } from './dto/check-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('check-email')
    @ApiOperation({ summary: 'Verificar se email existe (Etapa 1 do login)' })
    async checkEmail(@Body() checkEmailDto: CheckEmailDto) {
        return this.authService.checkEmail(checkEmailDto.email);
    }

    @Post('login')
    @ApiOperation({ summary: 'Login do usuário (Etapa 2 do login)' })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('register')
    @ApiOperation({ summary: 'Registro de novo usuário' })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obter usuário atual' })
    async me(@Request() req: any) {
        return req.user;
    }
}
