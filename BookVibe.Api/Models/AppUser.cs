namespace BookVibe.Api.Models;

public class AppUser
{
    public int Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsConfirmed { get; set; }
    public string ConfirmationCode { get; set; } = string.Empty;
    public List<Review> Reviews { get; set; } = [];
}
