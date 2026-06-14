using PsiAgenda.Domain.Enums;

namespace PsiAgenda.Domain.Entities;

public sealed class Appointment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Code { get; set; }
    public Guid CustomerId { get; set; }
    public Guid SpaceId { get; set; }
    public Guid ProfessionalId { get; set; }
    public bool AnyProfessional { get; set; }
    public DateTimeOffset StartDateTime { get; set; }
    public DateTimeOffset EndDateTime { get; set; }
    public int TotalDurationMinutes { get; set; }
    public decimal Subtotal { get; set; }
    public decimal ServiceFee { get; set; }
    public decimal Total { get; set; }
    public AppointmentStatus Status { get; set; }
    public required string PaymentMethodId { get; set; }
    public PaymentStatus PaymentStatus { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }

    public User? Customer { get; set; }
    public Space? Space { get; set; }
    public Professional? Professional { get; set; }
    public ICollection<AppointmentService> AppointmentServices { get; set; } = new List<AppointmentService>();
    public Review? Review { get; set; }
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
