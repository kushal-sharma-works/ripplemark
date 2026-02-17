import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  selector: 'app-snapshots-page',
  imports: [FormsModule, DropdownModule, CardModule],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Snapshot Comparison</h1>
    <div class="grid md:grid-cols-2 gap-4 mb-4">
      <p-dropdown
        [options]="snapshotOptions()"
        optionLabel="label"
        optionValue="value"
        [ngModel]="left()"
        (ngModelChange)="onLeftChange($event)"
      ></p-dropdown>
      <p-dropdown
        [options]="snapshotOptions()"
        optionLabel="label"
        optionValue="value"
        [ngModel]="right()"
        (ngModelChange)="onRightChange($event)"
      ></p-dropdown>
    </div>

    <p-card header="Diff">
      <h3 class="font-semibold">Added Services</h3>
      <ul class="text-green-500 list-disc pl-5">
        @for (svc of comparison()?.addedServices ?? []; track svc) { <li>{{ svc }}</li> }
      </ul>
      <h3 class="font-semibold mt-3">Removed Services</h3>
      <ul class="text-red-500 list-disc pl-5">
        @for (svc of comparison()?.removedServices ?? []; track svc) { <li>{{ svc }}</li> }
      </ul>
      <h3 class="font-semibold mt-3">Changed Edges</h3>
      <ul class="list-disc pl-5">
        @for (edge of comparison()?.changedEdges ?? []; track edge) { <li>{{ edge }}</li> }
      </ul>
    </p-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnapshotsPage {
  private readonly api = inject(ApiService);

  readonly left = signal<string | null>(null);
  readonly right = signal<string | null>(null);
  readonly snapshotOptions = signal<Array<{ label: string; value: string }>>([]);
  readonly comparison = signal<{ addedServices: string[]; removedServices: string[]; changedEdges: string[] } | null>(
    null,
  );

  constructor() {
    void this.loadSnapshots();
  }

  async onLeftChange(value: string | null): Promise<void> {
    this.left.set(value);
    await this.compareIfReady();
  }

  async onRightChange(value: string | null): Promise<void> {
    this.right.set(value);
    await this.compareIfReady();
  }

  private async loadSnapshots(): Promise<void> {
    try {
      const snapshots = await firstValueFrom(
        this.api.get<Array<{ id: string; captured_at: string; notes: string }>>('/api/registry/snapshots/'),
      );

      const options = (snapshots ?? []).map((snapshot) => ({
        label: `${new Date(snapshot.captured_at).toLocaleString()}${snapshot.notes ? ` — ${snapshot.notes}` : ''}`,
        value: snapshot.id,
      }));

      this.snapshotOptions.set(options);
      this.left.set(options[0]?.value ?? null);
      this.right.set(options[1]?.value ?? options[0]?.value ?? null);

      await this.compareIfReady();
    } catch {
      this.snapshotOptions.set([]);
      this.left.set(null);
      this.right.set(null);
      this.comparison.set({ addedServices: [], removedServices: [], changedEdges: [] });
    }
  }

  private async compareIfReady(): Promise<void> {
    const first = this.left();
    const second = this.right();

    if (!first || !second) {
      this.comparison.set({ addedServices: [], removedServices: [], changedEdges: [] });
      return;
    }

    try {
      const diff = await firstValueFrom(
        this.api.get<{
          added_services: string[];
          removed_services: string[];
          added_edges: Array<[string, string]>;
          removed_edges: Array<[string, string]>;
        }>('/api/registry/snapshots/compare/', {
          first,
          second,
        }),
      );

      this.comparison.set({
        addedServices: diff.added_services ?? [],
        removedServices: diff.removed_services ?? [],
        changedEdges: [
          ...(diff.added_edges ?? []).map((edge) => `${edge[0]} -> ${edge[1]} (added)`),
          ...(diff.removed_edges ?? []).map((edge) => `${edge[0]} -> ${edge[1]} (removed)`),
        ],
      });
    } catch {
      this.comparison.set({ addedServices: [], removedServices: [], changedEdges: [] });
    }
  }
}
