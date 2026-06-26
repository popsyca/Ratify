import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { BookDetail, Review } from './book.models';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true, imports: [FormsModule], template: `
@if (book(); as b) {
<div class="book-detail-grid">
  <!-- Left Column: Details & Spectrum -->
  <div class="detail-left-col">
    <section class="detail" [style.--vibe]="vibeColor">
      <img [src]="covers()[b.id] || b.coverUrl" [alt]="b.title">
      <div>
        @if (b.genre) {
          <span class="genre-badge">{{ b.genre }}</span>
        }
        <p class="eyebrow">Current vibe</p>
        <h1>{{ b.title }}</h1>
        <p class="author">{{ b.author }}</p>
        <p>{{ b.description }}</p>
        <div class="detail-badges">
          @if (b.averageRating) {
            <div class="rating-display" [attr.title]="b.averageRating + ' / 5'">
              <div class="stars-outer">
                <div class="stars-inner" [style.width.%]="b.averageRating * 20"></div>
              </div>
              <span class="rating-value">{{ b.averageRating }} / 5</span>
            </div>
          } @else {
            <strong class="rating-badge">New</strong>
          }
          <span>{{ formatReviewCount(b.reviewCount) }} reviews</span>
        </div>
      </div>
    </section>

    <section class="vibe-panel">
      <h2>Vibe spectrum</h2>
      <div class="vibe-bars">
        @for (stat of b.vibeStats; track stat.color) {
          <div class="vibe-row">
            <div class="vibe-swatch-col">
              <span class="vibe-swatch" [style.background]="stat.color"></span>
              <span class="vibe-emoji">{{ getEmojiOnly(stat.color) }}</span>
            </div>
            <div class="vibe-bar-track" [attr.data-tooltip]="getColorLabel(stat.color) + ': ' + stat.count + ' votes (' + getVibePercentage(stat.count, b) + ')'">
              <span [style.width.%]="stat.count / maxVibeCount(b) * 100" [style.background]="stat.color"></span>
            </div>
            <strong>{{ stat.count }}</strong>
          </div>
        }
        @empty {
          <div class="empty-illustration-container small-illustration">
            <svg class="empty-illustration" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M30 75 C 10 70, 10 40, 30 30 C 50 20, 80 20, 85 45 C 88 60, 75 85, 55 85 C 45 85, 38 80, 30 75 Z"/>
              <circle cx="40" cy="40" r="5" fill="currentColor"/>
              <circle cx="55" cy="35" r="5" fill="currentColor"/>
              <circle cx="70" cy="45" r="5" fill="currentColor"/>
              <circle cx="35" cy="58" r="6" stroke-dasharray="2 2"/>
              <circle cx="50" cy="70" r="6"/>
            </svg>
            <p class="empty-state">No vibe colors yet.</p>
          </div>
        }
      </div>
    </section>
  </div>

  <!-- Right Column: Review Submission & Community Reviews -->
  <div class="detail-right-col">
    <section class="review-box">
      <h2>{{ editingReviewId() ? 'Edit your review' : 'Your review' }}</h2>
      @if (!auth.token()) { <p>Please login to review.</p> }
      @else {
        <div class="star-rating-container">
          <span class="rating-label">Rating</span>
          <div class="star-rating-row">
            @for (star of [1, 2, 3, 4, 5]; track star) {
              <button type="button" 
                      class="star-btn" 
                      [class.filled]="rating >= star"
                      (click)="rating = star"
                      [attr.aria-label]="star + ' stars'">
                <svg class="star-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
            }
          </div>
        </div>
        <textarea [(ngModel)]="comment" placeholder="What did this book feel like?"></textarea>
        <div class="palette">
          @for (color of palette; track color) {
            <div class="color-mood-item" [class.active]="vibeColor === color" (click)="vibeColor = color">
              <button [class.active]="vibeColor === color" [style.background]="color" [attr.aria-label]="color"></button>
              <span class="color-label">{{ getEmojiOnly(color) }}</span>
            </div>
          }
        </div>
        <button (click)="save(b.id)">Save review</button><span class="form-message" [class.shake-animation]="shake()">{{ message() }}</span>
      }
    </section>

    <section class="reviews">
      <h2>Community vibes</h2>
      <div class="reviews-scroll-container">
        @for (review of b.reviews; track review.id) {
          <article [style.borderLeftColor]="review.vibeColor">
            <div class="review-header">
              <strong>{{ review.userName }} - {{ review.rating }}/5</strong>
              <span class="review-vibe-tag" [style.color]="review.vibeColor">
                {{ getColorLabel(review.vibeColor) }}
              </span>
            </div>
            <p>{{ review.comment }}</p>
            @if (review.canEdit) {
              <div class="inline-actions"><button class="ghost-button" (click)="edit(review)">Edit</button><button class="danger-button" (click)="delete(review.id)">Delete</button></div>
            }
          </article>
        }
        @empty {
          <div class="empty-illustration-container">
            <svg class="empty-illustration" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 30h60a10 10 0 0 1 10 10v30a10 10 0 0 1-10 10H45L30 88V80H20a10 10 0 0 1-10-10V40a10 10 0 0 1 10-10z"/>
              <line x1="30" y1="45" x2="70" y2="45"/>
              <line x1="30" y1="55" x2="60" y2="55"/>
              <path d="M68 62 L 78 52 M73 67 L 78 62" stroke="#c58c40" stroke-width="2"/>
            </svg>
            <p class="empty-state">No reviews yet. Be the first to share your vibe.</p>
          </div>
        }
      </div>
    </section>
  </div>
</div>
}` })
export class BookDetailComponent implements OnInit {
  book = signal<BookDetail | null>(null);
  editingReviewId = signal<number | null>(null);
  rating = 5;
  comment = '';
  vibeColor = '#F97316';
  message = signal('');
  shake = signal(false);
  palette = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#EC4899', '#64748B'];
  covers = signal<Record<number, string>>({});
  constructor(private route: ActivatedRoute, private http: HttpClient, public auth: AuthService) { }
  ngOnInit() { this.load(); }
  load() {
    this.http.get<BookDetail>(`/api/books/${this.route.snapshot.paramMap.get('id')}`).subscribe(book => {
      this.book.set(book);
      if (book) {
        this.loadCover(book);
        // Track page view for popularity
        this.http.post(`/api/books/${book.id}/view`, {}).subscribe();
      }
    });
  }
  maxVibeCount(book: BookDetail) { return Math.max(1, ...book.vibeStats.map(stat => stat.count)); }
  getVibePercentage(count: number, book: BookDetail): string {
    const total = book.vibeStats.reduce((sum, stat) => sum + stat.count, 0);
    return total === 0 ? '0%' : Math.round((count / total) * 100) + '%';
  }
  loadCover(book: BookDetail) {
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
    return labels[color.toUpperCase()] || '⚙️ Normal';
  }
  getEmojiOnly(color: string): string {
    const emojis: Record<string, string> = {
      '#EF4444': '🥵',
      '#F97316': '😡',
      '#FACC15': '😊',
      '#22C55E': '🤢',
      '#14B8A6': '🧠',
      '#3B82F6': '😢',
      '#EC4899': '🥰',
      '#64748B': '🥱',
      '#94A3B8': '⚙️'
    };
    return emojis[color.toUpperCase()] || '⚙️';
  }
  edit(review: Review) {
    this.editingReviewId.set(review.id);
    this.rating = review.rating;
    this.comment = review.comment;
    this.vibeColor = review.vibeColor;
    this.message.set('Editing your existing review');
  }
  triggerShake() {
    this.shake.set(true);
    setTimeout(() => this.shake.set(false), 400);
  }
  save(id: number) {
    if (!this.comment || this.comment.trim().length < 5) {
      this.message.set('Please write a review comment (min 5 characters).');
      this.triggerShake();
      return;
    }
    if (this.rating < 1 || this.rating > 5) {
      this.message.set('Rating must be between 1 and 5.');
      this.triggerShake();
      return;
    }

    this.http.post(`/api/books/${id}/reviews`, { rating: this.rating, comment: this.comment.trim(), vibeColor: this.vibeColor }).subscribe({
      next: () => { this.message.set('Saved'); this.editingReviewId.set(null); this.load(); },
      error: e => {
        this.message.set(e.error ?? 'Could not save');
        this.triggerShake();
      }
    });
  }
  delete(id: number) {
    this.http.delete(`/api/reviews/${id}`).subscribe({
      next: () => { this.message.set('Deleted'); this.editingReviewId.set(null); this.load(); },
      error: e => this.message.set(e.error ?? 'Could not delete')
    });
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
}
