namespace NailsAgenda.Domain.Entities;

public sealed class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public Guid? SpaceId { get; set; }
    public Guid? AppointmentId { get; set; }
    public required string Title { get; set; }
    public required string Message { get; set; }
    public bool Read { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? User { get; set; }
    public Space? Space { get; set; }
    public Appointment? Appointment { get; set; }
}
