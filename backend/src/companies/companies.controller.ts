import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly svc: CompaniesService) {}

  @Get()
  list(@Req() req: any) {
    return this.svc.list(req.user.sub);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getOne(req.user.sub, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateCompanyDto) {
    return this.svc.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.svc.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.softDelete(req.user.sub, id);
  }
}
