import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ModuleEntity } from "@common/entities/module.entity";

@Injectable()
export class ModulesService {
  constructor(@InjectRepository(ModuleEntity) private repo: Repository<ModuleEntity>) {}

  list() {
    return this.repo.find();
  }

  create(input: { name: string; path: string; description?: string }) {
    const m = this.repo.create({
      name: input.name,
      path: input.path,
      description: input.description ?? null
    });
    return this.repo.save(m);
  }
}