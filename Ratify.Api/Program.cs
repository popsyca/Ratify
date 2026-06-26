using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Ratify.Api.Data;
using Ratify.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var jwtKey = builder.Configuration["Jwt:Key"] ?? "dev-only-super-secret-key-change-me";

var connectionString = builder.Configuration.GetConnectionString("Default");
if (string.IsNullOrWhiteSpace(connectionString))
{
    connectionString = "Data Source=Ratify.db";
}
else
{
    connectionString = connectionString.Trim('\"').Trim('\'').Trim();
}

// Diagnostic logging for connection string (mask password)
string maskedCS = "null";
if (!string.IsNullOrEmpty(connectionString))
{
    maskedCS = connectionString;
    maskedCS = System.Text.RegularExpressions.Regex.Replace(maskedCS, @"(?<=password=)[^;]+", "***", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    maskedCS = System.Text.RegularExpressions.Regex.Replace(maskedCS, @":[^@]+@", ":***@", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
}
Console.WriteLine($"[INFO] DB Connection String: '{maskedCS}'");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    bool isPostgres = connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
                      connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) ||
                      connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase) ||
                      connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase) ||
                      connectionString.Contains("Database=", StringComparison.OrdinalIgnoreCase);

    if (isPostgres)
    {
        string npgsqlConnectionString = connectionString;
        if (connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) || 
            connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var uri = new Uri(connectionString);
                var userInfo = uri.UserInfo.Split(':');
                var username = userInfo[0];
                var password = userInfo.Length > 1 ? userInfo[1] : "";
                var host = uri.Host;
                var port = uri.Port != -1 ? uri.Port : 5432;
                var database = uri.AbsolutePath.TrimStart('/');
                
                var sslMode = "Require"; 
                var trustServerCert = "true";
                
                npgsqlConnectionString = $"Host={host};Port={port};Username={username};Password={password};Database={database};SSL Mode={sslMode};Trust Server Certificate={trustServerCert};";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error parsing PostgreSQL URI: {ex.Message}. Falling back to raw string.");
            }
        }
        options.UseNpgsql(npgsqlConnectionString);
    }
    else
    {
        options.UseSqlite(connectionString);
    }
});
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options => options.AddPolicy("Angular", policy => policy.WithOrigins("http://localhost:4200").AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = "Ratify",
        ValidAudience = "RatifyClient",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});
builder.Services.AddAuthorization();

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    DbSeeder.Seed(db, app.Environment.ContentRootPath);
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("Angular");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
