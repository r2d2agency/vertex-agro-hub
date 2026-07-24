import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('ai/config')
  getConfig(@Req() req: any, @Query('companyId') companyId: string) {
    return this.ai.getConfig(req.user.userId, companyId);
  }
  @Patch('ai/config')
  updateConfig(@Req() req: any, @Query('companyId') companyId: string, @Body() dto: any) {
    return this.ai.updateConfig(req.user.userId, companyId, dto);
  }
  @Post('ai/config/test')
  testConfig(@Req() req: any, @Body() dto: { companyId: string; provider?: string; model?: string; apiKey?: string; useEnvKey?: boolean }) {
    return this.ai.testConfig(req.user.userId, dto.companyId, dto as any);
  }

  @Get('ai/insights')
  listInsights(@Req() req: any, @Query('companyId') companyId: string) {
    return this.ai.listInsights(req.user.userId, companyId);
  }
  @Post('ai/insights/generate')
  generateInsights(@Req() req: any, @Body() dto: { companyId: string }) {
    return this.ai.generateInsights(req.user.userId, dto.companyId);
  }
  @Patch('ai/insights/:id/ack')
  ack(@Req() req: any, @Param('id') id: string) {
    return this.ai.ackInsight(req.user.userId, id);
  }

  @Post('ai/chat')
  chat(@Req() req: any, @Body() dto: { companyId: string; messages: Array<{ role: 'user' | 'assistant'; content: string }> }) {
    return this.ai.chat(req.user.userId, dto.companyId, dto.messages as any);
  }

  @Post('ai/forecast')
  forecast(@Req() req: any, @Body() dto: { companyId: string; horizonDays?: number }) {
    return this.ai.forecast(req.user.userId, dto.companyId, dto.horizonDays ?? 30);
  }
  @Get('ai/forecast')
  listForecasts(@Req() req: any, @Query('companyId') companyId: string) {
    return this.ai.listForecasts(req.user.userId, companyId);
  }

  @Get('action-plans')
  listPlans(@Req() req: any, @Query('companyId') companyId: string) {
    return this.ai.listPlans(req.user.userId, companyId);
  }
  @Post('action-plans')
  createPlan(@Req() req: any, @Body() dto: any) {
    return this.ai.createPlan(req.user.userId, dto);
  }
  @Patch('action-plans/:id')
  updatePlan(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.ai.updatePlan(req.user.userId, id, dto);
  }
  @Delete('action-plans/:id')
  deletePlan(@Req() req: any, @Param('id') id: string) {
    return this.ai.deletePlan(req.user.userId, id);
  }
  @Post('action-plans/from-insight/:insightId')
  fromInsight(@Req() req: any, @Param('insightId') insightId: string) {
    return this.ai.generatePlansFromInsight(req.user.userId, insightId);
  }

  @Post('ai/photos/:id/analyze')
  analyzePhoto(@Req() req: any, @Param('id') id: string) {
    return this.ai.analyzePhoto(req.user.userId, id);
  }
}
