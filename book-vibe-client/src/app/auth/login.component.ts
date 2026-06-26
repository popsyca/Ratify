import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({ standalone: true, imports: [FormsModule], template: `
<form class="auth-panel" (ngSubmit)="login()">
  <h1>Login</h1>
  <input [(ngModel)]="email" name="email" placeholder="Email">
  <input [(ngModel)]="password" name="password" placeholder="Password" type="password">
  <button type="submit">Login</button>
  <p class="form-message" [class.shake-animation]="shake()">{{ message() }}</p>
</form>` })
export class LoginComponent {
  email = ''; password = ''; message = signal(''); shake = signal(false);
  constructor(private auth: AuthService, private router: Router) {}
  login() {
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: e => {
        const msg = typeof e.error === 'string' ? e.error : (e.error?.message || e.error?.title || 'Login failed');
        this.message.set(msg);
        this.shake.set(false);
        setTimeout(() => this.shake.set(true), 10);
      }
    });
  }
}
