namespace NailsAgenda.Domain.Entities;

public sealed class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AppointmentId { get; set; }
    public Guid SpaceId { get; set; }
    public Guid CustomerId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Appointment? Appointment { get; set; }
    public Space? Space { get; set; }
    public User? Customer { get; set; }
}
