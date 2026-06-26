namespace BookVibe.Api.Models;

public class Review
{
    public int Id { get; set; }
    public int BookId { get; set; }
    public Book Book { get; set; } = null!;
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public string VibeColor { get; set; } = "#94A3B8";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
