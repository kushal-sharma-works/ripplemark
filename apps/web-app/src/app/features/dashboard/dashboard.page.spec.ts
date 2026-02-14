import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DashboardPage] }).compileComponents();
    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
  });

  it('renders dashboard cards', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Total Services');
    expect(text).toContain('System Health');
  });
});
