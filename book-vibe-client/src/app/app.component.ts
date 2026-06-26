import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './core/auth.service';
import { BookFilterService } from './core/book-filter.service';

@Component({
  selector: 'app-root', standalone: true, imports: [RouterOutlet, RouterLink, FormsModule], template: `
<header class="main-header">
  <div class="header-left">
    <a routerLink="/" class="brand" (click)="onBrandClick()">
      <span class="brand-mark">
        <svg class="brand-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      </span>
      <div class="brand-text">
        <span class="brand-name">RATIFY</span>
        <span class="brand-tagline">select the best for the book!</span>
      </div>
    </a>
    
    <div class="header-search-container">
      <span class="search-icon-wrapper">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </span>
      <input type="text"
             [ngModel]="filterService.query()"
             (ngModelChange)="onSearchChange($event)"
             placeholder="Search by title, author, description..."
             class="header-search-input">
    </div>

    @if (auth.token()) {
      <a routerLink="/add-book" class="nav-link add-book-btn">
        <span class="plus-icon">+</span> Add Book
      </a>
    }
  </div>
  <div class="header-right">
    <div class="lang-selector">
      <button class="lang-btn" (click)="toggleLangDropdown()">
        <span>🌐 {{ currentLang() }}</span>
      </button>
      @if (isLangDropdownOpen()) {
        <div class="lang-dropdown">
          <button (click)="changeLang('en')">🇬🇧 EN</button>
          <button (click)="changeLang('tr')">🇹🇷 TR</button>
        </div>
      }
    </div>

    @if (auth.token()) {
      <a routerLink="/profile" class="profile-card-link">
        <span class="profile-card-title">Profile</span>
        <span class="profile-card-username">{{ auth.displayName() }}</span>
      </a>
      <button class="logout-btn" (click)="auth.logout()">Logout</button>
    } @else {
      <a routerLink="/login" class="nav-link login-btn">Login</a>
      <a routerLink="/register" class="register-btn">Register</a>
    }
  </div>
</header>
<main><router-outlet /></main>
` })
export class AppComponent implements OnInit {
  currentLang = signal<'EN' | 'TR'>('EN');
  isLangDropdownOpen = signal(false);

  constructor(
    public auth: AuthService,
    public filterService: BookFilterService,
    private router: Router
  ) { }

  ngOnInit() {
    const match = document.cookie.match(/googtrans=\/en\/([a-z]{2})/i);
    if (match && match[1].toLowerCase() === 'tr') {
      this.currentLang.set('TR');
    } else {
      this.currentLang.set('EN');
    }
  }

  toggleLangDropdown() {
    this.isLangDropdownOpen.set(!this.isLangDropdownOpen());
  }

  changeLang(lang: 'en' | 'tr') {
    const expires = new Date();
    expires.setTime(expires.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    if (lang === 'tr') {
      document.cookie = `googtrans=/en/tr; path=/; expires=${expires.toUTCString()};`;
      document.cookie = `googtrans=/en/tr; path=/; domain=${window.location.hostname}; expires=${expires.toUTCString()};`;
    } else {
      document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
      document.cookie = `googtrans=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
    }
    
    this.isLangDropdownOpen.set(false);
    window.location.reload();
  }

  onSearchChange(val: string) {
    this.filterService.query.set(val);
    if (this.router.url !== '/' && this.router.url !== '/books') {
      this.router.navigate(['/']);
    }
  }

  onBrandClick() {
    this.filterService.reset();
  }
}
