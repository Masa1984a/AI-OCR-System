import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseBoolPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { ImportUsersDto, ImportUsersResponseDto } from './dto/import-users.dto';
import { ChangeUserPasswordDto } from './dto/change-user-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(
    @CurrentUser() currentUser: User,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('role', new ParseEnumPipe(UserRole, { optional: true })) role?: UserRole,
    @Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean,
  ) {
    return this.usersService.findAll(
      currentUser.tenantId,
      page || 1,
      limit || 10,
      search,
      role,
      isActive,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.usersService.findOne(id, currentUser.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.usersService.create(createUserDto, currentUser.id, currentUser.tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.usersService.update(id, updateUserDto, currentUser.id, currentUser.tenantId);
  }

  @Patch(':id/password')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changePasswordDto: ChangeUserPasswordDto,
    @CurrentUser() currentUser: User,
  ) {
    await this.usersService.changePassword(
      id,
      changePasswordDto,
      currentUser.id,
      currentUser.tenantId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.usersService.remove(id, currentUser.id, currentUser.tenantId);
  }

  @Post('invite')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async invite(
    @Body() inviteUserDto: InviteUserDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.usersService.invite(inviteUserDto, currentUser.id, currentUser.tenantId);
  }

  @Post('import')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async importUsers(
    @Body() importUsersDto: ImportUsersDto,
    @CurrentUser() currentUser: User,
  ): Promise<ImportUsersResponseDto> {
    return this.usersService.importUsers(importUsersDto, currentUser.id, currentUser.tenantId);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.usersService.toggleActive(id, currentUser.id, currentUser.tenantId);
  }

  @Get('roles/list')
  @Roles(UserRole.ADMIN)
  async getRoles() {
    return Object.values(UserRole).map(role => ({
      value: role,
      label: this.getRoleLabel(role),
    }));
  }

  private getRoleLabel(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return '管理者';
      case UserRole.MANAGER:
        return '部長';
      case UserRole.SUPERVISOR:
        return '係長';
      case UserRole.EDITOR:
        return '編集者';
      case UserRole.VIEWER:
        return '閲覧者';
      default:
        return role;
    }
  }
}