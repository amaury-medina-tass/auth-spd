import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ActionEntity } from "@common/entities/action.entity";

@Injectable()
export class ActionsService {
  constructor(@InjectRepository(ActionEntity) private repo: Repository<ActionEntity>) {}

  list() {
    return this.repo.find();
  }

  create(input: { name: string; description?: string }) {
    const a = this.repo.create({ name: input.name, description: input.description ?? null });
    return this.repo.save(a);
  }
}