namespace NailsAgenda.Domain.Entities;

public sealed class Professional
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SpaceId { get; set; }
    public required string Name { get; set; }
    public string? Email { get; set; }
    public required string Specialty { get; set; }
    public int ExperienceYears { get; set; }
    public bool Active { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public Space? Space { get; set; }
    public ICollection<ProfessionalService> ProfessionalServices { get; set; } = new List<ProfessionalService>();
    public ICollection<ProfessionalSchedule> Schedules { get; set; } = new List<ProfessionalSchedule>();
    public ICollection<BlockedTime> BlockedTimes { get; set; } = new List<BlockedTime>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
