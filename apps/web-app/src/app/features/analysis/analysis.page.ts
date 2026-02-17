import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CardModule } from 'primeng/card';
import { firstValueFrom } from 'rxjs';
import { RiskScoreBadgeComponent } from '../../shared/components/risk-score-badge.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  selector: 'app-analysis-page',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DropdownModule,
    InputTextModule,
    TextareaModule,
    CardModule,
    RiskScoreBadgeComponent,
    LoadingSpinnerComponent,
  ],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Change Analysis</h1>
    <form class="grid gap-3 md:grid-cols-2" [formGroup]="form" (ngSubmit)="submit()">
      <div>
        <label class="text-sm block mb-1">Service</label>
        <p-dropdown [options]="services()" optionLabel="label" optionValue="value" formControlName="serviceName" class="w-full" />
      </div>
      <div>
        <label class="text-sm block mb-1">Change Type</label>
        <p-dropdown [options]="changeTypes" optionLabel="label" optionValue="value" formControlName="changeType" class="w-full" />
      </div>
      <div class="md:col-span-2">
        <label class="text-sm block mb-1">Title</label>
        <input pInputText formControlName="title" class="w-full" />
      </div>
      <div class="md:col-span-2">
        <label class="text-sm block mb-1">Details</label>
        <textarea pTextarea formControlName="description" class="w-full" rows="4"></textarea>
      </div>
      <div>
        <label class="text-sm block mb-1">Max Depth</label>
        <input pInputText type="number" formControlName="maxDepth" class="w-full" />
      </div>
      <div class="md:col-span-2"><button pButton label="Analyze" type="submit" [disabled]="form.invalid"></button></div>
    </form>

    @if (loading()) {
      <app-loading-spinner />
    }

    @if (error()) {
      <p class="text-red-500 mt-4">{{ error() }}</p>
    }

    @if (result(); as result) {
      <p-card class="mt-4">
        <div class="flex items-center gap-3 mb-3">
          <span class="font-medium">Risk Score</span>
          <app-risk-score-badge [score]="result.riskScore" />
        </div>
        <p class="text-sm text-[var(--text-color-secondary)] mb-3">
          Backward compatibility: {{ result.backwardCompatibility }}
        </p>
        <h3 class="font-semibold mb-2">Affected Services</h3>
        <ul class="space-y-2">
          @for (item of result.affectedServices; track item.service) {
            <li class="border border-[var(--surface-border)] rounded p-3">
              <div class="font-medium">{{ item.service }}</div>
              <div class="text-sm text-[var(--text-color-secondary)]">{{ item.reason }}</div>
            </li>
          }
        </ul>
      </p-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  readonly services = signal<Array<{ label: string; value: string }>>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<{
    riskScore: number;
    backwardCompatibility: string;
    affectedServices: Array<{ service: string; score: number; reason: string }>;
  } | null>(null);

  readonly changeTypes = [
    { label: 'Schema Change', value: 'schema_change' },
    { label: 'Timeout Change', value: 'timeout_change' },
    { label: 'Retry Change', value: 'retry_change' },
    { label: 'Deprecation', value: 'deprecation' },
    { label: 'Version Bump', value: 'version_bump' },
  ];

  readonly form = this.fb.nonNullable.group({
    serviceName: ['', Validators.required],
    changeType: ['', Validators.required],
    title: ['', Validators.required],
    description: ['', Validators.required],
    maxDepth: [5, [Validators.required, Validators.min(1), Validators.max(20)]],
  });

  constructor() {
    void this.loadServices();
  }

  private async loadServices(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.get<{ success: boolean; data: Array<{ id: string; name: string }> }>('/api/topology/query/services'),
      );

      const options = (response.data ?? []).map((service) => ({
        label: service.name,
        value: service.id,
      }));

      this.services.set(options);
    } catch {
      this.services.set([]);
    }
  }

  async submit(): Promise<void> {
    if (!this.form.valid) return;

    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);

    const form = this.form.getRawValue();

    try {
      const response = await firstValueFrom(
        this.api.post<
          {
            risk_score: number;
            backward_compatibility: string;
            impact_details: Array<{ service_name: string; criticality: number; explanation: string }>;
          },
          { service_name: string; change_type: string; details: string; max_depth: number }
        >('/api/analysis/impact', {
          service_name: form.serviceName,
          change_type: form.changeType,
          details: `${form.title}: ${form.description}`,
          max_depth: Number(form.maxDepth),
        }),
      );

      this.result.set({
        riskScore: response.risk_score,
        backwardCompatibility: response.backward_compatibility,
        affectedServices: (response.impact_details ?? []).map((item) => ({
          service: item.service_name,
          score: Number(item.criticality ?? 1) * 10,
          reason: item.explanation,
        })),
      });
    } catch {
      this.error.set('Impact analysis failed. Verify services are healthy and try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
