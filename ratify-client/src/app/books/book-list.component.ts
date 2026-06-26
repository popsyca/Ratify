import { Component, OnInit, computed, signal, effect, untracked, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookSummary } from './book.models';
import { BookFilterService } from '../core/book-filter.service';

@Component({
  standalone: true, imports: [FormsModule, RouterLink], template: `
<div class="hero-filters"><section class="toolbar hero">
  <div>
    <h2 class="hero-title">Which mood are you in to read?</h2>
    <div class="color-dots-row">
      <div class="color-mood-item" (click)="toggleVibe('#EF4444')" [class.active]="vibeFilter() === '#EF4444'">
        <span class="color-dot" style="background-color: #EF4444;"></span>
        <span class="color-label">🥵</span>
      </div>
      <div class="color-mood-item" (click)="toggleVibe('#F97316')" [class.active]="vibeFilter() === '#F97316'">
        <span class="color-dot" style="background-color: #F97316;"></span>
        <span class="color-label">😡</span>
      </div>
      <div class="color-mood-item" (click)="toggleVibe('#FACC15')" [class.active]="vibeFilter() === '#FACC15'">
        <span class="color-dot" style="background-color: #FACC15;"></span>
        <span class="color-label">😊</span>
      </div>
      <div class="color-mood-item" (click)="toggleVibe('#22C55E')" [class.active]="vibeFilter() === '#22C55E'">
        <span class="color-dot" style="background-color: #22C55E;"></span>
        <span class="color-label">🤢</span>
      </div>
      <div class="color-mood-item" (click)="toggleVibe('#3B82F6')" [class.active]="vibeFilter() === '#3B82F6'">
        <span class="color-dot" style="background-color: #3B82F6;"></span>
        <span class="color-label">😢</span>
      </div>
      <div class="color-mood-item" (click)="toggleVibe('#EC4899')" [class.active]="vibeFilter() === '#EC4899'">
        <span class="color-dot" style="background-color: #EC4899;"></span>
        <span class="color-label">🥰</span>
      </div>
      <div class="color-mood-item" (click)="toggleVibe('#64748B')" [class.active]="vibeFilter() === '#64748B'">
        <span class="color-dot" style="background-color: #64748B;"></span>
        <span class="color-label">🥱</span>
      </div>
    </div>
  </div>
</section>
<section class="filters">
  <label>Minimum rating <input type="number" min="0" max="5" step="0.5" [ngModel]="minRating()" (ngModelChange)="minRating.set(+$event)"></label>

   <label>Category
     <select [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)">
       <option value="">All categories</option>
       @for (c of categories(); track c) { <option [value]="c">{{ c }}</option> }
     </select>
   </label>
  <label>Sort by
    <select [ngModel]="sortBy()" (ngModelChange)="sortBy.set($event)">
      <option value="popularity">Popular Right Now</option>
      <option value="rating">Highest Rating</option>
      <option value="rating-low">Least Ratings</option>
      <option value="reviews">Most Reviews</option>
    </select>
  </label>
  <button class="ghost-button" (click)="resetFilters()">Reset</button>
</section></div>
<p class="eyebrow list-eyebrow">Ratify Library</p>
<section class="grid">
@for (book of paginatedBooks(); track book.id) {
  <article class="book" [style.--vibe-color]="book.topVibeColor" [routerLink]="['/books', book.id]">
    <img [src]="covers()[book.id] || book.coverUrl" [alt]="book.title">
    <div class="book-content">
      @if (book.genre) {
        <span class="genre-badge">{{ book.genre }}</span>
      }
      <p class="author">{{ book.author }}</p>
      <h2>{{ book.title }}</h2>
      <p>{{ book.description }}</p>
      <div class="card-actions">
        @if (book.averageRating) {
          <div class="rating-display" [attr.title]="book.averageRating + ' / 5'">
            <div class="stars-outer">
              <div class="stars-inner" [style.width.%]="book.averageRating * 20"></div>
            </div>
            <span class="rating-value">{{ book.averageRating }}</span>
            <span class="rating-count">({{ formatReviewCount(book.reviewCount) }})</span>
          </div>
        } @else {
          <strong>New</strong>
        }
        <a [routerLink]="['/books', book.id]">Review</a>
      </div>
    </div>
  </article>
}
@empty {
  <div class="empty-illustration-container">
    <svg class="empty-illustration" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M50 30 C 50 40, 20 40, 15 50 L 15 80 C 20 70, 50 70, 50 60 C 50 70, 80 70, 85 80 L 85 50 C 80 40, 50 40, 50 30 Z" fill="none" stroke="currentColor" stroke-width="2"/>
      <line x1="50" y1="35" x2="50" y2="60" stroke="currentColor" stroke-width="2"/>
      <path d="M25 55 H 38 M25 63 H 38 M62 55 H 75 M62 63 H 75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="50" cy="45" r="8" fill="rgba(197, 140, 64, 0.1)" stroke="#c58c40" stroke-width="1"/>
    </svg>
    <p class="empty-state">No books match these filters yet.</p>
  </div>
}
</section>

@if (totalPages() > 1) {
  <div class="pagination">
    <button class="pagination-btn" [disabled]="currentPage() === 1" (click)="setPage(currentPage() - 1)">&laquo; Prev</button>
    
    @for (page of pagesToShow(); track page) {
      <button class="pagination-btn" [class.active]="page === currentPage()" (click)="setPage(page)">
        {{ page }}
      </button>
    }
    
    <button class="pagination-btn" [disabled]="currentPage() === totalPages()" (click)="setPage(currentPage() + 1)">Next &raquo;</button>
  </div>
}
` })
export class BookListComponent implements OnInit {
  private filterService = inject(BookFilterService);
  books = signal<BookSummary[]>([]);
  query = this.filterService.query;
  minRating = this.filterService.minRating;
  vibeFilter = this.filterService.vibeFilter;
  categoryFilter = this.filterService.categoryFilter;
  sortBy = this.filterService.sortBy;

