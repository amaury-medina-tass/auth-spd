import { Module } from "@nestjs/common";
import { AuditController } from "./audit.controller";
import { AuditQueryService } from "./audit-query.service";
import { AuthModule } from "../auth/auth.module";

@Module({
    imports: [AuthModule],
    controllers: [AuditController],
    providers: [AuditQueryService],
    exports: [AuditQueryService]
})
export class AuditModule { }
