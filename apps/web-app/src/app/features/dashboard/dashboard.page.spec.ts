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

    const requests = httpTestingController.match(() => true);
    requests.forEach((request) => {
      if (request.request.url.includes('/api/topology/query/statistics')) {
        request.flush({ success: true, data: { nodeCount: 3, edgeCount: 2 } });
        return;
      }

      if (request.request.url.includes('/api/registry/snapshots/')) {
        request.flush({ success: true, data: [] });
      }
    });
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
