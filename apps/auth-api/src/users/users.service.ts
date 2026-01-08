import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "@common/entities/user.entity";
import { OutboxService } from "../outbox/outbox.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    private outbox: OutboxService
  ) { }

  findAll() {
    return this.repo.find({ select: ["id", "email", "is_active", "created_at", "updated_at"] });
  }

  async deactivate(id: string, requestId: string) {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException("User not found");
    u.is_active = false;
    u.updated_at = new Date();
    await this.repo.save(u);

    await this.outbox.enqueue("Auth.UserDeactivated", { userId: u.id }, requestId);
    return { ok: true };
  }
}