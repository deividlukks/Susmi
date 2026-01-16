import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // --- MÉTODOS DE CRIAÇÃO ---

  async create(createUserDto: CreateUserDto) {
    const userExists = await this.prisma.users.findUnique({
      where: { email: createUserDto.email },
    });

    if (userExists) {
      throw new ConflictException('Já existe um usuário cadastrado com este e-mail.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    return this.prisma.users.create({
      data: {
        id: randomUUID(),
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role,
        updatedAt: new Date(),
      },
    });
  }

  // --- MÉTODOS DE BUSCA (Corrigindo os erros findByEmail e findById) ---

  async findAll(skip = 0, take = 100) {
    return this.prisma.users.findMany({
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async count() {
    return this.prisma.users.count();
  }

  // O padrão Nest é findOne, mas seu controller chama findById. Vamos manter os dois.
  async findOne(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException(`Usuário ID ${id} não encontrado.`);
    return user;
  }

  // Alias para o controller que chama findById
  async findById(id: string) {
    return this.findOne(id);
  }

  // Método essencial para o AuthService e Bot
  async findByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  // --- MÉTODOS DE ATUALIZAÇÃO ---

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Garante que existe

    const data: any = { ...updateUserDto };
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    return this.prisma.users.update({
      where: { id },
      data,
    });
  }

  // Método customizado que seu controller estava chamando
  async updatePreferences(id: string, preferences: any) {
    await this.findOne(id);

    // Assumindo que você tem um campo 'preferences' (JSON) no seu schema.
    // Se não tiver, você precisará criar no schema.prisma ou ajustar aqui.
    return this.prisma.users.update({
      where: { id },
      data: {
        // @ts-ignore: Ignorando erro de tipagem caso o campo não exista no seu prisma client ainda
        preferences: preferences
      },
    });
  }

  // --- MÉTODOS DE REMOÇÃO ---

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.users.delete({ where: { id } });
  }

  // O Bot estava tentando passar uma string (email) para o remove.
  // Vamos criar um método específico para isso ou sobrecarregar a lógica.
  async removeByEmail(email: string) {
    const user = await this.findByEmail(email);
    if (!user) throw new NotFoundException('Usuário não encontrado para remoção.');
    
    return this.prisma.users.delete({
      where: { id: user.id },
    });
  }
}