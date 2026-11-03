import { getFieldMe, listFieldTapperPlots, listFieldTappers, listFieldTapperTables, listFieldTappingTables } from "@/lib/field.functions";
import { listTappingRecords, listTappingSummary, listTappingTasks } from "@/lib/sangrias.functions";
import { getTapperRotation } from "@/lib/tappers.functions";
import { listFuelTanks } from "@/lib/frota-ops.functions";
import { listImplements, listMachines, listOperationTypes, listOperators } from "@/lib/frota.functions";
import { getLocalIsoDate } from "@/lib/date-utils";

type Job<T> = { label: string; run: () => Promise<T> };

async function runJobs<T>(jobs: Job<T>[], concurrency = 4) {
  const values: Array<T | undefined> = new Array(jobs.length);
  const errors: string[] = [];
  let next = 0;

  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
    while (true) {
      const index = next++;
      const job = jobs[index];
      if (!job) return;
      try {
        values[index] = await job.run();
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        errors.push(`${job.label}: ${detail}`);
      }
    }
  }));

  return { values, errors };
}

export async function prepareFieldOfflineData() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Conecte-se à internet para baixar os dados de uso offline.");
  }

  const me = await getFieldMe();
  const farms = me.assignments.map(({ farm }) => farm);
  const companies = Array.from(new Set(farms.map((farm) => farm.companyId))).map((companyId) => ({
    companyId,
    name: me.companies.find((company) => company.id === companyId)?.name ?? companyId,
  }));
  const today = getLocalIsoDate();
  const from = getLocalIsoDate(new Date(Date.now() - 59 * 86400000));

  const baseJobs: Job<unknown>[] = [
    ...companies.flatMap((company) => [
      { label: `Tabelas de sangria (${company.name})`, run: () => listFieldTappingTables(company.companyId) },
      { label: `Tarefas de sangria (${company.name})`, run: () => listTappingTasks(company.companyId) },
      { label: `Máquinas (${company.name})`, run: () => listMachines(company.companyId) },
      { label: `Implementos (${company.name})`, run: () => listImplements(company.companyId) },
      { label: `Operadores (${company.name})`, run: () => listOperators(company.companyId) },
      { label: `Tipos de operação (${company.name})`, run: () => listOperationTypes(company.companyId) },
    ]),
    ...farms.flatMap((farm) => [
      { label: `Tanques de combustível (${farm.name})`, run: () => listFuelTanks(farm.companyId, farm.id) },
      {
        label: `Sangrias recentes (${farm.name})`,
        run: () => listTappingRecords(farm.companyId, { farmId: farm.id, from, to: today }),
      },
    ]),
  ];
  const base = await runJobs(baseJobs);

  const farmTapperJobs = farms.map((farm) => ({
    label: `Sangradores (${farm.name})`,
    run: async () => ({
      farm,
      tappers: await listFieldTappers(farm.companyId, farm.id),
    }),
  }));
  const farmTappers = await runJobs(farmTapperJobs);
  const tapperJobs: Job<{ farmId: string; companyId: string; tapperId: string; plots: Awaited<ReturnType<typeof listFieldTapperPlots>> }>[] = [];
  for (const farmResult of farmTappers.values) {
    if (!farmResult) continue;
    const { farm, tappers } = farmResult;
    for (const tapper of tappers) {
      tapperJobs.push({
        label: `Talhões de ${tapper.fullName} (${farm.name})`,
        run: async () => ({
          farmId: farm.id,
          companyId: farm.companyId,
          tapperId: tapper.id,
          plots: await listFieldTapperPlots(farm.companyId, tapper.id, farm.id),
        }),
      });
    }
  }

  const tapperResults = await runJobs(tapperJobs);
  const tapperData = tapperResults.values.filter((value): value is NonNullable<typeof value> => Boolean(value));
  const detailJobs: Job<unknown>[] = [];
  for (const { farmId, companyId, tapperId, plots } of tapperData) {
    for (const plot of plots) {
      detailJobs.push(
        {
          label: `Sequência de ${tapperId} / ${plot.name}`,
          run: () => getTapperRotation(companyId, tapperId, plot.id),
        },
        {
          label: `Tabelas de ${tapperId} / ${plot.name}`,
          run: () => listFieldTapperTables(companyId, tapperId, plot.id),
        },
        {
          label: `Resumo de sangria (${plot.name})`,
          run: () => listTappingSummary({ companyId, farmId, plotId: plot.id }),
        },
      );
    }
  }
  const details = await runJobs(detailJobs);

  const errors = [...base.errors, ...farmTappers.errors, ...tapperResults.errors, ...details.errors];
  return {
    farms: farms.length,
    tappers: farmTappers.values.reduce((sum, result) => sum + (result?.tappers.length ?? 0), 0),
    plots: tapperData.reduce((sum, item) => sum + item.plots.length, 0),
    errors,
  };
}
