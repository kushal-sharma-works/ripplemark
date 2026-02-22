import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import * as d3 from 'd3';
import { DependencyEdge, ServiceNode } from '../../core/services/models';

type GraphPoint = d3.SimulationNodeDatum & ServiceNode;
type GraphLink = d3.SimulationLinkDatum<GraphPoint> & DependencyEdge;

@Component({
  selector: 'app-graph-canvas',
  standalone: true,
  template: '<div #container class="h-[500px] border rounded-xl border-[var(--surface-border)]"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphCanvasComponent implements AfterViewInit {
  readonly nodes = input<ServiceNode[]>([]);
  readonly edges = input<DependencyEdge[]>([]);
  readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');

  private viewReady = false;

  constructor() {
    effect(() => {
      const currentNodes = this.nodes();
      const currentEdges = this.edges();
      if (!this.viewReady) return;
      this.render(currentNodes, currentEdges);
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.render(this.nodes(), this.edges());
  }

  private render(nodes: ServiceNode[], edges: DependencyEdge[]): void {
    const host = this.container().nativeElement;
    host.innerHTML = '';

    const width = host.clientWidth;
    const height = host.clientHeight;

    const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
    const root = svg.append('g');
    svg.call(d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => root.attr('transform', event.transform as string)));

    const graphNodes: GraphPoint[] = nodes.map((d) => ({ ...d }));
    const graphLinks: GraphLink[] = edges.map((d) => ({ ...d }));

    const simulation = d3
      .forceSimulation<GraphPoint>(graphNodes)
      .force('link', d3.forceLink<GraphPoint, GraphLink>(graphLinks).id((d) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = root
      .append('g')
      .selectAll('line')
      .data(graphLinks)
      .enter()
      .append('line')
      .attr('stroke', 'var(--surface-500)')
      .attr('stroke-dasharray', (d: GraphLink) => (d.type === 'event' ? '4 4' : '0'));

    const node = root
      .append('g')
      .selectAll('circle')
      .data(graphNodes)
      .enter()
      .append('circle')
      .attr('r', 12)
      .attr('fill', (d: GraphPoint) => (d.type === 'async' ? '#8b5cf6' : '#3b82f6'));

    simulation.on('tick', () => {
      const simNodes = simulation.nodes();
      const simLinks = (simulation.force('link') as d3.ForceLink<GraphPoint, GraphLink>).links();

      node
        .attr('cx', (_d: GraphPoint, i: number) => simNodes[i].x ?? 0)
        .attr('cy', (_d: GraphPoint, i: number) => simNodes[i].y ?? 0);
      link
        .attr('x1', (_d: GraphLink, i: number) => (simLinks[i].source as GraphPoint).x ?? 0)
        .attr('y1', (_d: GraphLink, i: number) => (simLinks[i].source as GraphPoint).y ?? 0)
        .attr('x2', (_d: GraphLink, i: number) => (simLinks[i].target as GraphPoint).x ?? 0)
        .attr('y2', (_d: GraphLink, i: number) => (simLinks[i].target as GraphPoint).y ?? 0);
    });
  }
}
