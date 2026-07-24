import type { PrismaService } from '../prisma/prisma.service';
import { computeGeo } from '../territorial/geo.util';

// Backfill: para cada Farm/Plot com boundary mas sem centroid/bbox,
// calcula e persiste. Torna dados existentes utilizáveis pelo módulo
// Mapas e pelos apps de campo (check-in por raio/geofence).
export async function backfillGeo(prisma: PrismaService) {
  try {
    const farms = await prisma.farm.findMany({
      where: {
        isDeleted: false,
        boundary: { not: null as any },
        OR: [{ centroidLat: null }, { centroidLng: null }, { bboxJson: { equals: null as any } }],
      },
      select: { id: true, boundary: true, latitude: true, longitude: true },
    });
    for (const f of farms) {
      const geo = computeGeo(f.boundary);
      if (geo.centroidLat == null && geo.bboxJson == null) continue;
      await prisma.farm.update({
        where: { id: f.id },
        data: {
          centroidLat: geo.centroidLat,
          centroidLng: geo.centroidLng,
          bboxJson: geo.bboxJson as any,
          latitude: f.latitude ?? geo.centroidLat ?? undefined,
          longitude: f.longitude ?? geo.centroidLng ?? undefined,
        },
      });
    }

    const plots = await prisma.plot.findMany({
      where: {
        isDeleted: false,
        boundary: { not: null as any },
        OR: [{ centroidLat: null }, { centroidLng: null }, { bboxJson: { equals: null as any } }],
      },
      select: { id: true, boundary: true },
    });
    for (const p of plots) {
      const geo = computeGeo(p.boundary);
      if (geo.centroidLat == null && geo.bboxJson == null) continue;
      await prisma.plot.update({
        where: { id: p.id },
        data: {
          centroidLat: geo.centroidLat,
          centroidLng: geo.centroidLng,
          bboxJson: geo.bboxJson as any,
        },
      });
    }

    if (farms.length || plots.length) {
      console.log(`[backfillGeo] farms=${farms.length} plots=${plots.length}`);
    }
  } catch (err) {
    console.warn('[backfillGeo] skipped:', (err as Error).message);
  }
}
