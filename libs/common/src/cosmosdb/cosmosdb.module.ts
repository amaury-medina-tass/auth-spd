import { Module, Global, DynamicModule } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CosmosClient, Database } from "@azure/cosmos";
import * as https from "https";
import { AuditLogService, COSMOS_DATABASE, COSMOS_CONTAINER_NAME } from "./audit-log.service";

export const COSMOS_CORE_CONTAINER_NAME = "COSMOS_CORE_CONTAINER_NAME";

@Global()
@Module({})
export class CosmosDbModule {
    static forRootAsync(): DynamicModule {
        return {
            module: CosmosDbModule,
            providers: [
                {
                    provide: COSMOS_DATABASE,
                    useFactory: async (configService: ConfigService): Promise<Database> => {
                        const endpoint = configService.get<string>("cosmosDb.endpoint");
                        const key = configService.get<string>("cosmosDb.key");
                        const databaseName = configService.get<string>("cosmosDb.databaseName");
                        const disableSsl = configService.get<string>("cosmosDb.disableSslVerification") === "true";

                        if (!endpoint || !key || !databaseName) {
                            console.warn("[CosmosDB] Configuration missing, audit logging disabled");
                            return null as any;
                        }

                        // Para el emulador local, deshabilitar verificación SSL
                        const agent = disableSsl
                            ? new https.Agent({ rejectUnauthorized: false })
                            : undefined;

                        const client = new CosmosClient({
                            endpoint,
                            key,
                            agent,
                            connectionPolicy: {
                                enableEndpointDiscovery: false
                            }
                        });

                        // Crear base de datos si no existe
                        try {
                            const { database } = await client.databases.createIfNotExists({ id: databaseName });
                            console.log(`[CosmosDB] Connected to database: ${databaseName}`);
                            return database;
                        } catch (error) {
                            console.warn(`[CosmosDB] Could not connect (${(error as Error).message}). Audit logging disabled.`);
                            return null as any;
                        }
                    },
                    inject: [ConfigService]
                },
                {
                    provide: COSMOS_CONTAINER_NAME,
                    useFactory: (configService: ConfigService): string => {
                        return configService.get<string>("cosmosDb.containerName") || "audit_logs";
                    },
                    inject: [ConfigService]
                },
                {
                    provide: COSMOS_CORE_CONTAINER_NAME,
                    useFactory: (configService: ConfigService): string => {
                        return configService.get<string>("cosmosDb.coreContainerName") || "core_logs";
                    },
                    inject: [ConfigService]
                },
                AuditLogService
            ],
            exports: [COSMOS_DATABASE, COSMOS_CONTAINER_NAME, COSMOS_CORE_CONTAINER_NAME, AuditLogService]
        };
    }
}
