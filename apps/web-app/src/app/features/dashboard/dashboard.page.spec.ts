import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardPage } from './dashboard.page';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    const statisticsRequest = httpTestingController.expectOne((request) =>
      request.url.includes('/api/topology/query/statistics'),
    );
    statisticsRequest.flush({ success: true, data: { nodeCount: 3, edgeCount: 2 } });

    await fixture.whenStable();

    const snapshotsRequest = httpTestingController.expectOne((request) =>
      request.url.includes('/api/registry/snapshots'),
    );
    snapshotsRequest.flush({ success: true, data: [] });
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('renders dashboard cards', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Total Services');
    expect(text).toContain('System Health');
  });
});
