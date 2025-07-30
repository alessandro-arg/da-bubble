import { TestBed } from '@angular/core/testing';

import { MessageUtilsService } from './message-utils.service';

describe('MessageUtilsService', () => {
  let service: MessageUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
