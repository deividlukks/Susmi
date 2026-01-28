import {
    Controller,
    Get,
    Put,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('profile')
    @ApiOperation({ summary: 'Obter perfil do usuário' })
    async getProfile(@Request() req: any) {
        return this.usersService.findById(req.user.id);
    }

    @Put('profile')
    @ApiOperation({ summary: 'Atualizar perfil do usuário' })
    async updateProfile(@Request() req: any, @Body() updateDto: UpdateUserDto) {
        return this.usersService.update(req.user.id, updateDto);
    }

    @Get('preferences')
    @ApiOperation({ summary: 'Obter preferências do usuário' })
    async getPreferences(@Request() req: any) {
        const user = await this.usersService.findById(req.user.id);
        return user?.preferences;
    }

    @Put('preferences')
    @ApiOperation({ summary: 'Atualizar preferências do usuário' })
    async updatePreferences(
        @Request() req: any,
        @Body() updateDto: UpdatePreferencesDto,
    ) {
        return this.usersService.updatePreferences(req.user.id, updateDto);
    }
}
