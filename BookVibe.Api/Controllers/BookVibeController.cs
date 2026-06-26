using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BookVibe.Api.Data;
using BookVibe.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace BookVibe.Api.Controllers;

[ApiController]
public class BookVibeController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public BookVibeController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpPost("api/auth/register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant();
        var displayName = request.DisplayName?.Trim();
        var password = request.Password;

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(displayName) || string.IsNullOrEmpty(password))
            return BadRequest("All fields are required.");

        if (displayName.Contains(" "))
            return BadRequest("Username cannot contain spaces.");

        if (displayName.Length < 3 || displayName.Length > 15)
            return BadRequest("Username must be between 3 and 15 characters long.");

        if (await _db.Users.AnyAsync(u => u.DisplayName.ToLower() == displayName.ToLower()))
            return Conflict("Username already in use.");

        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict("Email already registered.");

        var user = new AppUser
        {
            DisplayName = displayName,
            Email = email,
            PasswordHash = HashPassword(password),
            ConfirmationCode = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new { user.Email, user.ConfirmationCode, Message = "Use this demo code to confirm the account." });
    }

    [HttpPost("api/auth/confirm")]
    public async Task<IActionResult> Confirm([FromBody] ConfirmRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant();
        var code = request.Code?.Trim().ToUpperInvariant();

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(code))
            return BadRequest("Email and code are required.");

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (user is null || user.ConfirmationCode != code)
            return BadRequest("Invalid confirmation code.");

        user.IsConfirmed = true;
        await _db.SaveChangesAsync();

        return Ok(new { Message = "Account confirmed." });
    }

    [HttpPost("api/auth/login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant();
        var password = request.Password;

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            return BadRequest("Email and password are required.");

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (user is null || !VerifyPassword(password, user.PasswordHash))
            return Unauthorized("Invalid email or password.");

        if (!user.IsConfirmed)
            return BadRequest("Please confirm your account before logging in.");

        var jwtKey = _config["Jwt:Key"] ?? "dev-only-super-secret-key-change-me";
        var token = CreateToken(user, jwtKey);

        return Ok(new { Token = token, DisplayName = user.DisplayName });
    }

    [HttpGet("api/books")]
    public async Task<IActionResult> GetBooks()
    {
        var oneWeekAgo = DateTime.UtcNow.AddDays(-7);

        var weeklyViews = await _db.BookViews
            .Where(v => v.ViewedAt >= oneWeekAgo)
            .GroupBy(v => v.BookId)
            .Select(g => new { BookId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.BookId, x => x.Count);

        var booksData = await _db.Books.Include(b => b.Reviews).Select(b => new
        {
            b.Id,
            b.Title,
            b.Author,
            b.Description,
            b.CoverUrl,
            b.Genre,
            AverageRating = b.OriginalRatingsCount + b.Reviews.Count == 0 
                ? 0 
                : Math.Round(((b.OriginalAverageRating * b.OriginalRatingsCount) + (b.Reviews.Count == 0 ? 0 : b.Reviews.Sum(r => r.Rating))) / (b.OriginalRatingsCount + b.Reviews.Count), 2),
            ReviewCount = b.OriginalRatingsCount + b.Reviews.Count,
            TopVibeColor = b.Reviews.GroupBy(r => r.VibeColor).OrderByDescending(g => g.Count()).Select(g => g.Key).FirstOrDefault() ?? "#94A3B8"
        }).ToListAsync();

        var response = booksData.Select(b => new
        {
            b.Id,
            b.Title,
            b.Author,
            b.Description,
            b.CoverUrl,
            b.Genre,
            b.AverageRating,
            b.ReviewCount,
            b.TopVibeColor,
            WeeklyViews = weeklyViews.TryGetValue(b.Id, out var count) ? count : 0
        }).ToList();

        return Ok(response);
    }

    [HttpPost("api/books")]
    [Authorize]
    public async Task<IActionResult> AddBook([FromBody] BookRequest request)
    {
        var title = request.Title?.Trim() ?? "";
        var author = request.Author?.Trim() ?? "";
        var description = request.Description?.Trim() ?? "";
        var coverUrl = string.IsNullOrWhiteSpace(request.CoverUrl)
            ? "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=500&q=80"
            : request.CoverUrl.Trim();

        var genre = request.Genre?.Trim() ?? "Novel";

        if (title.Length < 2 || author.Length < 2) return BadRequest("Title and author are required.");
        if (description.Length < 10) return BadRequest("Description must be at least 10 characters.");
        if (await _db.Books.AnyAsync(b => b.Title == title && b.Author == author)) return Conflict("This book already exists.");

        var book = new Book { Title = title, Author = author, Description = description, CoverUrl = coverUrl, Genre = genre };
        _db.Books.Add(book);
        await _db.SaveChangesAsync();

        return Created($"/api/books/{book.Id}", new { book.Id });
    }

    [HttpGet("api/books/{id:int}")]
    public async Task<IActionResult> GetBookDetail(int id)
    {
        var book = await _db.Books.Include(b => b.Reviews).ThenInclude(r => r.User).SingleOrDefaultAsync(b => b.Id == id);
        if (book is null) return NotFound();

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userId = int.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : 0;
        var topVibe = book.Reviews.GroupBy(r => r.VibeColor).OrderByDescending(g => g.Count()).Select(g => g.Key).FirstOrDefault() ?? "#94A3B8";

        var response = new
        {
            book.Id,
            book.Title,
            book.Author,
            book.Description,
            book.CoverUrl,
            book.Genre,
            AverageRating = book.OriginalRatingsCount + book.Reviews.Count == 0 
                ? 0 
                : Math.Round(((book.OriginalAverageRating * book.OriginalRatingsCount) + (book.Reviews.Count == 0 ? 0 : book.Reviews.Sum(r => r.Rating))) / (book.OriginalRatingsCount + book.Reviews.Count), 2),
            ReviewCount = book.OriginalRatingsCount + book.Reviews.Count,
            TopVibeColor = topVibe,
            VibeStats = book.Reviews.GroupBy(r => r.VibeColor).OrderByDescending(g => g.Count()).Select(g => new
            {
                Color = g.Key,
                Count = g.Count()
            }).ToList(),
            Reviews = book.Reviews.OrderByDescending(r => r.CreatedAt).Select(r => new
            {
                r.Id,
                UserName = r.User.DisplayName,
                r.Rating,
                r.Comment,
                r.VibeColor,
                r.CreatedAt,
                BookTitle = book.Title,
                BookId = book.Id,
                CanEdit = r.UserId == userId
            }).ToList()
        };

        return Ok(response);
    }

    [HttpPost("api/books/{id:int}/view")]
    public async Task<IActionResult> TrackView(int id)
    {
        if (!await _db.Books.AnyAsync(b => b.Id == id)) return NotFound();
        _db.BookViews.Add(new BookView { BookId = id });
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("api/books/{id:int}/reviews")]
    [Authorize]
    public async Task<IActionResult> AddReview(int id, [FromBody] ReviewRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (!await _db.Books.AnyAsync(b => b.Id == id)) return NotFound();
        if (request.Rating < 1 || request.Rating > 5) return BadRequest("Rating must be between 1 and 5.");
        
        var vibeColor = request.VibeColor?.Trim() ?? "";
        if (!System.Text.RegularExpressions.Regex.IsMatch(vibeColor, "^#[0-9A-Fa-f]{6}$")) return BadRequest("Vibe color must be a hex color.");

        var comment = request.Comment?.Trim() ?? "";

        var existing = await _db.Reviews.SingleOrDefaultAsync(r => r.BookId == id && r.UserId == userId);
        if (existing is null)
        {
            _db.Reviews.Add(new Review { BookId = id, UserId = userId, Rating = request.Rating, Comment = comment, VibeColor = vibeColor });
        }
        else
        {
            existing.Rating = request.Rating;
            existing.Comment = comment;
            existing.VibeColor = vibeColor;
            existing.CreatedAt = DateTimeOffset.UtcNow;
        }
        await _db.SaveChangesAsync();

        return Created($"/api/books/{id}", null);
    }

    [HttpDelete("api/reviews/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteReview(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var review = await _db.Reviews.SingleOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (review is null) return NotFound();

        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("api/me")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _db.Users.Include(u => u.Reviews).ThenInclude(r => r.Book).SingleOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound();

        var response = new
        {
            user.DisplayName,
            user.Email,
            ReviewCount = user.Reviews.Count,
            AverageRating = user.Reviews.Count == 0 ? 0 : Math.Round(user.Reviews.Average(r => r.Rating), 1),
            Reviews = user.Reviews.OrderByDescending(r => r.CreatedAt).Select(r => new
            {
                r.Id,
                UserName = user.DisplayName,
                r.Rating,
                r.Comment,
                r.VibeColor,
                r.CreatedAt,
                BookTitle = r.Book.Title,
                BookId = r.BookId,
                CanEdit = true
            }).ToList()
        };

        return Ok(response);
    }

    // --- Private Helper Methods (Auth Spaghetti style) ---
    private string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return Convert.ToBase64String(salt) + "." + Convert.ToBase64String(hash);
    }

    private bool VerifyPassword(string password, string stored)
    {
        var parts = stored.Split('.');
        if (parts.Length != 2) return false;
        var salt = Convert.FromBase64String(parts[0]);
        var expected = Convert.FromBase64String(parts[1]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }

    private string CreateToken(AppUser user, string key)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Email, user.Email)
        };
        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken("BookVibe", "BookVibeClient", claims, expires: DateTime.UtcNow.AddHours(8), signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

// Simple Request objects in the same file to keep it self-contained
public class RegisterRequest { public string? DisplayName { get; set; } public string? Email { get; set; } public string? Password { get; set; } }
public class ConfirmRequest { public string? Email { get; set; } public string? Code { get; set; } }
public class LoginRequest { public string? Email { get; set; } public string? Password { get; set; } }
public class BookRequest { public string? Title { get; set; } public string? Author { get; set; } public string? Description { get; set; } public string? CoverUrl { get; set; } public string? Genre { get; set; } }
public class ReviewRequest { public int Rating { get; set; } public string? Comment { get; set; } public string? VibeColor { get; set; } }
