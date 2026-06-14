namespace PsiAgenda.Domain.Entities;

public sealed class Service
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SpaceId { get; set; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    public required string Category { get; set; }
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; }
    public int BufferAfterMinutes { get; set; } = 10;
    public bool Active { get; set; } = true;
    public bool OnlineBooking { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    public Space? Space { get; set; }
    public ICollection<ProfessionalService> ProfessionalServices { get; set; } = new List<ProfessionalService>();
    public ICollection<AppointmentService> AppointmentServices { get; set; } = new List<AppointmentService>();
}
