import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      return false;
    }

    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: true },
    });

    const roleNames = roles.map((r) => r.role);

    // Superadmin sempre tem acesso
    if (roleNames.includes('admin_global')) {
      return true;
    }

    // Rotas administrativas exigem admin_global, admin_empresa ou gestor
    const adminRoles = ['admin_empresa', 'gestor'];
    const hasAdminRole = roleNames.some((r) => adminRoles.includes(r as string));

    if (!hasAdminRole) {
      throw new ForbiddenException(
        'Acesso negado: Perfil sem permissões administrativas.',
      );
    }

    return true;
  }
}
