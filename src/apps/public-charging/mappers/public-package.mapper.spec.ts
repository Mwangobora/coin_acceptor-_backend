import { mapPublicPackage } from './public-package.mapper';

describe('mapPublicPackage', () => {
  it('returns only safe public package fields', () => {
    expect(mapPublicPackage(packageRow())).toEqual({
      publicPackageId: 'PKG_500',
      name: 'Quick Charge',
      description: 'Small top-up',
      priceMinor: '500',
      currency: 'TZS',
      durationSeconds: 1200,
      displayOrder: 2,
    });
  });
});

function packageRow() {
  return {
    id: 'internal-id',
    code: 'PKG_500',
    name: 'Quick Charge',
    description: 'Small top-up',
    price_minor: 500n,
    currency: 'TZS',
    duration_seconds: 1200,
    display_order: 2,
  } as never;
}
