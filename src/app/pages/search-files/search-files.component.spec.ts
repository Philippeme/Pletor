import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchFilesComponent } from './search-files.component';

describe('SearchFilesComponent', () => {
  let component: SearchFilesComponent;
  let fixture: ComponentFixture<SearchFilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SearchFilesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
