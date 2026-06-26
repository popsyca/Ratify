namespace Ratify.Api.Models;

public class BookView
{
    public int Id { get; set; }
    public int BookId { get; set; }
    public Book Book { get; set; } = null!;
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;
}
