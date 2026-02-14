import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CardModule } from 'primeng/card';
import { RiskScoreBadgeComponent } from '../../shared/components/risk-score-badge.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';

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
        <p-dropdown [options]="services" optionLabel="label" optionValue="value" formControlName="serviceId" class="w-full" />
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
      <div class="md:col-span-2"><button pButton label="Analyze" type="submit" [disabled]="form.invalid"></button></div>
    </form>

    @if (analysisResult.isLoading()) {
      <app-loading-spinner />
    }

    @if (analysisResult.value(); as result) {
      <p-card class="mt-4">
        <div class="flex items-center gap-3 mb-3">
          <span class="font-medium">Risk Score</span>
          <app-risk-score-badge [score]="result.riskScore" />
        </div>
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

  readonly services = [
    { label: 'auth-gateway', value: 'auth-gateway' },
    { label: 'registry-service', value: 'registry-service' },
  ];

  readonly changeTypes = [
    { label: 'API', value: 'api' },
    { label: 'Schema', value: 'schema' },
    { label: 'Infra', value: 'infra' },
    { label: 'Config', value: 'config' },
  ];

  readonly form = this.fb.nonNullable.group({
    serviceId: ['', Validators.required],
    changeType: ['', Validators.required],
    title: ['', Validators.required],
    description: ['', Validators.required],
  });

  readonly payload = signal(this.form.getRawValue());
  readonly submitted = signal(false);

  readonly analysisResult = resource({
    request: () => ({ submitted: this.submitted(), payload: this.payload() }),
    loader: async ({ request }) => {
      if (!request.submitted) return null;
      return {
        riskScore: 68,
        affectedServices: [
          { service: 'analysis-service', score: 74, reason: 'Consumes impacted endpoint' },
          { service: 'web-app', score: 55, reason: 'Depends on gateway contract' },
        ],
      };
    },
  });

  submit(): void {
    if (!this.form.valid) return;
    this.payload.set(this.form.getRawValue());
    this.submitted.set(true);
  }
}
