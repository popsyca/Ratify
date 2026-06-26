import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BookFilterService {
  query = signal('');
  minRating = signal(0);
  vibeFilter = signal('');
  categoryFilter = signal('');
  sortBy = signal('popularity');

  reset() {
    this.query.set('');
    this.minRating.set(0);
    this.vibeFilter.set('');
    this.categoryFilter.set('');
    this.sortBy.set('popularity');
  }
}
