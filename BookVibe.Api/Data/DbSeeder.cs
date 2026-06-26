using System.Text;
using System.Net.Http;
using BookVibe.Api.Models;

namespace BookVibe.Api.Data;

public static class DbSeeder
{
    public static void Seed(AppDbContext db, string contentRootPath)
    {
        var csvPath = Path.Combine(contentRootPath, "..", "best-selling-books.csv");
        if (!File.Exists(csvPath))
        {
            return;
        }

        var existingTitles = db.Books.Select(b => b.Title).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var booksToSeed = new List<Book>();

        try
        {
            using var reader = new StreamReader(csvPath, Encoding.UTF8);
            var headerLine = reader.ReadLine();
            if (headerLine == null) return;

            while (reader.ReadLine() is string line)
            {
                var fields = ParseCsvLine(line);
                if (fields.Count < 6) continue;

                var title = fields[0].Trim();
                var authors = fields[1].Trim();
                var origLanguage = fields[2].Trim();
                var pubYear = fields[3].Trim();
                var salesRaw = fields[4].Trim();
                var genre = string.IsNullOrWhiteSpace(fields[5]) ? "Fiction" : fields[5].Trim();

                title = UnescapeCsvValue(title);
                authors = UnescapeCsvValue(authors);
                origLanguage = UnescapeCsvValue(origLanguage);
                pubYear = UnescapeCsvValue(pubYear);
                salesRaw = UnescapeCsvValue(salesRaw);
                genre = UnescapeCsvValue(genre);

                if (string.IsNullOrWhiteSpace(title) || existingTitles.Contains(title))
                {
                    continue;
                }

                var description = $"A book by {authors}, originally published in {pubYear} in {origLanguage}. Approximate sales: {salesRaw} million copies.";
                var coverUrl = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80";

                double.TryParse(salesRaw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var salesVal);
                var avgRating = Math.Min(4.9, 4.0 + (salesVal / 250.0));
                var ratingsCount = (int)(salesVal * 10000);

                var newBook = new Book
                {
                    Title = title,
                    Author = authors,
                    Description = description,
                    CoverUrl = coverUrl,
                    Genre = genre,
                    OriginalAverageRating = Math.Round(avgRating, 2),
                    OriginalRatingsCount = ratingsCount
                };

                booksToSeed.Add(newBook);
                existingTitles.Add(title);
            }

            if (booksToSeed.Count > 0)
            {
                db.Books.AddRange(booksToSeed);
                db.SaveChanges();
            }

            // Seed demo reviews if none exist yet
            if (!db.Reviews.Any())
            {
                SeedDemoReviews(db);
            }

            // Seed demo book views if none exist yet
            if (!db.BookViews.Any())
            {
                SeedDemoBookViews(db);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error seeding data from CSV: {ex.Message}");
        }
    }

    private static string UnescapeCsvValue(string val)
    {
        if (string.IsNullOrEmpty(val)) return val;
        val = val.Trim();
        if (val.StartsWith("\"") && val.EndsWith("\"") && val.Length >= 2)
        {
            val = val.Substring(1, val.Length - 2);
        }
        return val.Replace("\"\"", "\"");
    }

    private static List<string> ParseCsvLine(string line)
    {
        var fields = new List<string>();
        var inQuotes = false;
        var field = new StringBuilder();
        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    field.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                fields.Add(field.ToString());
                field.Clear();
            }
            else
            {
                field.Append(c);
            }
        }
        fields.Add(field.ToString());
        return fields;
    }

    private static void SeedDemoReviews(AppDbContext db)
    {
        var rng = new Random(42); // fixed seed for reproducibility

        // Create demo users
        var demoUsers = new List<AppUser>();
        var demoNames = new[] { "bookworm", "pagelover", "nightowl", "coffeereader", "bibliophile",
            "storyseeker", "wordsmith", "novelnut", "chaptertwo", "inkdreamer",
            "readaholic", "shelflife", "plottwist", "marginotes", "booknerd" };

        foreach (var name in demoNames)
        {
            if (!db.Users.Any(u => u.DisplayName == name))
            {
                var user = new AppUser
                {
                    DisplayName = name,
                    Email = $"{name}@demo.local",
                    PasswordHash = "DEMO_NO_LOGIN",
                    IsConfirmed = true,
                    ConfirmationCode = "DEMO"
                };
                db.Users.Add(user);
                demoUsers.Add(user);
            }
        }
        db.SaveChanges();

        // Reload users from DB to get IDs
        var allDemoUsers = db.Users.Where(u => u.Email.EndsWith("@demo.local")).ToList();
        if (allDemoUsers.Count == 0) return;

        var vibeColors = new[] { "#EF4444", "#F97316", "#FACC15", "#22C55E", "#3B82F6", "#EC4899", "#64748B" };

        // Assign a dominant vibe to each book (cycling through colors)
        var books = db.Books.Take(20).ToList();

        var comments = new[]
        {
            "Harika bir kitap, herkese tavsiye ederim!",
            "Çok etkileyici bir hikaye.",
            "Beklentilerimin üzerindeydi.",
            "Biraz sıkıcı buldum ama güzel.",
            "Muhteşem karakter gelişimi.",
            "Sonu çok duygusaldı.",
            "Bir solukta okudum!",
            "İlk yarısı yavaş ama sonra hızlanıyor.",
            "Bu tarz seven herkes okumalı.",
            "Güzel ama fazla uzun.",
            "Çok düşündürücü.",
            "Yazarın en iyi eseri bence.",
            "Romantik sahneler çok güzeldi.",
            "Gerilim dolu bir macera!",
            "Klasikler arasında hak ettiği yeri buluyor."
        };

        for (int i = 0; i < books.Count; i++)
        {
            var book = books[i];
            var dominantColor = vibeColors[i % vibeColors.Length];
            var reviewCount = rng.Next(10, 16); // 10-15 reviews

            // Shuffle users and pick reviewCount of them
            var shuffledUsers = allDemoUsers.OrderBy(_ => rng.Next()).Take(reviewCount).ToList();

            for (int j = 0; j < shuffledUsers.Count; j++)
            {
                // ~65% of reviews get the dominant color
                string color;
                if (rng.NextDouble() < 0.65)
                {
                    color = dominantColor;
                }
                else
                {
                    color = vibeColors[rng.Next(vibeColors.Length)];
                }

                var review = new Review
                {
                    BookId = book.Id,
                    UserId = shuffledUsers[j].Id,
                    Rating = rng.Next(2, 6), // 2-5 rating
                    Comment = comments[rng.Next(comments.Length)],
                    VibeColor = color,
                    CreatedAt = DateTimeOffset.UtcNow.AddDays(-rng.Next(1, 90))
                };
                db.Reviews.Add(review);
            }
        }

        db.SaveChanges();
        Console.WriteLine($"Seeded demo reviews for {books.Count} books.");
     }

    private static void SeedDemoBookViews(AppDbContext db)
    {
        var rng = new Random(42);
        var books = db.Books.ToList();
        if (books.Count == 0) return;

        for (int i = 0; i < books.Count; i++)
        {
            var book = books[i];
            // Assign different popularity levels: some books get more views
            var viewCount = rng.Next(5, 100);
            for (int v = 0; v < viewCount; v++)
            {
                // views distributed in the last 7 days
                var viewedAt = DateTime.UtcNow.AddMinutes(-rng.Next(0, 7 * 24 * 60));
                db.BookViews.Add(new BookView
                {
                    BookId = book.Id,
                    ViewedAt = viewedAt
                });
            }
        }
        db.SaveChanges();
        Console.WriteLine("Seeded initial book views.");
    }
}
