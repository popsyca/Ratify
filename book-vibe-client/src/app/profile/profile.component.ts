import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { Profile } from '../books/book.models';
import { AuthService } from '../core/auth.service';

@Component({ standalone: true, imports: [RouterLink], template: `
@if (profile(); as p) {
<section class="profile-hero">
  <div>
    <p class="eyebrow">Reader profile</p>
    <h1>{{ p.displayName }}</h1>
    <p>{{ p.email }}</p>
  </div>
  <div class="stats">
    <strong>{{ p.reviewCount }}</strong><span>reviews</span>
    <strong>{{ p.averageRating || 'New' }}</strong><span>avg rating</span>
  </div>
</section>
<section class="reviews">
  <h2>My reviews</h2>
  @for (review of p.reviews; track review.id) {
    <article [style.borderLeftColor]="review.vibeColor">
      <strong><a [routerLink]="['/books', review.bookId]">{{ review.bookTitle }}</a> - {{ review.rating }}/5</strong>
      <p>{{ review.comment }}</p>
    </article>
  }
  @empty { <p class="empty-state">No reviews yet. Go give a book its color.</p> }
</section>
}` })
export class ProfileComponent implements OnInit {
  profile = signal<Profile | null>(null);
  constructor(private http: HttpClient, private router: Router, private auth: AuthService) {}
  ngOnInit() {
    this.http.get<Profile>('/api/me').subscribe({
      next: profile => this.profile.set(profile),
      error: () => {
        this.auth.logout();
        this.router.navigate(['/login']);
      }
    });
  }
}
