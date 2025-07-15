import { TestBed } from '@angular/core/testing';

import { ServicesDataService } from './services-data.service';

describe('ServicesDataService', () => {
  let service: ServicesDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicesDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
