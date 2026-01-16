import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    users: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    role: UserRole.USER,
    avatar: null,
    timezone: 'America/Sao_Paulo',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
        role: UserRole.USER,
      };

      mockPrismaService.users.findUnique.mockResolvedValue(null);
      mockPrismaService.users.create.mockResolvedValue(mockUser);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await service.create(createUserDto);

      expect(mockPrismaService.users.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 'salt');
      expect(mockPrismaService.users.create).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if user already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'password123',
        role: UserRole.USER,
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [mockUser];
      mockPrismaService.users.findMany.mockResolvedValue(users);

      const result = await service.findAll(0, 10);

      expect(mockPrismaService.users.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(users);
    });
  });

  describe('count', () => {
    it('should return the count of users', async () => {
      mockPrismaService.users.count.mockResolvedValue(5);

      const result = await service.count();

      expect(mockPrismaService.users.count).toHaveBeenCalled();
      expect(result).toBe(5);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('123');

      expect(mockPrismaService.users.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should call findOne', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(mockUser);

      const result = await service.findById('123');

      expect(findOneSpy).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(mockPrismaService.users.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, name: 'Updated Name' };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue(updatedUser);

      const result = await service.update('123', updateUserDto);

      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: updateUserDto,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should hash password if provided in update', async () => {
      const updateUserDto = { password: 'newpassword' };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue(mockUser);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');

      await service.update('123', updateUserDto);

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 'salt');
      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { password: 'hashedNewPassword' },
      });
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.delete.mockResolvedValue(mockUser);

      const result = await service.remove('123');

      expect(mockPrismaService.users.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeByEmail', () => {
    it('should delete a user by email', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.delete.mockResolvedValue(mockUser);

      const result = await service.removeByEmail('test@example.com');

      expect(mockPrismaService.users.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrismaService.users.delete).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.removeByEmail('notfound@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
