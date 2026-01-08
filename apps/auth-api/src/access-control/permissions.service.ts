import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Permission } from "@common/entities/permission.entity";
import { ModuleEntity } from "@common/entities/module.entity";
import { ActionEntity } from "@common/entities/action.entity";

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission) private perms: Repository<Permission>,
    @InjectRepository(ModuleEntity) private modules: Repository<ModuleEntity>,
    @InjectRepository(ActionEntity) private actions: Repository<ActionEntity>
  ) {}

  list() {
    return this.perms.find({ relations: ["module", "action"] });
  }

  async create(input: { moduleId: string; actionId: string }) {
    const m = await this.modules.findOne({ where: { id: input.moduleId } });
    const a = await this.actions.findOne({ where: { id: input.actionId } });
    if (!m || !a) throw new BadRequestException("Invalid module/action");

    const p = this.perms.create({ module_id: m.id, action_id: a.id });
    return this.perms.save(p);
  }
}