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

var connectionString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=Ratify.db";
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (connectionString.Contains("Host=") || connectionString.Contains("Server=") || connectionString.Contains("postgres://") || connectionString.Contains("postgresql://"))
    {
        options.UseNpgsql(connectionString);
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
