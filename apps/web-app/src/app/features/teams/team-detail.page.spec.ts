import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { TeamDetailPage } from './team-detail.page';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

describe('TeamDetailPage', () => {
  const api = {
    get: jest.fn(),
    patch: jest.fn(),
    extractCollection: (payload: any) => (Array.isArray(payload) ? payload : payload?.results ?? []),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [TeamDetailPage],
      providers: [
        {
          provide: ApiService,
          useValue: api,
        },
        {
          provide: AuthService,
          useValue: { isAdmin: () => true },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'team-1' }),
              queryParamMap: convertToParamMap({}),
              fragment: null,
            },
          },
        },
      ],
    });
  });

  it('loads only members for selected team', async () => {
    api.get.mockReturnValue(
      of([
        { id: 'm1', team: 'team-1', role: 'viewer', user: 'alice' },
        { id: 'm2', team: 'team-2', role: 'admin', user: 'bob' },
      ]),
    );

    const fixture = TestBed.createComponent(TeamDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.members()).toEqual([{ id: 'm1', name: 'alice', role: 'viewer' }]);
  });

  it('manages member role through patch call', async () => {
    api.get.mockReturnValue(of([{ id: 'm1', team: 'team-1', role: 'viewer', user: 'alice' }]));
    api.patch.mockReturnValue(of({ id: 'm1', role: 'admin' }));

    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('admin');
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    const fixture = TestBed.createComponent(TeamDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance.manageMember({ id: 'm1', name: 'alice', role: 'viewer' });

    expect(api.patch).toHaveBeenCalledWith('/api/registry/team-memberships/m1/', { role: 'admin' });
    expect(fixture.componentInstance.members()[0].role).toBe('admin');

    promptSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
