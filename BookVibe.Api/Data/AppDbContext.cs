using BookVibe.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BookVibe.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<BookView> BookViews => Set<BookView>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<AppUser>().HasIndex(u => u.DisplayName).IsUnique();
        modelBuilder.Entity<Review>().HasIndex(r => new { r.BookId, r.UserId }).IsUnique();
    }
}
