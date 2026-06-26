import { Component, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({ standalone: true, imports: [FormsModule], template: `
<section class="auth-panel wide-panel">
  <p class="eyebrow">Library builder</p>
  <h1>Add a book</h1>
  <label>Title <input [(ngModel)]="title" placeholder="Book title"></label>
  <label>Author <input [(ngModel)]="author" placeholder="Author name"></label>
  <label>Cover image URL <input [(ngModel)]="coverUrl" placeholder="https://..."></label>
  <label>Genre <input [(ngModel)]="genre" placeholder="e.g. Fantasy, Mystery"></label>
  <label>Description <textarea [(ngModel)]="description" placeholder="What kind of vibe does this book bring?"></textarea></label>
  <button (click)="save()">Add book</button>
  <p class="form-message" [class.shake-animation]="shake()">{{ message() }}</p>
</section>` })
export class AddBookComponent {
  title = '';
  author = '';
  description = '';
  coverUrl = '';
  genre = '';
  message = signal('');
  shake = signal(false);

  constructor(private http: HttpClient, private router: Router) {}

  triggerShake() {
    this.shake.set(true);
    setTimeout(() => this.shake.set(false), 400);
  }

  save() {
    if (!this.title.trim() || !this.author.trim()) {
      this.message.set('Title and author are required.');
      this.triggerShake();
      return;
    }
    if (this.description.trim().length < 10) {
      this.message.set('Description must be at least 10 characters.');
      this.triggerShake();
      return;
    }

    this.http.post<{ id: number }>('/api/books', {
      title: this.title.trim(),
      author: this.author.trim(),
      description: this.description.trim(),
      coverUrl: this.coverUrl.trim(),
      genre: this.genre.trim()
    }).subscribe({
      next: res => this.router.navigateByUrl(`/books/${res.id}`),
      error: e => {
        this.message.set(e.error ?? 'Could not add book');
        this.triggerShake();
      }
    });
  }
}
