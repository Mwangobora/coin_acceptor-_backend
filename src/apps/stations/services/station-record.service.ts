import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type StationClient = Pick<Prisma.TransactionClient, 'stations'>;

@Injectable()
export class StationRecordService {
  async require(id: string, client: StationClient) {
    const station = await client.stations.findUnique({ where: { id } });
    if (!station) throw new NotFoundException('Station not found.');
    return station;
  }
}
