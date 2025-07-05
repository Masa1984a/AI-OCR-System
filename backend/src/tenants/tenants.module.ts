import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { Tenant } from '../entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService], // Export so other modules can use it
})
export class TenantsModule {}