  currentPage = signal(1);
  pageSize = 12;
  covers = signal<Record<number, string>>({});

  filteredBooks = computed(() => {
    const query = this.query().trim().toLowerCase();
    const filtered = this.books().filter(book => {
      const matchesQuery = !query || `${book.title} ${book.author} ${book.description}`.toLowerCase().includes(query);
      const matchesRating = !this.minRating() || book.averageRating >= this.minRating();
      const matchesVibe = !this.vibeFilter() || book.topVibeColor === this.vibeFilter();
      const mappedCategory = this.mapGenreToCategory(book.genre);
      const matchesCategory = !this.categoryFilter() || mappedCategory === this.categoryFilter();
      return matchesQuery && matchesRating && matchesVibe && matchesCategory;
    });

    const sort = this.sortBy();
    return [...filtered].sort((a, b) => {
      if (sort === 'rating') {
        return (b.averageRating || 0) - (a.averageRating || 0);
      } else if (sort === 'rating-low') {
        return (a.averageRating || 0) - (b.averageRating || 0);
      } else if (sort === 'reviews') {
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      } else {
        // popularity = weekly views
        return (b.weeklyViews || 0) - (a.weeklyViews || 0);
      }
    });
  });

  paginatedBooks = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize;
    return this.filteredBooks().slice(startIndex, startIndex + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredBooks().length / this.pageSize));

  pagesToShow = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: number[] = [];

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      if (i >= 1 && i <= total) {
        pages.push(i);
      }
    }
    return pages;
  });

  vibeColors = computed(() => [...new Set(this.books().map(book => book.topVibeColor))]);
  categories = computed(() => {
    const uniq = [...new Set(this.books()
      .map(book => this.mapGenreToCategory(book.genre))
      .filter(Boolean))];
    return uniq.sort((a, b) => a.localeCompare(b));
  });

  getColorLabel(color: string): string {
    const labels: Record<string, string> = {
      '#EF4444': '🥵 Hot',
      '#F97316': '😡 Angry',
      '#FACC15': '😊 Happy',
      '#22C55E': '🤢 Nausea',
      '#14B8A6': '🧠 Focus',
      '#3B82F6': '😢 Sadness',
      '#EC4899': '🥰 Romance',
      '#64748B': '🥱 Boring',
      '#94A3B8': 'No Vibe'
    };
    return labels[color.toUpperCase()] || color;
  }

  /** Map detailed genre strings to broader categories */
  private mapGenreToCategory(genre: string): string {
    if (!genre) return '';
    const g = genre.toLowerCase();

    if (g.includes('children') || g.includes('kids') || g.includes('young adult') || g.includes('picture book'))
      return 'Children & Young Adult';
    if (g.includes('fantasy'))
      return 'Fantasy';
    if (g.includes('science fiction') || g.includes('sci-fi') || g.includes('dystopian'))
      return 'Science Fiction';
    if (g.includes('mystery') || g.includes('thriller') || g.includes('detective') || g.includes('crime'))
      return 'Mystery & Thriller';
    if (g.includes('romance') || g.includes('romantic') || g.includes('erotica'))
      return 'Romance';
    if (g.includes('horror') || g.includes('gothic'))
      return 'Horror & Gothic';
    if (g.includes('historical'))
      return 'Historical Fiction';
    if (g.includes('self-help') || g.includes('motivational') || g.includes('psychology'))
      return 'Self-Help';
    if (g.includes('science') || g.includes('anthropology') || g.includes('philosophy') || g.includes('guide') || g.includes('manual') || g.includes('memoir') || g.includes('autobiography') || g.includes('biography') || g.includes('travel') || g.includes('essay') || g.includes('sexology'))
      return 'Non-Fiction';
    if (g.includes('war'))
      return 'War & Adventure';
    if (g.includes('adventure'))
      return 'War & Adventure';
    if (g.includes('novel') || g.includes('fiction') || g.includes('novella') || g.includes('saga') || g.includes('realism') || g.includes('satire') || g.includes('coming-of-age') || g.includes('bildungsroman'))
      return 'Classic Literature';

    return 'Other';
  }

  toggleVibe(color: string) {
    this.vibeFilter.set(this.vibeFilter() === color ? '' : color);
  }

  formatReviewCount(count: number): string {
    if (count >= 1_000_000) {
      return (count / 1_000_000).toFixed(1) + 'M';
    }
    if (count >= 1_000) {
      return (count / 1_000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  constructor(private http: HttpClient) {
    effect(() => {
      this.query();
      this.minRating();
      this.vibeFilter();
      this.categoryFilter();
      this.sortBy();
      untracked(() => this.currentPage.set(1));
    });
    effect(() => {
      const books = this.paginatedBooks();
      books.forEach(book => this.loadCover(book));
    }, { allowSignalWrites: true });
  }

  loadCover(book: BookSummary) {
    if (this.covers()[book.id] || !book.coverUrl.includes('unsplash.com')) return;

    const cached = localStorage.getItem(`cover_${book.id}`);
    if (cached) {
      this.covers.update(c => ({ ...c, [book.id]: cached }));
      return;
    }

    const cleanTitle = book.title.split('(')[0].trim();
    const targetUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&author=${encodeURIComponent(book.author)}&limit=1`;
    const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    this.http.get<any>(url).subscribe({
      next: res => {
        if (res.docs && res.docs.length > 0 && res.docs[0].cover_i) {
          const coverUrl = `https://covers.openlibrary.org/b/id/${res.docs[0].cover_i}-M.jpg`;
          this.covers.update(c => ({ ...c, [book.id]: coverUrl }));
          localStorage.setItem(`cover_${book.id}`, coverUrl);
        }
      }
    });
  }

  ngOnInit() { this.http.get<BookSummary[]>('/api/books').subscribe(books => this.books.set(books)); }
  resetFilters() { this.query.set(''); this.minRating.set(0); this.vibeFilter.set(''); this.categoryFilter.set(''); this.sortBy.set('popularity'); }
}
