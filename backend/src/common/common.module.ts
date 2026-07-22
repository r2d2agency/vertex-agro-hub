import { Global, Module } from '@nestjs/common';
import { CompanyAccess } from './company-access';

@Global()
@Module({
  providers: [CompanyAccess],
  exports: [CompanyAccess],
})
export class CommonModule {}
