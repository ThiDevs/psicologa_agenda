using NailsAgenda.Domain.Enums;

namespace NailsAgenda.Domain.Entities;

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string? Phone { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; }
    public bool Active { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<SpaceUser> SpaceUsers { get; set; } = new List<SpaceUser>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}
