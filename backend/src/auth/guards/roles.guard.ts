import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // ロール階層定義（上位ロールは下位ロールの権限を持つ）
  private readonly roleHierarchy = {
    [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPERVISOR, UserRole.EDITOR, UserRole.VIEWER],
    [UserRole.MANAGER]: [UserRole.MANAGER, UserRole.SUPERVISOR, UserRole.EDITOR, UserRole.VIEWER],
    [UserRole.SUPERVISOR]: [UserRole.SUPERVISOR, UserRole.EDITOR, UserRole.VIEWER],
    [UserRole.EDITOR]: [UserRole.EDITOR, UserRole.VIEWER],
    [UserRole.VIEWER]: [UserRole.VIEWER],
  };

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      return false;
    }

    // ユーザーのロールが持つ権限（階層を考慮）
    const userPermissions = this.roleHierarchy[user.role] || [user.role];

    // 必要なロールのいずれかをユーザーが持っているかチェック
    return requiredRoles.some((role) => userPermissions.includes(role));
  }
}