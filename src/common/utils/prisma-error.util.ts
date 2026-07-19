import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function mapPrismaError(
  error: unknown,
  messages: Record<string, string>,
) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    throw error instanceof Error ? error : new InternalServerErrorException();
  }
  if (error.code === 'P2002') {
    throw new ConflictException(messages.P2002 ?? 'Duplicate record.');
  }
  if (error.code === 'P2003') {
    throw new ConflictException(messages.P2003 ?? 'Related record conflict.');
  }
  if (error.code === 'P2025') {
    throw new NotFoundException(messages.P2025 ?? 'Record not found.');
  }
  throw error;
}
