namespace NailsAgenda.Domain.Entities;

public sealed class SpaceOpeningHour
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SpaceId { get; set; }
    public int DayOfWeek { get; set; }
    public bool IsOpen { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }

    public Space? Space { get; set; }
}
