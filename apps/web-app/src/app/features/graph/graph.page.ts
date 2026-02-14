import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { WebSocketService } from '../../core/services/websocket.service';
import { GraphCanvasComponent } from './graph-canvas.component';

@Component({
  standalone: true,
  selector: 'app-graph-page',
  imports: [FormsModule, InputTextModule, CardModule, GraphCanvasComponent],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Dependency Graph</h1>
    <div class="mb-3">
      <input
        pInputText
        placeholder="Search service"
        class="w-full md:w-96"
        [ngModel]="search()"
        (ngModelChange)="search.set($event)"
      />
    </div>

    @defer (on viewport) {
      <app-graph-canvas [nodes]="filteredNodes()" [edges]="filteredEdges()" />
    } @placeholder {
      <p-card><p>Loading D3 visualization…</p></p-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphPage {
  private readonly socket = inject(WebSocketService);

  readonly search = signal('');
  readonly nodes = signal([
    { id: 'auth-gateway', name: 'auth-gateway', type: 'api', team: 'platform', status: 'healthy', version: '1.0.0' },
    { id: 'analysis-service', name: 'analysis-service', type: 'worker', team: 'platform', status: 'healthy', version: '1.0.0' },
    { id: 'registry-service', name: 'registry-service', type: 'database', team: 'platform', status: 'healthy', version: '1.0.0' },
    { id: 'web-app', name: 'web-app', type: 'frontend', team: 'ui', status: 'healthy', version: '1.0.0' },
  ] as any[]);
  readonly edges = signal([
    { source: 'web-app', target: 'auth-gateway', type: 'sync' },
    { source: 'auth-gateway', target: 'analysis-service', type: 'async' },
    { source: 'auth-gateway', target: 'registry-service', type: 'sync' },
  ] as any[]);

  readonly filteredNodes = computed(() => {
    const term = this.search().toLowerCase().trim();
    if (!term) return this.nodes();
    return this.nodes().filter((node) => node.name.includes(term));
  });

  readonly filteredEdges = computed(() => {
    const ids = new Set(this.filteredNodes().map((n) => n.id));
    return this.edges().filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  });

  constructor() {
    this.socket.connect();
  }
}
