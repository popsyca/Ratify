import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({ standalone: true, imports: [FormsModule], template: `
<form class="auth-panel" (ngSubmit)="code() ? confirm() : register()">
  <h1>Create account</h1>
  @if (!code()) {
    <input [(ngModel)]="displayName" name="displayName" placeholder="Username (3-15 chars, no spaces)" minlength="3" maxlength="15" (keydown.space)="$event.preventDefault()" required>
    <input [(ngModel)]="email" name="email" placeholder="Email" type="email" required>
    <input [(ngModel)]="password" name="password" placeholder="Password" type="password" required>
    <button type="submit">Register</button>
  }
  @if (code()) {
    <p class="notice">Demo confirmation code: <strong>{{ code() }}</strong></p>
    <input [(ngModel)]="confirmCode" name="confirmCode" placeholder="Confirmation code" required>
    <button type="submit">Confirm account</button>
  }
  <p class="form-message">{{ message() }}</p>
</form>` })
export class RegisterComponent {
  displayName = ''; email = ''; password = ''; confirmCode = ''; code = signal(''); message = signal('');
  constructor(private auth: AuthService, private router: Router) {}
  register() {
    this.auth.register({ displayName: this.displayName, email: this.email, password: this.password }).subscribe({
      next: r => { this.code.set(r.confirmationCode); this.confirmCode = r.confirmationCode; },
      error: e => {
        const msg = typeof e.error === 'string' ? e.error : (e.error?.message || e.error?.title || 'Registration failed');
        this.message.set(msg);
      }
    });
  }
  confirm() {
    this.auth.confirm({ email: this.email, code: this.confirmCode }).subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: e => {
        const msg = typeof e.error === 'string' ? e.error : (e.error?.message || e.error?.title || 'Confirmation failed');
        this.message.set(msg);
      }
    });
  }
}
