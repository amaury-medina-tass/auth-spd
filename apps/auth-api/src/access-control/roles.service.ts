import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Role } from "@common/entities/role.entity";
import { RolePermission } from "@common/entities/role-permission.entity";
import { OutboxService } from "../outbox/outbox.service";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roles: Repository<Role>,
    @InjectRepository(RolePermission) private rolePerms: Repository<RolePermission>,
    private outbox: OutboxService
  ) { }

  list() {
    return this.roles.find();
  }

  async create(input: { name: string; description?: string }) {
    const role = this.roles.create({
      name: input.name,
      description: input.description ?? null,
      is_active: true
    });
    return this.roles.save(role);
  }

  async setRolePermissions(
    roleId: string,
    permissionIdsAllowed: Array<{ permissionId: string; allowed: boolean }>,
    requestId: string
  ) {
    const role = await this.roles.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException("Role not found");

    for (const p of permissionIdsAllowed) {
      await this.rolePerms.upsert(
        {
          role_id: roleId,
          permission_id: p.permissionId,
          allowed: p.allowed,
          updated_at: new Date()
        },
        ["role_id", "permission_id"]
      );
    }

    await this.outbox.enqueue("Auth.RolePermissionsChanged", { roleId }, requestId);
    return { ok: true };
  }
}