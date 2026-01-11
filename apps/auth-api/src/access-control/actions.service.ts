import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActionEntity } from "@common/entities/action.entity";

@Injectable()
export class ActionsService {
  constructor(@InjectRepository(ActionEntity) private repo: Repository<ActionEntity>) { }

  list(system?: string) {
    // Return global actions (system = PUBLIC) + actions for the specified system
    if (system) {
      return this.repo
        .createQueryBuilder("action")
        .where("action.system = 'PUBLIC' OR action.system = :system", { system })
        .getMany();
    }
    return this.repo.find();
  }

  create(input: { code_action: string; name: string; description?: string; system?: "PUBLIC" | "DAGRD" | "SICGEM" }) {
    const a = this.repo.create({
      code_action: input.code_action,
      name: input.name,
      description: input.description ?? null,
      system: input.system ?? "PUBLIC"
    });
    return this.repo.save(a);
  }
}
