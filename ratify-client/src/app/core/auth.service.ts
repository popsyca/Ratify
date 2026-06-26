import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  token = signal(localStorage.getItem('token'));
  displayName = signal(localStorage.getItem('displayName'));
  constructor(private http: HttpClient, private router: Router) {
    window.addEventListener('storage', (event) => {
      if (event.key === 'token' || event.key === 'displayName' || event.key === null) {
        const storedToken = localStorage.getItem('token');
        const storedDisplayName = localStorage.getItem('displayName');
        if (this.token() !== storedToken || this.displayName() !== storedDisplayName) {
          this.token.set(storedToken);
          this.displayName.set(storedDisplayName);
          window.location.reload();
        }
      }
    });
  }
  register(body: { displayName: string; email: string; password: string }) { return this.http.post<{ confirmationCode: string; message: string }>('/api/auth/register', body); }
  confirm(body: { email: string; code: string }) { return this.http.post('/api/auth/confirm', body); }
  login(body: { email: string; password: string }) {
    return this.http.post<{ token: string; displayName: string }>('/api/auth/login', body).pipe(tap(res => {
      localStorage.setItem('token', res.token); localStorage.setItem('displayName', res.displayName); this.token.set(res.token); this.displayName.set(res.displayName);
    }));
  }
  isTokenExpired(token: string | null): boolean {
    if (!token) return false;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      const payload = JSON.parse(atob(padded));
      if (!payload.exp) return false;
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
  logout(isTimeout = false) {
    const expired = isTimeout || this.isTokenExpired(this.token());
    localStorage.clear();
    this.token.set(null);
    this.displayName.set(null);
    if (expired) {
      alert('Oturum zaman aşımına uğradığı için çıkış yapıldı.');
    }
    this.router.navigateByUrl('/login');
  }
}

