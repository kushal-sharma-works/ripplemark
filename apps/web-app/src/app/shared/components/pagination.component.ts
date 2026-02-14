import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [PaginatorModule],
  template: '<p-paginator [first]="first()" [rows]="rows()" [totalRecords]="total()" (onPageChange)="page.emit($event)"></p-paginator>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  readonly total = input(0);
  readonly first = input(0);
  readonly rows = input(10);
  readonly page = output<PaginatorState>();
}
