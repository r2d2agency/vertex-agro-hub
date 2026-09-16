import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FarmsImportService } from './farms-import.service';
import { CommitImportDto, PreviewImportDto } from './dto';

// Preview também exige RolesGuard (não só leitura) porque a resolução de
// monitor expõe nome/e-mail de pessoas da empresa candidatas ao vínculo.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('farms/import')
export class FarmsImportController {
  constructor(private readonly svc: FarmsImportService) {}

  @Post('preview')
  preview(@Req() req: any, @Body() dto: PreviewImportDto) {
    return this.svc.preview(req.user.sub, dto);
  }

  @Post('commit')
  commit(@Req() req: any, @Body() dto: CommitImportDto) {
    return this.svc.commit(req.user.sub, dto);
  }
}
