namespace NailsAgenda.Domain.Entities;

public sealed class ProfessionalSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProfessionalId { get; set; }
    public int DayOfWeek { get; set; }
    public required string StartTime { get; set; }
    public required string EndTime { get; set; }
    public string? BreakStartTime { get; set; }
    public string? BreakEndTime { get; set; }
    public bool Active { get; set; } = true;

    public Professional? Professional { get; set; }
}
