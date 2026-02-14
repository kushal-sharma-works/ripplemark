import { Directive, ElementRef, HostListener, output } from '@angular/core';

@Directive({ selector: '[appInfiniteScroll]', standalone: true })
export class InfiniteScrollDirective {
  readonly reachedBottom = output<void>();

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  @HostListener('scroll')
  onScroll(): void {
    const element = this.elementRef.nativeElement;
    const threshold = 30;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
      this.reachedBottom.emit();
    }
  }
}
