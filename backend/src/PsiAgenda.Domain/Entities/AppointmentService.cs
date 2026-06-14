namespace PsiAgenda.Domain.Entities;

public sealed class AppointmentService
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AppointmentId { get; set; }
    public Guid ServiceId { get; set; }
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; }

    public Appointment? Appointment { get; set; }
    public Service? Service { get; set; }
}
