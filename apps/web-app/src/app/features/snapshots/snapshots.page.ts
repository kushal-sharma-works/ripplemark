import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';

@Component({
  standalone: true,
  selector: 'app-snapshots-page',
  imports: [FormsModule, DropdownModule, CardModule],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Snapshot Comparison</h1>
    <div class="grid md:grid-cols-2 gap-4 mb-4">
      <p-dropdown
        [options]="snapshotOptions"
        optionLabel="label"
        optionValue="value"
        [ngModel]="left()"
        (ngModelChange)="left.set($event)"
      ></p-dropdown>
      <p-dropdown
        [options]="snapshotOptions"
        optionLabel="label"
        optionValue="value"
        [ngModel]="right()"
        (ngModelChange)="right.set($event)"
      ></p-dropdown>
    </div>

    <p-card header="Diff">
      <h3 class="font-semibold">Added Services</h3>
      <ul class="text-green-500 list-disc pl-5">
        @for (svc of diff().addedServices; track svc) { <li>{{ svc }}</li> }
      </ul>
      <h3 class="font-semibold mt-3">Removed Services</h3>
      <ul class="text-red-500 list-disc pl-5">
        @for (svc of diff().removedServices; track svc) { <li>{{ svc }}</li> }
      </ul>
      <h3 class="font-semibold mt-3">Changed Edges</h3>
      <ul class="list-disc pl-5">
        @for (edge of diff().changedEdges; track edge) { <li>{{ edge }}</li> }
      </ul>
    </p-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnapshotsPage {
  readonly left = signal('snap-101');
  readonly right = signal('snap-102');

  readonly snapshotOptions = [
    { label: 'Snapshot 101', value: 'snap-101' },
    { label: 'Snapshot 102', value: 'snap-102' },
    { label: 'Snapshot 103', value: 'snap-103' },
  ];

  diff() {
    return {
      addedServices: ['payment-service'],
      removedServices: ['legacy-auth'],
      changedEdges: ['web-app -> auth-gateway (added)', 'auth-gateway -> registry-service (removed)'],
    };
  }
}
