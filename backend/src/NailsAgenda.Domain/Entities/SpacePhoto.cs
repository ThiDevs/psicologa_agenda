namespace NailsAgenda.Domain.Entities;

public sealed class SpacePhoto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SpaceId { get; set; }
    public required string Url { get; set; }
    public string? Caption { get; set; }
    public int SortOrder { get; set; }
    public bool Active { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public Space? Space { get; set; }
}
