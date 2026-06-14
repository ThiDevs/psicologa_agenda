using NailsAgenda.Domain.Enums;

namespace NailsAgenda.Domain.Entities;

public sealed class SpaceUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SpaceId { get; set; }
    public Guid UserId { get; set; }
    public SpaceUserRole Role { get; set; }
    public bool Active { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Space? Space { get; set; }
    public User? User { get; set; }
}
