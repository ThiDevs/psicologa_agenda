namespace NailsAgenda.Domain.Entities;

public sealed class BlockedTime
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SpaceId { get; set; }
    public Guid? ProfessionalId { get; set; }
    public required string Date { get; set; }
    public required string StartTime { get; set; }
    public required string EndTime { get; set; }
    public required string Reason { get; set; }
    public bool Active { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public Space? Space { get; set; }
    public Professional? Professional { get; set; }
}
