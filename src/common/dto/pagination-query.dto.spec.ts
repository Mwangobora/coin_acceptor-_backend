import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { PaginationQueryDto } from './pagination-query.dto';

describe('PaginationQueryDto', () => {
  it('uses safe defaults', () => {
    const dto = plainToInstance(PaginationQueryDto, {});
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
    expect(dto.sortOrder).toBe('asc');
  });

  it('rejects page sizes above the maximum', () => {
    const dto = plainToInstance(PaginationQueryDto, { pageSize: '101' });

    expect(validateSync(dto)).toHaveLength(1);
  });
});
