import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { firstValueFrom } from 'rxjs';
import { WebSocketService } from '../../core/services/websocket.service';
import { ApiService } from '../../core/services/api.service';
import { DependencyEdge, ServiceNode } from '../../core/services/models';
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
  private readonly api = inject(ApiService);

  readonly search = signal('');
  readonly nodes = signal<ServiceNode[]>([]);
  readonly edges = signal<DependencyEdge[]>([]);

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

    effect(() => {
      const update = this.socket.graphUpdate();
      if (!update) return;
      void this.loadGraph();
    });

    void this.loadGraph();
  }

  private async loadGraph(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.get<{ success: boolean; data: { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> } }>(
          '/api/topology/query/export',
        ),
      );

      const nodes = (response.data?.nodes ?? []).map((node) => {
        const metadata = (node['metadata'] ?? {}) as Record<string, unknown>;
        const type = node['type'] === 'async' ? 'async' : 'sync';

        return {
          id: String(node['id'] ?? ''),
          name: String(node['name'] ?? node['id'] ?? ''),
          type,
          version: String(node['version'] ?? 'unknown'),
          metadata,
          team: typeof metadata['team'] === 'string' ? metadata['team'] : 'unknown',
          status: typeof metadata['status'] === 'string' && ['healthy', 'degraded', 'down'].includes(metadata['status'])
            ? (metadata['status'] as 'healthy' | 'degraded' | 'down')
            : 'healthy',
        } satisfies ServiceNode;
      });

      const edges = (response.data?.edges ?? []).map((edge) => ({
        source: String(edge['source'] ?? ''),
        target: String(edge['target'] ?? ''),
        type:
          edge['type'] === 'grpc' || edge['type'] === 'event' || edge['type'] === 'http'
            ? (edge['type'] as 'grpc' | 'event' | 'http')
            : 'http',
      })) satisfies DependencyEdge[];

      this.nodes.set(nodes);
      this.edges.set(edges);
    } catch {
      this.nodes.set([]);
      this.edges.set([]);
    }
  }
}
