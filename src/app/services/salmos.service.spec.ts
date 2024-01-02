import { TestBed } from '@angular/core/testing';

import { SalmosService } from './salmos.service';

describe('SalmosService', () => {
  let service: SalmosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SalmosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
